from flask import Blueprint, request, jsonify

from models import db
from services.oauth import OAuthService, OAuthServiceError
from utils.session import requires_admin, requires_login, get_current_user
from utils.upload import handle_upload, handle_post_upload, UploadError
from utils.url import url_append_param

oauth = Blueprint('oauth', __name__)


@oauth.route('/clients', methods=['GET', 'POST'])
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


@oauth.route('/clients/<int:cid>', methods=['GET', 'DELETE', 'PUT'])
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
            params = request.form or request.json

            # handle upload
            icon_file = files.get('icon')
            if icon_file:
                if not icon_file.filename:
                    return jsonify(msg='icon file cannot be empty'), 400
                url = handle_upload(icon_file, 'icon')
                params['icon'] = url  # save url in profile

            old_profile = OAuthService.update_client_profile(client, **params)
            if icon_file:
                old_icon = old_profile.get('icon')
                handle_post_upload(old_icon, 'icon')

            db.session.commit()
            return "", 204
    except (OAuthServiceError, UploadError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@oauth.route('/clients/<int:cid>/regenerate-secret')
@requires_admin
def oauth_client_regenerate_secret(cid):
    try:
        client = OAuthService.get_client(cid)
        if client is None:
            return jsonify('client not found'), 404

        OAuthService.regenerate_client_secret(client)
        db.session.commit()
        return jsonify(secret=client.secret)
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@oauth.route('/clients/<int:cid>/users')
@requires_admin
def oauth_client_users(cid):
    try:
        client = OAuthService.get_client(cid)
        if client is None:
            return jsonify('client not found'), 404

        return jsonify([u.to_dict() for u in client.users])
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@oauth.route('/connect')
@requires_login
def oauth_connect():
    try:
        args = request.args
        client_id = args.get('client_id')
        redirect_url = args.get('redirect_url')

        client = OAuthService.get_client(client_id)
        if client is None:
            return jsonify('client not found'), 404

        authorize_token = OAuthService.connect(client, get_current_user(), redirect_url)
        db.session.commit()

        full_url = url_append_param(redirect_url, {'code': authorize_token})
        return jsonify(redirect_url=full_url)
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@oauth.route('/token', methods=['POST'])
@requires_login
def oauth_get_access_token():
    try:
        args = request.args
        client_id = args.get('client_id')
        client_secret = args.get('client_secret')
        redirect_url = args.get('redirect_url')
        authorize_token = args.get('code')

        client = OAuthService.get_client(client_id)
        if client is None:
            return jsonify('client not found'), 404

        access_token = OAuthService.get_access_token(client, get_current_user(),
                                                     client_secret, redirect_url, authorize_token)
        db.session.commit()

        return jsonify(access_token=access_token, scope='*')
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
