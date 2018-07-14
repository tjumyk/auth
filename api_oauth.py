from flask import Blueprint, request, jsonify, current_app as app

from models import db
from services.oauth import OAuthService, OAuthServiceError
from services.user import UserServiceError
from utils.session import requires_oauth, get_current_oauth_authorization, get_current_user
from utils.url import url_append_param

oauth = Blueprint('oauth', __name__)


@oauth.route('/clients/<int:cid>', methods=['GET'])
def oauth_client(cid):
    try:
        client = OAuthService.get_client(cid)
        if client is None:
            return jsonify(msg='client not found'), 404

        return jsonify(client.to_dict())
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@oauth.route('/connect')
def connect():
    try:
        # parse request
        args = request.args
        client_id = args.get('client_id')
        redirect_url = args.get('redirect_url')
        state = args.get('state')
        # Currently, we assume scope '*' everywhere

        # get current user in session
        try:
            user = get_current_user()
        except UserServiceError as e:
            return jsonify(msg=e.msg, detail=e.detail), 500

        # if not logged in or inactive
        if user is None or not user.is_active:
            # redirect to login page
            site = app.config['SITE']
            site_url = site['root_url'] + site['base_url']
            if site_url[-1] != '/':
                site_url += '/'
            path = 'oauth/login'
            params = {'client_id': client_id, 'redirect_url': redirect_url}
            if state:
                params['state'] = state
            full_url = url_append_param(site_url + path, params)
            return jsonify(path='/' + path, redirect_url=full_url), 401

        # get client data
        client = OAuthService.get_client(client_id)
        if client is None:
            return jsonify('client not found'), 400

        # start the authorization process
        authorize_token = OAuthService.start_authorization(client, get_current_user(), redirect_url)
        db.session.commit()

        params = {'token': authorize_token}
        if state:
            params['state'] = state
        full_url = url_append_param(redirect_url, params)
        return jsonify(token=authorize_token, redirect_url=full_url)
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@oauth.route('/token', methods=['POST'])
def oauth_get_access_token():
    """
    Return 400 with error message if any error happens
    """
    try:
        # parse request
        form = request.form
        client_id = form.get('client_id')
        client_secret = form.get('client_secret')
        redirect_url = form.get('redirect_url')
        authorize_token = form.get('token')

        # get client
        client = OAuthService.get_client(client_id)
        if client is None:
            return jsonify('client not found'), 400

        # get the access token
        access_token = OAuthService.get_access_token(client, client_secret, redirect_url, authorize_token)
        db.session.commit()

        return jsonify(access_token=access_token)
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@oauth.route('/me')
@requires_oauth
def me():
    auth = get_current_oauth_authorization()
    user = auth.user
    return jsonify(user.to_dict())
