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
            args = request.args
            if 'name' in args:  # search by name
                limit = args.get('limit')
                if limit is not None:
                    try:
                        limit = int(limit)
                    except ValueError:
                        return jsonify(msg='limit must be an integer'), 400
                    users = UserService.search_by_name(args['name'], limit)
                else:
                    users = UserService.search_by_name(args['name'])  # use default limit
                return jsonify([user.to_dict(with_advanced_fields=True) for user in users])
            else:  # get all
                users = UserService.get_all()
                user_dicts = []
                group_set = set()
                for u in users:
                    user_dicts.append(u.to_dict(with_groups=False, with_group_ids=True, with_advanced_fields=True))
                    # assume groups are lazy-loaded, otherwise need to dig into User.to_dict() to avoid redundant
                    # SQL queries on Group table
                    group_set.update(u.groups)
                group_dicts = [g.to_dict(with_advanced_fields=True) for g in group_set]
                return jsonify(users=user_dicts, groups=group_dicts)
        else:  # POST
            _json = request.json
            name = _json.get('name')
            email = _json.get('email')
            user = UserService.invite(name, email)
            db.session.commit()

            send_email(name, email, 'confirm_email', user=user, site=app.config['SITE'])
            return jsonify(user.to_dict(with_advanced_fields=True)), 201
    except (UserServiceError, GroupServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/users/<int:uid>', methods=['GET', 'DELETE', 'PUT'])
@requires_admin
def admin_user_by_id(uid):
    try:
        return _admin_user(UserService.get(uid))
    except (UserServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/user-by-name/<string:name>', methods=['GET', 'DELETE', 'PUT'])
@requires_admin
def admin_user_by_name(name):
    try:
        return _admin_user(UserService.get_by_name(name))
    except (UserServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


def _admin_user(user):
    if user is None:
        return jsonify(msg='user not found'), 404

    if request.method == 'GET':
        return jsonify(user.to_dict(with_advanced_fields=True))
    elif request.method == 'DELETE':
        db.session.delete(user)
        db.session.commit()
        return "", 204
    else:  # PUT
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
        return jsonify(user.to_dict(with_advanced_fields=True))


@admin.route('/users/<int:uid>/active', methods=['PUT', 'DELETE'])
@requires_admin
def admin_user_set_active(uid):
    try:
        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        if request.method == 'PUT':
            if user.is_active:
                return jsonify(msg='user already active'), 400
            user.is_active = True
        else:  # DELETE
            if not user.is_active:
                return jsonify(msg='user already inactive'), 400
            user.is_active = False

        db.session.commit()
        return "", 204
    except UserServiceError as e:
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
            args = request.args
            if 'name' in args:  # search by name
                limit = args.get('limit')
                if limit is not None:
                    try:
                        limit = int(limit)
                    except ValueError:
                        return jsonify(msg='limit must be an integer'), 400
                    groups = GroupService.search_by_name(args['name'], limit)
                else:
                    groups = GroupService.search_by_name(args['name'])  # use default limit
                return jsonify([group.to_dict(with_advanced_fields=True) for group in groups])
            else:  # get all
                groups = [g.to_dict(with_advanced_fields=True) for g in GroupService.get_all()]
                return jsonify(groups)
        else:  # POST
            _json = request.json
            name = _json.get('name')
            description = _json.get('description')
            group = GroupService.add(name, description)
            db.session.commit()
            return jsonify(group.to_dict(with_advanced_fields=True)), 201
    except GroupServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/groups/<int:gid>', methods=['GET', 'DELETE', 'PUT'])
@requires_admin
def admin_group(gid):
    try:
        group = GroupService.get(gid)
        if group is None:
            return jsonify(msg='group not found'), 404

        if request.method == 'GET':
            return jsonify(group.to_dict(with_advanced_fields=True))
        elif request.method == 'DELETE':
            db.session.delete(group)
            db.session.commit()
            return "", 204
        else:  # PUT
            params = request.json or {}
            GroupService.update_profile(group, **params)
            db.session.commit()
            return jsonify(group.to_dict(with_advanced_fields=True))
    except GroupServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/groups/<int:gid>/users', methods=['GET'])
@requires_admin
def admin_group_users(gid):
    try:
        group = GroupService.get(gid)
        if group is None:
            return jsonify(msg='group not found'), 404
        return jsonify([user.to_dict(with_groups=False, with_advanced_fields=True)
                        for user in group.users])
    except GroupServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/groups/<int:gid>/users/<int:uid>', methods=['PUT', 'DELETE'])
@requires_admin
def admin_group_user_by_id(gid, uid):
    try:
        group = GroupService.get(gid)
        if group is None:
            return jsonify(msg='group not found'), 404
        user = UserService.get(uid)
        if user is None:
            return jsonify(msg='user not found'), 404

        return _admin_group_user(group, user)
    except (UserServiceError, GroupServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/groups/<int:gid>/user-by-name/<string:user_name>', methods=['PUT', 'DELETE'])
@requires_admin
def admin_group_user_by_name(gid, user_name):
    try:
        group = GroupService.get(gid)
        if group is None:
            return jsonify(msg='group not found'), 404
        user = UserService.get_by_name(user_name)
        if user is None:
            return jsonify(msg='user not found'), 404

        return _admin_group_user(group, user)
    except (UserServiceError, GroupServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


def _admin_group_user(group, user):
    if request.method == 'PUT':
        if group in user.groups:
            return jsonify(msg='user already in the group'), 400
        user.groups.append(group)
        db.session.commit()
        return "", 204
    else:  # DELETE
        if group not in user.groups:
            return jsonify(msg='user not in the group'), 400
        user.groups.remove(group)
        db.session.commit()
        return "", 204


@admin.route('/clients', methods=['GET', 'POST'])
@requires_admin
def oauth_clients():
    try:
        if request.method == 'GET':
            return jsonify([c.to_dict(with_advanced_fields=True) for c in OAuthService.get_all_clients()])
        else:  # POST
            _json = request.json
            name = _json.get('name')
            redirect_url = _json.get('redirect_url')
            home_url = _json.get('home_url')
            description = _json.get('description')

            client = OAuthService.add_client(name, redirect_url, home_url, description)
            db.session.commit()
            return jsonify(client.to_dict(with_advanced_fields=True)), 201
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
            return jsonify(client.to_dict(with_advanced_fields=True))
        elif request.method == 'DELETE':
            db.session.delete(client)
            db.session.commit()
            return "", 204
        else:  # PUT
            files = request.files
            params = request.form.to_dict() or request.json or {}

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
            return jsonify(client.to_dict(with_advanced_fields=True))
    except (OAuthServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/clients/<int:cid>/public', methods=['PUT', 'DELETE'])
@requires_admin
def oauth_client_set_public(cid):
    try:
        client = OAuthService.get_client(cid)
        if client is None:
            return jsonify(msg='client not found'), 404

        if request.method == 'PUT':
            if client.is_public:
                return jsonify(msg='client already public'), 400
            client.is_public = True
        else:  # DELETE
            if not client.is_public:
                return jsonify(msg='client already non-public'), 400
            client.is_public = False

        db.session.commit()
        return "", 204
    except OAuthServiceError as e:
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
        return "", 204
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/clients/<int:cid>/authorizations', methods=['GET'])
@requires_admin
def oauth_client_authorizations(cid):
    try:
        client = OAuthService.get_client(cid)
        if client is None:
            return jsonify(msg='client not found'), 404

        return jsonify([auth.to_dict() for auth in client.authorizations])
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin.route('/clients/<int:cid>/allowed_groups/<int:gid>', methods=['PUT', 'DELETE'])
@requires_admin
def oauth_client_allowed_groups(cid, gid):
    try:
        group = GroupService.get(gid)
        if group is None:
            return jsonify(msg='group not found'), 404
        client = OAuthService.get_client(cid)
        if client is None:
            return jsonify(msg='client not found'), 404

        if request.method == 'PUT':
            if group in client.allowed_groups:
                return jsonify(msg='client already in the allowed group'), 400
            client.allowed_groups.append(group)
            db.session.commit()
            return "", 204
        else:  # DELETE
            if group not in client.allowed_groups:
                return jsonify(msg='client not in the allowed group'), 400
            client.allowed_groups.remove(group)
            db.session.commit()
            return "", 204
    except (OAuthServiceError, GroupServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
