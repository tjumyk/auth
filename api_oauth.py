from flask import Blueprint, request, jsonify, current_app as app

from models import db
from services.oauth import OAuthService, OAuthServiceError
from services.user import UserServiceError
from utils.session import get_session_user
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
    """
    A duplicate of the connect page (with some modifications) for internal API usage
    """
    # parse request
    args = request.args
    client_id = args.get('client_id')
    redirect_url = args.get('redirect_url') or args.get('redirect_uri')  # make it compatible
    original_path = args.get('original_path')
    state = args.get('state')
    # Currently, we assume scope '*' everywhere

    if client_id is None:
        return jsonify(msg='client_id is required'), 400
    try:
        client_id = int(client_id)
    except ValueError:
        return jsonify(msg='client_id must be an integer'), 400
    if redirect_url is None:
        return jsonify(msg='redirect_url is required'), 400

    # get current user in session
    try:
        user = get_session_user()
    except UserServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 500

    # if not logged in
    if user is None:
        # redirect to login page
        site = app.config['SITE']
        site_url = site['root_url'] + site['base_url']
        if site_url[-1] != '/':
            site_url += '/'
        path = 'oauth/login'
        params = {'client_id': client_id, 'redirect_url': redirect_url}
        if original_path:
            params['original_path'] = original_path
        if state:
            params['state'] = state
        full_url = url_append_param(site_url + path, params)
        return jsonify(msg='user not logged in', path='/' + path, redirect_url=full_url), 401

    try:
        # get client data
        client = OAuthService.get_client(client_id)
        if client is None:
            return jsonify('client not found'), 400

        # start the authorization process
        authorize_token = OAuthService.start_authorization(client, user, redirect_url)
        db.session.commit()

        params = {'token': authorize_token, 'code': authorize_token}  # make it compatible
        if original_path:
            params['original_path'] = original_path
        if state:
            params['state'] = state
        full_url = url_append_param(redirect_url, params)
        return jsonify(
            token=authorize_token,
            original_path=original_path,
            state=state,
            redirect_url=full_url)
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
        redirect_url = form.get('redirect_url') or form.get('redirect_uri')  # make it compatible
        authorize_token = form.get('token') or form.get('code')  # make it compatible
        auth = request.authorization  # some client use basic auth to provide client_id and client_secret (e.g. GitLab)

        if client_id is None:
            # fallback to use auth info if applicable
            if auth is not None and auth.type == 'basic':  # only basic auth supported
                client_id = auth.username
                client_secret = auth.password
        if client_id is None:
            return jsonify(msg='client_id is required'), 400

        try:
            client_id = int(client_id)
        except ValueError:
            return jsonify(msg='client_id must be an integer'), 400
        # get client
        client = OAuthService.get_client(client_id)
        if client is None:
            return jsonify(msg='client not found'), 400

        # get the access token
        access_token = OAuthService.get_access_token(client, client_secret, redirect_url, authorize_token)
        db.session.commit()

        return jsonify(access_token=access_token)
    except OAuthServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
