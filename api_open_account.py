from flask import Blueprint, jsonify

from utils.session import requires_oauth, get_current_oauth_client_user

open_account = Blueprint('open_account', __name__)


@open_account.route('/me')
@requires_oauth
def me():
    client_user = get_current_oauth_client_user()
    user = client_user.user
    return jsonify(user.to_dict())
