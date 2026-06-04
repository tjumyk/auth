import os

from flask import Flask, jsonify, request, send_file
from io import BytesIO

from generator import generate_digits, render_captcha_png
from schemas import ChallengeCreated, ErrorResponse, VerifyRequest, VerifyResponse
from store import (
    activate_challenge,
    check_issue_rate_limit,
    create_pending_challenge,
    parse_uuid,
    peek_verify,
    verify_and_consume,
)

app = Flask(__name__)


def _client_ip() -> str | None:
    return (
        request.headers.get('X-Real-IP')
        or request.headers.get('X-Forwarded-For', '').split(',')[0].strip()
        or request.remote_addr
    )


def _captcha_secret() -> str:
    return os.environ.get('CAPTCHA_SECRET', 'change_me')


@app.route('/api/meta/health')
def health() -> tuple:
    return jsonify(status='ok'), 200


@app.route('/api/v1/challenges', methods=['POST'])
def create_challenge() -> tuple:
    ip = _client_ip()
    if not check_issue_rate_limit(ip or 'unknown'):
        err = ErrorResponse(msg='rate limited', detail='Too many captcha requests')
        return jsonify(err.model_dump()), 429

    challenge_id = create_pending_challenge(ip)
    body = ChallengeCreated(challenge_id=challenge_id)
    return jsonify(body.model_dump()), 201


@app.route('/api/v1/challenges/<challenge_id>/image')
def challenge_image(challenge_id: str) -> tuple:
    if not parse_uuid(challenge_id):
        err = ErrorResponse(msg='invalid challenge', detail='Invalid challenge id')
        return jsonify(err.model_dump()), 400

    answer = generate_digits()
    ip = _client_ip()
    if not activate_challenge(challenge_id, answer, ip):
        err = ErrorResponse(msg='invalid challenge', detail='Challenge expired or already used')
        return jsonify(err.model_dump()), 400

    png = render_captcha_png(answer)
    return send_file(
        BytesIO(png),
        mimetype='image/png',
        as_attachment=False,
        download_name='captcha.png',
    )


@app.route('/internal/v1/peek', methods=['POST'])
def peek_challenge() -> tuple:
    if request.headers.get('X-Captcha-Secret') != _captcha_secret():
        return jsonify(msg='unauthorized'), 401

    if not request.is_json:
        return jsonify(msg='json required'), 400

    try:
        payload = VerifyRequest.model_validate(request.json)
    except Exception:
        return jsonify(msg='invalid payload'), 400

    if not parse_uuid(payload.challenge_id):
        body = VerifyResponse(valid=False, reason='invalid_id')
        return jsonify(body.model_dump()), 200

    valid, reason = peek_verify(
        payload.challenge_id,
        payload.answer,
        payload.client_ip,
    )
    body = VerifyResponse(valid=valid, reason=reason)
    return jsonify(body.model_dump()), 200


@app.route('/internal/v1/verify', methods=['POST'])
def verify_challenge() -> tuple:
    if request.headers.get('X-Captcha-Secret') != _captcha_secret():
        return jsonify(msg='unauthorized'), 401

    if not request.is_json:
        return jsonify(msg='json required'), 400

    try:
        payload = VerifyRequest.model_validate(request.json)
    except Exception:
        return jsonify(msg='invalid payload'), 400

    if not parse_uuid(payload.challenge_id):
        body = VerifyResponse(valid=False, reason='invalid_id')
        return jsonify(body.model_dump()), 200

    valid, reason = verify_and_consume(
        payload.challenge_id,
        payload.answer,
        payload.client_ip,
    )
    body = VerifyResponse(valid=valid, reason=reason)
    return jsonify(body.model_dump()), 200


if __name__ == '__main__':
    port = int(os.environ.get('CAPTCHA_PORT', '8090'))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG') == '1')
