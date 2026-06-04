import hashlib
import hmac
import os
import time
import uuid

import redis

STATUS_PENDING = 'PENDING'
STATUS_READY = 'READY'

CHALLENGE_PREFIX = 'captcha:challenge:'
RATE_PREFIX = 'captcha:rate:'


def _redis_client() -> redis.Redis:
    url = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
    return redis.Redis.from_url(url, decode_responses=True)


def challenge_key(challenge_id: str) -> str:
    return f'{CHALLENGE_PREFIX}{challenge_id}'


def ttl_seconds() -> int:
    return int(os.environ.get('CAPTCHA_TTL_SECONDS', '120'))


def rate_limit_per_minute() -> int:
    return int(os.environ.get('CAPTCHA_ISSUE_RATE_PER_MIN', '10'))


def hash_answer(answer: str) -> str:
    normalized = ''.join(c for c in answer.strip() if c.isdigit())
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def create_pending_challenge(client_ip: str | None) -> str:
    r = _redis_client()
    challenge_id = str(uuid.uuid4())
    key = challenge_key(challenge_id)
    mapping: dict[str, str] = {
        'status': STATUS_PENDING,
        'created_at': str(int(time.time())),
    }
    if client_ip:
        mapping['ip'] = client_ip
    r.hset(key, mapping=mapping)
    r.expire(key, ttl_seconds())
    return challenge_id


def activate_challenge(challenge_id: str, answer: str, client_ip: str | None) -> bool:
    r = _redis_client()
    key = challenge_key(challenge_id)
    if not r.exists(key):
        return False
    status = r.hget(key, 'status')
    if status != STATUS_PENDING:
        return False
    mapping: dict[str, str] = {
        'status': STATUS_READY,
        'answer_hash': hash_answer(answer),
    }
    if client_ip:
        mapping['ip'] = client_ip
    r.hset(key, mapping=mapping)
    r.expire(key, ttl_seconds())
    return True


def get_challenge(challenge_id: str) -> dict[str, str] | None:
    r = _redis_client()
    data = r.hgetall(challenge_key(challenge_id))
    return data if data else None


def delete_challenge(challenge_id: str) -> None:
    r = _redis_client()
    r.delete(challenge_key(challenge_id))


def _check_answer(data: dict[str, str], answer: str, client_ip: str | None) -> tuple[bool, str | None]:
    if not data:
        return False, 'expired_or_invalid'

    if data.get('status') != STATUS_READY:
        return False, 'not_ready'

    stored_ip = data.get('ip')
    if stored_ip and client_ip and stored_ip != client_ip:
        return False, 'ip_mismatch'

    submitted_hash = hash_answer(answer)
    stored_hash = data.get('answer_hash')
    if not stored_hash or not hmac.compare_digest(submitted_hash, stored_hash):
        return False, 'wrong_answer'

    return True, None


def peek_verify(challenge_id: str, answer: str, client_ip: str | None) -> tuple[bool, str | None]:
    r = _redis_client()
    data = r.hgetall(challenge_key(challenge_id))
    return _check_answer(data, answer, client_ip)


def verify_and_consume(challenge_id: str, answer: str, client_ip: str | None) -> tuple[bool, str | None]:
    r = _redis_client()
    key = challenge_key(challenge_id)
    data = r.hgetall(key)
    r.delete(key)
    return _check_answer(data, answer, client_ip)


def check_issue_rate_limit(client_ip: str) -> bool:
    """Return True if allowed, False if rate limited."""
    r = _redis_client()
    bucket = f'{RATE_PREFIX}{client_ip or "unknown"}'
    count = r.incr(bucket)
    if count == 1:
        r.expire(bucket, 60)
    return count <= rate_limit_per_minute()


def parse_uuid(challenge_id: str) -> bool:
    try:
        uuid.UUID(challenge_id, version=4)
        return True
    except (ValueError, AttributeError):
        return False
