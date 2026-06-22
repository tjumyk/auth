import time
from functools import wraps

from flask import session, jsonify, g, request, current_app as app

from error import BasicError
from services.oauth import OAuthService, OAuthServiceError
from services.password_expiry import (
    PasswordExpiryError,
    build_password_expiry_fields,
    get_password_expiry_status,
    maybe_send_password_expiry_warning_email,
    revoke_expired_session,
)
from services.user import UserService, UserServiceError
from utils.url import url_append_param

_session_key_user_id = 'user_id'
_g_key_user = 'user'
_g_key_oauth_authorization = 'oauth_authorization'
_admin_group_name = 'admin'

_session_key_two_factor_user_id = 'two_factor_user_id'
_session_key_two_factor_window = 'two_factor_window'
_g_key_two_factor_user = 'two_factor_user'
_two_factor_window_span = 300  # seconds


def set_current_user(user, remember):
    session[_session_key_user_id] = user.id
    if remember:
        session.permanent = True


def clear_current_user():
    if _g_key_user in g:
        g.pop(_g_key_user)
    if _session_key_user_id in session:
        del session[_session_key_user_id]


def get_current_uid():
    return session.get(_session_key_user_id)


def _password_expiry_login_url() -> str:
    site = app.config['SITE']
    site_url = site['root_url'] + site['base_url']
    if not site_url.endswith('/'):
        site_url += '/'
    return site_url + 'account/login'


def _password_expiry_intercept_url() -> str:
    site = app.config['SITE']
    site_url = site['root_url'] + site['base_url']
    if not site_url.endswith('/'):
        site_url += '/'
    return site_url + 'account/password-expiry'


def _handle_expired_session_user(user) -> None:
    revoke_expired_session(user)
    clear_current_user()


def _raise_expired_password_error() -> None:
    raise PasswordExpiryError(
        'password expired',
        code='password_expired',
        detail='Your password has expired. Please reset your password to continue.',
    )


def _enforce_session_password_expiry(user, *, raise_on_expired: bool = False):
    if user is None:
        return None
    if get_password_expiry_status(user) != 'expired':
        maybe_send_password_expiry_warning_email(user)
        db_commit_if_needed()
        return user
    _handle_expired_session_user(user)
    if raise_on_expired:
        _raise_expired_password_error()
    return None


def db_commit_if_needed() -> None:
    from models import db
    if db.session.dirty or db.session.new:
        db.session.commit()


def get_session_user(*, raise_on_expired: bool = False):
    user = g.get(_g_key_user)
    if user is not None:
        return _enforce_session_password_expiry(user, raise_on_expired=raise_on_expired)
    uid = get_current_uid()
    if uid is None:
        return None
    user = UserService.get(uid)
    if user is None:  # user deleted?
        clear_current_user()  # avoid next db query
        return None
    user = _enforce_session_password_expiry(user, raise_on_expired=raise_on_expired)
    if user is not None:
        setattr(g, _g_key_user, user)
    return user


def get_oauth_authorization():
    auth = g.get(_g_key_oauth_authorization)
    if auth is not None:
        return auth
    access_token = request.args.get('oauth_token')
    if access_token is None:  # try to find it from HTTP header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            parts = auth_header.strip().split(None, 1)
            if len(parts) == 2 and parts[0] == 'Bearer':  # only support Bearer type
                access_token = parts[1]
    if access_token is None:
        return None
    auth = OAuthService.verify_access_token(access_token)
    setattr(g, _g_key_oauth_authorization, auth)
    return auth


def get_current_user():
    # try OAuth authentication first
    try:
        auth = get_oauth_authorization()
    except PasswordExpiryError:
        raise
    except OAuthServiceError:
        raise
    if auth is not None:
        return auth.user
    else:
        # try getting session user
        return get_session_user(raise_on_expired=True)


def user_to_dict_with_password_expiry(user, *, include_intercept: bool = False) -> dict:
    expiry_fields = build_password_expiry_fields(user, include_intercept=include_intercept)
    return user.to_dict(password_expiry_fields=expiry_fields)


def start_two_factor(user):
    session[_session_key_two_factor_user_id] = user.id
    session[_session_key_two_factor_window] = time.time() + _two_factor_window_span


def clear_two_factor():
    if _g_key_two_factor_user in g:
        g.pop(_g_key_two_factor_user)
    if _session_key_two_factor_user_id in session:
        del session[_session_key_two_factor_user_id]
    if _session_key_two_factor_window in session:
        del session[_session_key_two_factor_window]


def get_two_factor_user():
    # check window
    window = session.get(_session_key_two_factor_window)
    if window is None or window < time.time():
        clear_two_factor()
        return None

    user = g.get(_g_key_two_factor_user)
    if user is not None:
        return user
    uid = session.get(_session_key_two_factor_user_id)
    if uid is None:
        return None
    user = UserService.get(uid)
    if user is None:  # user deleted?
        clear_two_factor()  # avoid next db query
        return None

    setattr(g, _g_key_two_factor_user, user)
    return user


def _password_expiry_error_response(error: PasswordExpiryError):
    body = {'msg': error.msg, 'detail': error.detail, 'code': error.code}
    if error.code == 'password_expiring':
        body['path'] = '/account/password-expiry'
        body['redirect_url'] = _password_expiry_intercept_url()
    elif error.code == 'password_expired':
        body['path'] = '/account/login'
        body['redirect_url'] = _password_expiry_login_url()
    return jsonify(body), 401


def requires_login(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            user = get_current_user()
        except UserServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 500
        except PasswordExpiryError as e:
            return _password_expiry_error_response(e)
        except OAuthServiceError as e:
            if getattr(e, 'code', None) in ('password_expiring', 'password_expired'):
                return _password_expiry_error_response(e)
            return jsonify(msg=e.msg, detail=e.detail, code=getattr(e, 'code', None)), 403

        if user is None:
            return jsonify(msg='login required'), 401
        if not user.is_active:
            return jsonify(msg='inactive user'), 403
        return f(*args, **kwargs)

    return wrapped


def requires_admin(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            user = get_current_user()
        except UserServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 500
        except PasswordExpiryError as e:
            return _password_expiry_error_response(e)
        except OAuthServiceError as e:
            if getattr(e, 'code', None) in ('password_expiring', 'password_expired'):
                return _password_expiry_error_response(e)
            return jsonify(msg=e.msg, detail=e.detail, code=getattr(e, 'code', None)), 403

        if user is None:
            return jsonify(msg='login required'), 401
        if not user.is_active:
            return jsonify(msg='inactive user'), 403
        if not any(group.name == _admin_group_name for group in user.groups):
            return jsonify(msg='admin required'), 403
        return f(*args, **kwargs)

    return wrapped
