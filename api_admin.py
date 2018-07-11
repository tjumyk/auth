from flask import Blueprint, current_app as app, request, jsonify

from models import db
from services.group import GroupService, GroupServiceError
from services.login_record import LoginRecordService
from services.oauth import OAuthServiceError, OAuthService
from services.user import UserService, UserServiceError
from utils.mail import send_email
from utils.session import requires_admin
from utils.upload import handle_upload, handle_post_upload, UploadError

admin = Blueprint('admin', __name__)


@admin.route('/users', methods=['GET', 'POST'])
@requires_admin
def admin_user_list():
    try:
        if request.method == 'GET':
            users = [u.to_dict(with_groups=False, with_group_ids=True) for u in UserService.get_all()]
            groups = [g.to_dict() for g in GroupService.get_all()]
            return jsonify(users=users, groups=groups)
        else:  # POST
            _json = request.json
            name = _json.get('name')
            email = _json.get('email')
            user = UserService.invite(name, email)
            db.session.commit()

            send_email(name, email, 'invitation', user=user, site=app.config['SITE'])
            return jsonify(user.to_dict()), 201
    except (UserServiceError, GroupServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 500


@admin.route('/users/<int:uid>', methods=['GET', 'DELETE', 'PUT'])
@requires_admin
def admin_user(uid):
    try:
        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        if request.method == 'GET':
            return jsonify(user.to_dict())
        elif request.method == 'DELETE':
            db.session.delete(user)
            db.session.commit()
            return "", 204
        else:  # PUT
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


@admin.route('/users/<int:uid>/active', methods=['POST', 'DELETE'])
@requires_admin
def admin_user_set_active(uid):
    try:
        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        if request.method == 'POST':
            if user.is_active:
                return jsonify(msg='user already active'), 400
            user.is_active = True
        else:  # DELETE
            if not user.is_active:
                return jsonify(msg='user already inactive'), 400
            user.is_active = False

        db.session.commit()
        return "", 204
    except (UserServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/users/<int:uid>/reconfirm-email', methods=['POST'])
@requires_admin
def admin_user_reconfirm_email(uid):
    try:
        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        UserService.reconfirm_email(user)
        db.session.commit()

        send_email(user.name, user.email, 'confirm_email', user=user, site=app.config['SITE'])
        return "", 204
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/users/<int:uid>/login-records')
@requires_admin
def admin_user_login_records(uid):
    try:
        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        return jsonify([r.to_dict() for r in LoginRecordService.get_for_user(user)])
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/groups', methods=['GET', 'POST'])
@requires_admin
def admin_group_list():
    try:
        if request.method == 'GET':
            groups = [g.to_dict() for g in GroupService.get_all()]
            return jsonify(groups)
        else:  # POST
            _json = request.json
            name = _json.get('name')
            description = _json.get('description')
            group = GroupService.add(name, description)
            db.session.commit()
            return jsonify(group.to_dict()), 201
    except GroupServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 500


@admin.route('/groups/<int:gid>', methods=['GET', 'DELETE', 'PUT'])
@requires_admin
def admin_group(gid):
    try:
        group = GroupService.get(gid)
        if group is None:
            return jsonify(msg='group not found'), 404

        if request.method == 'GET':
            return jsonify(group.to_dict())
        elif request.method == 'DELETE':
            db.session.delete(group)
            db.session.commit()
            return "", 204
        else:  # PUT
            params = request.json or {}
            GroupService.update_profile(group, **params)
            db.session.commit()
            return jsonify(params)
    except GroupServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 500


@admin.route('/groups/<int:gid>/users/<int:uid>', methods=['POST', 'DELETE'])
@requires_admin
def admin_group_user(gid, uid):
    try:
        group = GroupService.get(gid)
        if group is None:
            return jsonify(msg='group not found'), 404
        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        if request.method == 'PUT':
            if group in user.roles:
                return jsonify(msg='user already in the group'), 400
            user.groups.append(group)
            db.session.commit()
            return "", 204
        else:  # DELETE
            if group not in user.roles:
                return jsonify(msg='user not in the group'), 400
            user.groups.remove(group)
            db.session.commit()
            return "", 204
    except (UserServiceError, GroupServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/clients', methods=['GET', 'POST'])
@requires_admin
def oauth_clients():
    try:
        if request.method == 'GET':
            return jsonify([c.to_dict() for c in OAuthService.get_all_clients()])
        else:  # POST
            _json = request.json
            name = _json.get('name')
            redirect_url = _json.get('redirect_url')
            home_url = _json.get('home_url')
            description = _json.get('description')

            client = OAuthService.add_client(name, redirect_url, home_url, description)
            db.session.commit()
            return jsonify(client.to_dict()), 201
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/clients/<int:cid>', methods=['GET', 'DELETE', 'PUT'])
@requires_admin
def oauth_client(cid):
    try:
        client = OAuthService.get_client(cid)
        if client is None:
            return jsonify(msg='client not found'), 404

        if request.method == 'GET':
            return jsonify(client.to_dict())
        elif request.method == 'DELETE':
            db.session.delete(client)
            db.session.commit()
            return "", 204
        else:  # PUT
            files = request.files
            params = request.form or request.json or {}

            # handle upload
            icon_file = files.get('icon')
            if icon_file:
                if not icon_file.filename:
                    return jsonify(msg='icon file cannot be empty'), 400
                url = handle_upload(icon_file, 'icon', image_check=True, image_check_squared=True)
                params['icon'] = url  # save url in params

            old_profile = OAuthService.update_client_profile(client, **params)
            if icon_file:
                old_icon = old_profile.get('icon')
                if old_icon:
                    handle_post_upload(old_icon, 'icon')

            db.session.commit()
            return jsonify(client.to_dict())
    except (OAuthServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/clients/<int:cid>/regenerate-secret', methods=['POST'])
@requires_admin
def oauth_client_regenerate_secret(cid):
    try:
        client = OAuthService.get_client(cid)
        if client is None:
            return jsonify('client not found'), 404

        OAuthService.regenerate_client_secret(client)
        db.session.commit()
        return jsonify(client.to_dict())
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
