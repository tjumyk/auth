import time
from functools import wraps

from flask import session, jsonify, g, request

from services.oauth import OAuthService, OAuthServiceError
from services.user import UserService, UserServiceError

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


def get_session_user():
    user = g.get(_g_key_user)
    if user is not None:
        return user
    uid = get_current_uid()
    if uid is None:
        return None
    user = UserService.get(uid)
    if user is None:  # user deleted?
        clear_current_user()  # avoid next db query
    else:
        setattr(g, _g_key_user, user)
    return user


def get_oauth_authorization():
    auth = g.get(_g_key_oauth_authorization)
    if auth is not None:
        return auth
    access_token = request.args.get('oauth_token')
    if access_token is None:  # try to find it from HTTP header
        auth = request.headers.get('Authorization')
        if auth:
            parts = auth.strip().split(None, 1)
            if len(parts) == 2 and parts[0] == 'Bearer':  # only support Bearer type
                access_token = parts[1]
    if access_token is None:
        return None
    auth = OAuthService.verify_access_token(access_token)
    setattr(g, _g_key_oauth_authorization, auth)
    return auth


def get_current_user():
    # try OAuth authentication first
    auth = get_oauth_authorization()
    if auth is not None:
        return auth.user
    else:
        # try getting session user
        return get_session_user()


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


def requires_login(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            user = get_current_user()
        except UserServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 500
        except OAuthServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 403

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
        except OAuthServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 403

        if user is None:
            return jsonify(msg='login required'), 401
        if not user.is_active:
            return jsonify(msg='inactive user'), 403
        if not any(group.name == _admin_group_name for group in user.groups):
            return jsonify(msg='admin required'), 403
        return f(*args, **kwargs)

    return wrapped


def requires_two_factor_session(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            user = get_two_factor_user()
        except UserServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 500

        if user is None:
            return jsonify(msg='two-factor session required',
                           detail='two-factor authentication was not started or is already expired'), 403
        if not user.is_active:
            return jsonify(msg='inactive user'), 403
        return f(*args, **kwargs)

    return wrapped
