import subprocess

from flask import Blueprint, jsonify

from utils.session import requires_login

meta = Blueprint('meta_api', __name__)


@meta.route('/version')
@requires_login
def get_version():
    git_commit = subprocess.check_output(["git", "describe", "--tags"]).decode().strip()
    return jsonify(commit=git_commit)
