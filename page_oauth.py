from flask import Blueprint, request, current_app as app, redirect

from models import db
from services.oauth import OAuthServiceError, OAuthService
from services.user import UserServiceError
from utils.session import get_current_user
from utils.url import url_append_param

oauth_pages = Blueprint('page-oauth', __name__)


def _error_html(msg, detail=None):
    if detail is None:
        detail = ''
    return "<html><body><h1>%s</h1><p>%s</p></body></html>" % (msg, detail)


@oauth_pages.route('/connect')
def oauth_connect():
    """
    A duplicate of the connect API (with some modifications) for direct redirect
    """
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
            return _error_html(msg=e.msg, detail=e.detail), 500

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
            return redirect(full_url)

        # get client data
        client = OAuthService.get_client(client_id)
        if client is None:
            return _error_html('client not found'), 400

        # start the authorization process
        authorize_token = OAuthService.start_authorization(client, get_current_user(), redirect_url)
        db.session.commit()

        params = {'token': authorize_token}
        if state:
            params['state'] = state
        full_url = url_append_param(redirect_url, params)
        return redirect(full_url)
    except OAuthServiceError as e:
        return _error_html(msg=e.msg, detail=e.detail), 400