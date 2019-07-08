from flask import Blueprint, current_app as app, request, jsonify

from models import db
from services.oauth import OAuthService, OAuthServiceError
from services.user import UserService, UserServiceError
from utils.mail import send_email
from utils.session import get_session_user, requires_login, clear_current_user, set_current_user, get_current_user, \
    start_two_factor, get_two_factor_user, requires_two_factor_session
from utils.upload import handle_upload, handle_post_upload, UploadError
import utils.two_factor as two_factor
from utils.qr_code import build_qr_code, img_to_base64

account = Blueprint('account', __name__)


@account.route('/login', methods=['POST'])
def account_login():
    try:
        _json = request.json
        name_or_email = _json.get('name_or_email')
        password = _json.get('password')
        remember = _json.get('remember')

        user = UserService.login(name_or_email, password, _get_client_ip(), request.user_agent)
        if user is None:
            return jsonify(msg='user not found'), 404

        if user.is_two_factor_enabled:
            start_two_factor(user)
        else:
            set_current_user(user, remember)
        return jsonify(user.to_dict())
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


def _get_client_ip():
    if app.config['SITE'].get('behind_proxy'):
        ip = request.environ.get('HTTP_X_REAL_IP') or request.remote_addr
    else:
        ip = request.remote_addr
    return ip


