from flask import request


def get_client_ip(*, behind_proxy: bool) -> str:
    """Resolve the client IP for logging, login records, and rate limits.

    When behind_proxy is true, trust X-Real-IP first, then the first hop in
    X-Forwarded-For (common when an external reverse proxy sits in front of the
    compose frontend nginx). Otherwise use the direct TCP peer address.
    """
    if behind_proxy:
        x_real = request.environ.get('HTTP_X_REAL_IP')
        if x_real and x_real.strip():
            return x_real.strip()
        xff = request.environ.get('HTTP_X_FORWARDED_FOR')
        if xff and xff.strip():
            return xff.split(',')[0].strip()
    return request.remote_addr or ''
