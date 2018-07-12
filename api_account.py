from flask import Blueprint, current_app as app, request, jsonify

from models import db
from services.user import UserService, UserServiceError
from utils.mail import send_email
from utils.session import get_current_user, requires_login, clear_current_user, set_current_user
from utils.upload import handle_upload, handle_post_upload, UploadError

account = Blueprint('account', __name__)


@account.route('/login', methods=['POST'])
def account_login():
    try:
        _json = request.json
        name_or_email = _json.get('name_or_email')
        password = _json.get('password')
        remember = _json.get('remember')

        user = UserService.login(name_or_email, password, request.remote_addr, request.user_agent)
        if user is None:
            return jsonify(msg='user not found'), 404

        set_current_user(user, remember)
        return jsonify(user.to_dict())
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/logout')
def account_logout():
    clear_current_user()
    return "", 204


@account.route('/confirm-email', methods=['GET', 'POST'])
def account_confirm_email():
    try:
        args = request.args
        uid = args.get('uid')
        token = args.get('token')

        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        if request.method == 'GET':
            UserService.confirm_email(user, token, None, check_only=True)
            return "", 204
        else:  # POST
            new_password = request.json.get('new_password')
            UserService.confirm_email(uid, token, new_password)
            db.session.commit()
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

        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        if request.method == 'GET':
            UserService.reset_password(user, token, None, check_only=True)
            return "", 204
        else:  # POST
            new_password = request.json.get('new_password')
            UserService.reset_password(user, token, new_password)
            db.session.commit()
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
            return jsonify(user.to_dict())
        else:
            files = request.files
            params = request.form or request.json or {}

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
            return jsonify(user.to_dict())
    except (UserServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@account.route('/me/password', methods=['PUT'])
@requires_login
def account_update_password():
    try:
        _json = request.json
        old_password = _json.get('old_password')
        new_password = _json.get('new_password')

        user = get_current_user()
        UserService.update_password(user, new_password, old_password)
        db.session.commit()
        return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