@account.route('/logout')
def account_logout():
    try:
        user = get_session_user()
        clear_current_user()  # clear session first
        if user:
            OAuthService.clear_user_tokens(user)
            db.session.commit()
        return "", 204
    except (UserServiceError, OAuthServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 500


@account.route('/confirm-email', methods=['GET', 'POST'])
def account_confirm_email():
    try:
        args = request.args
        uid = args.get('uid')
        token = args.get('token')

        if uid is None:
            return jsonify(msg='user id is required')
        try:
            uid = int(uid)
        except ValueError:
            return jsonify(msg='user id must be an integer')

        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        if request.method == 'GET':
            UserService.confirm_email(user, token, None, check_only=True)
            return jsonify(user.to_dict())
        else:  # POST
            new_password = request.json.get('new_password')
            UserService.confirm_email(user, token, new_password)
            db.session.commit()
            set_current_user(user, False)  # auto login for better user experience
            return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/request-reset-password', methods=['POST'])
def account_request_reset_password():
    try:
        _json = request.json
        name_or_email = _json.get('name_or_email')

        user = UserService.request_reset_password(name_or_email)
        db.session.commit()

        send_email(user.name, user.email, 'reset_password', user=user, site=app.config['SITE'])
        return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/reset-password', methods=['GET', 'POST'])
def account_reset_password():
    try:
        args = request.args
        uid = args.get('uid')
        token = args.get('token')

        if uid is None:
            return jsonify(msg='user id is required')
        try:
            uid = int(uid)
        except ValueError:
            return jsonify(msg='user id must be an integer')

        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        if request.method == 'GET':
            UserService.reset_password(user, token, None, check_only=True)
            return jsonify(user.to_dict())
        else:  # POST
            new_password = request.json.get('new_password')
            UserService.reset_password(user, token, new_password)
            db.session.commit()
            return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/request-reconfirm-email', methods=['POST'])
def account_reconfirm_email():
    try:
        _json = request.json
        name_or_email = _json.get('name_or_email')

        user = UserService.request_reconfirm_email(name_or_email)
        db.session.commit()

        send_email(user.name, user.email, 'confirm_email', user=user, site=app.config['SITE'])
        return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/whoami', methods=['GET'])
def account_who_am_i():
    """
    A more API-friendly version of 'account_me()'
    """
    try:
        user = get_current_user()
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 500
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 403

    if user is None:
        return "", 204
    if not user.is_active:  # do not acknowledge inactive user as '@requires_login' do
        return "", 204
    return jsonify(user.to_dict())


@account.route('/me', methods=['GET', 'PUT'])
@requires_login
def account_me():
    try:
        user = get_current_user()
        if request.method == 'GET':
            user_dict = user.to_dict()

            # add full avatar URL for compatibility with 3rd-party OAuth clients
            user_avatar = user_dict.get('avatar')
            user_avatar_full = None
            if user_avatar:
                site_config = app.config['SITE']
                user_avatar_full = site_config['root_url'] + site_config['base_url'] + user_avatar
            user_dict['avatar_full'] = user_avatar_full

            return jsonify(user_dict)
        else:
            files = request.files
            params = request.form.to_dict() or request.json or {}

            # handle upload
            avatar_file = files.get('avatar')
            if avatar_file:
                if not avatar_file.filename:
                    return jsonify(msg='avatar file cannot be empty'), 400
                url = handle_upload(avatar_file, 'avatar', image_check=True, image_check_squared=True)
                params['avatar'] = url  # save url in params

            old_profile = UserService.update_profile(user, **params)
            if avatar_file:
                old_avatar = old_profile.get('avatar')
                if old_avatar:
                    handle_post_upload(old_avatar, 'avatar')

            db.session.commit()
            # TODO also add full avatar URL for PUT method? and any other locations?
            return jsonify(user.to_dict())
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 403
    except (UserServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/me/password', methods=['PUT'])
@requires_login
def account_update_password():
    try:
        _json = request.json
        old_password = _json.get('old_password')
        new_password = _json.get('new_password')

        user = get_session_user()
        if user is None:
            return jsonify('login required'), 401
        UserService.update_password(user, new_password, old_password)
        db.session.commit()
        return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/clients', methods=['GET'])
@requires_login
def account_clients():
    try:
        user = get_current_user()
        return jsonify([c.to_dict() for c in OAuthService.get_clients_for_user(user)])
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 403
    except (UserServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/two-factor/setup', methods=['GET', 'POST'])
@requires_login
def account_two_factor_setup():
    try:
        user = get_current_user()

        two_factor.setup(user)
        uri = two_factor.build_uri(user)

        qr_code = build_qr_code(uri)
        qr_code_b64 = img_to_base64(qr_code)

        db.session.commit()
        return jsonify(qr_code=qr_code_b64)
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 403
    except two_factor.TwoFactorError as e:
        return jsonify(msg=e.msg, detail=e.detail), 500


@account.route('/two-factor/confirm-setup', methods=['POST'])
@requires_login
def account_two_factor_confirm_setup():
    try:
        user = get_current_user()

        token = request.json.get('token')
        two_factor.confirm_setup(user, token)

        db.session.commit()
        return "", 204
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 403
    except two_factor.TwoFactorError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/two-factor/disable', methods=['POST'])
@requires_login
def account_two_factor_disable():
    try:
        user = get_current_user()

        token = request.json.get('token')
        two_factor.disable(user, token)

        db.session.commit()
        return "", 204
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 403
    except two_factor.TwoFactorError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/two-factor/login', methods=['POST'])
@requires_two_factor_session
def account_two_factor_login():
    try:
        user = get_two_factor_user()

        _json = request.json
        token = _json.get('token')
        remember = _json.get('remember')
        UserService.two_factor_login(user, token, _get_client_ip(), request.user_agent)

        set_current_user(user, remember)
        return jsonify(user.to_dict())
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/two-factor/request-disable-by-email')
@requires_two_factor_session
def account_two_factor_request_disable_by_email():
    try:
        user = get_two_factor_user()

        UserService.two_factor_request_disable_by_email(user)
        db.session.commit()

        send_email(user.name, user.email, 'disable_two_factor', user=user, site=app.config['SITE'])
        return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/two-factor/disable-by-email')
def account_two_factor_disable_by_email():
    try:
        args = request.args
        uid = args.get('uid')
        token = args.get('token')

        if uid is None:
            return jsonify(msg='user id is required')
        try:
            uid = int(uid)
        except ValueError:
            return jsonify(msg='user id must be an integer')

        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        UserService.two_factor_disable_by_email(user, token)
        db.session.commit()
        return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


# TODO reject weak passwords
