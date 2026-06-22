import subprocess
import time

from flask import Blueprint, jsonify

from utils.session import requires_login

meta = Blueprint('meta_api', __name__)


@meta.route('/health')
def health():
    return jsonify(status='ok')


@meta.route('/time')
def get_time():
    return jsonify(unix_time=time.time())


@meta.route('/version')
@requires_login
def get_version():
    git_commit = subprocess.check_output(["git", "describe", "--tags"]).decode().strip()
    return jsonify(commit=git_commit)
