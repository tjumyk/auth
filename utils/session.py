from functools import wraps

from flask import session, jsonify, g, request

from services.oauth import OAuthService, OAuthServiceError
from services.user import UserService, UserServiceError

_session_key_user_id = 'user_id'
_g_key_user = 'user'
_g_key_oauth_client_user = 'oauth_client_user'
_admin_group_name = 'admin'


def set_current_user(user, remember):
    session[_session_key_user_id] = user.id
    if remember:
        session.permanent = True


def clear_current_user():
    if _g_key_user in g:
        del g[_g_key_user]
    if _session_key_user_id in session:
        del session[_session_key_user_id]


def get_current_uid():
    return session.get(_session_key_user_id)


def get_current_user():
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
        g[_g_key_user] = user
    return user


def get_current_oauth_client_user():
    client_user = g.get(_g_key_oauth_client_user)
    if client_user is not None:
        return client_user
    access_token = request.args.get('oauth_token')
    if access_token is None:
        return None
    client_user = OAuthService.verify_access_token(access_token)
    g[_g_key_oauth_client_user] = client_user
    return client_user


def requires_login(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            user = get_current_user()
        except UserServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 500

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

        if user is None:
            return jsonify(msg='login required'), 401
        if not user.is_active:
            return jsonify(msg='inactive user'), 403
        if not any(group.name == _admin_group_name for group in user.groups):
            return jsonify(msg='admin required'), 403
        return f(*args, **kwargs)

    return wrapped


def requires_groups(*groups):
    def wrapper(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            try:
                user = get_current_user()
            except UserServiceError as e:
                return jsonify(msg=e.msg, detail=e.detail), 500

            if user is None:
                return jsonify(msg='login required'), 401
            if not user.is_active:
                return jsonify(msg='inactive user'), 403
            if not any(group.name in groups for group in user.groups):
                return jsonify(msg='group {group_names} required', group_names='/'.join(groups)), 403
            return f(*args, **kwargs)

        return wrapped

    return wrapper


def requires_oauth(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            client_user = get_current_oauth_client_user()

            if client_user is None:
                return jsonify(msg='oauth access token required'), 400
        except OAuthServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 403
        return f(*args, **kwargs)

    return wrapped