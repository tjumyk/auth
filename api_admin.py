from flask import Blueprint, current_app as app, request, jsonify

from models import db
from services.group import GroupService, GroupServiceError
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
            params = request.form or request.json

            # allow updating additional fields for admin only
            if 'is_active' in params:
                user.is_active = params.pop('is_active')

            # handle upload
            avatar_file = files.get('avatar')
            if avatar_file:
                if not avatar_file.filename:
                    return jsonify(msg='avatar file cannot be empty'), 400
                url = handle_upload(avatar_file, 'avatar')
                params['avatar'] = url  # save url in profile

            # treat the rest as the normal profile fields
            if params:
                old_profile = UserService.update_profile(user, **params)
                if avatar_file:
                    old_avatar = old_profile.get('avatar')
                    handle_post_upload(old_avatar, 'avatar')

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
            _json = request.json
            GroupService.update_profile(group, **_json)
            db.session.commit()
            return "", 204
    except GroupServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 500


@admin.route('/groups/<int:gid>/users/<int:uid>', methods=['PUT', 'DELETE'])
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