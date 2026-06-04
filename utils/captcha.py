from typing import Any

import requests
from flask import current_app as app

from models import User
from services.login_record import LoginRecordService
from services.user import UserService


def _captcha_config() -> dict[str, Any]:
    cfg = app.config.get('CAPTCHA')
    return cfg if isinstance(cfg, dict) else {}


def is_captcha_enabled() -> bool:
    cfg = _captcha_config()
    return bool(cfg.get('enabled', False))


def _service_url() -> str | None:
    url = _captcha_config().get('service_url')
    return str(url).rstrip('/') if url else None


def _secret() -> str | None:
    secret = _captcha_config().get('secret')
    return str(secret) if secret else None


def resolve_user_by_name_or_email(name_or_email: str | None) -> User | None:
    if not name_or_email:
        return None
    if '@' in name_or_email:
        return User.query.filter_by(email=name_or_email).first()
    return User.query.filter_by(name=name_or_email).first()


def captcha_required_for_login(user: User | None, ip: str) -> bool:
    if not is_captcha_enabled():
        return False

    time_span = UserService.login_recent_failures_time_span
    if user is not None:
        if LoginRecordService.count_recent_failures_for_user(user, time_span) >= 1:
            return True
    if ip and LoginRecordService.count_recent_failures_for_ip(ip, time_span) >= 1:
        return True
    return False


def _call_captcha_service(path: str, challenge_id: str, answer: str, client_ip: str) -> bool:
    base_url = _service_url()
    secret = _secret()
    if not base_url or not secret:
        return False

    try:
        resp = requests.post(
            f'{base_url}{path}',
            json={
                'challenge_id': challenge_id,
                'answer': answer,
                'client_ip': client_ip,
            },
            headers={'X-Captcha-Secret': secret},
            timeout=5,
        )
        if resp.status_code != 200:
            return False
        data = resp.json()
        return bool(data.get('valid'))
    except requests.RequestException:
        return False


def peek_captcha(challenge_id: str | None, answer: str | None, client_ip: str) -> bool:
    if not challenge_id or not answer:
        return False
    return _call_captcha_service('/internal/v1/peek', challenge_id, answer, client_ip)


def verify_captcha(challenge_id: str | None, answer: str | None, client_ip: str) -> bool:
    if not challenge_id or not answer:
        return False
    return _call_captcha_service('/internal/v1/verify', challenge_id, answer, client_ip)
