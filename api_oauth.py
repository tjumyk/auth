from flask import Blueprint, request, jsonify

from models import db
from services.oauth import OAuthService, OAuthServiceError
from utils.session import requires_admin, requires_login, get_current_user
from utils.url import url_append_param

oauth = Blueprint('oauth', __name__)


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
