import os
import re

from flask import Flask, request, jsonify, send_from_directory

from api_account import account
from api_admin import admin
from api_oauth import oauth
from api_meta import meta
from models import db
from page_oauth import oauth_pages
from services.group import GroupService
from services.user import UserService
from utils import upload
from utils.external_auth import provider
from utils.ip import get_ip_country_info


class MyFlask(Flask):
    _hashed_static_file_pattern = re.compile(r'^.+\.[a-z0-9]{20}\.\w+$')
    _hashed_static_file_cache_timeout = 365 * 24 * 60 * 60  # 1 year
    _index_page_cache_timeout = 5 * 60  # 5 minutes

    def send_static_file(self, filename):
        """Identify hashed static files and send them with a longer cache timeout.
        For 'index.html', send it with a short cache timeout.
        For other static files, the default cache timeout is used.
        """
        if not self.has_static_folder:
            raise RuntimeError('No static folder for this object')
        if filename == 'index.html':
            cache_timeout = self._index_page_cache_timeout
        elif self._hashed_static_file_pattern.fullmatch(filename):
            cache_timeout = self._hashed_static_file_cache_timeout
        else:
            cache_timeout = self.get_send_file_max_age(filename)
        return send_from_directory(self._get_localized_static_folder(), filename,
                                   cache_timeout=cache_timeout)

    def _get_localized_static_folder(self):
        if self.config['ENABLE_CDN']:
            if self.config['SITE'].get('behind_proxy'):
                ip = request.environ.get('HTTP_X_REAL_IP') or request.remote_addr
            else:
                ip = request.remote_addr
            country_code = get_ip_country_info(ip).to_dict().get('iso_code')
            if country_code:
                static_folder = 'static_%s' % country_code.lower()
                if os.path.exists(static_folder):
                    return static_folder
        return self.static_folder  # default folder as fallback


app = MyFlask(__name__)
app.config.from_json('config.json')

db.init_app(app)
upload.init_app(app)
provider.init_app(app)

app.register_blueprint(account, url_prefix='/api/account')
app.register_blueprint(admin, url_prefix='/api/admin')
app.register_blueprint(oauth, url_prefix='/api/oauth')
app.register_blueprint(meta, url_prefix='/api/meta')
app.register_blueprint(oauth_pages, url_prefix='/oauth')


@app.route('/')
@app.route('/account/<path:path>')
@app.route('/settings/<path:path>')
@app.route('/admin/<path:path>')
@app.route('/oauth/<path:path>')
def get_index_page(path=''):
    return app.send_static_file('index.html')


@app.errorhandler(404)
def page_not_found(error):
    for mime in request.accept_mimetypes:
        if mime[0] == 'text/html':
            break
        if mime[0] == 'application/json':
            return jsonify(msg='wrong url', detail='You have accessed an unknown location'), 404
    # in case we are building the front-end
    if not os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return "Building front-end in progress", 503
    return app.send_static_file('index.html'), 404


@app.cli.command()
def create_db():
    db.create_all()


@app.cli.command()
def init_db():
    admin_config = app.config['ADMIN']
    admin_user = UserService.init_admin(**admin_config)
    admin_group = GroupService.add('admin', 'System Administrators')
    admin_user.groups.append(admin_group)
    db.session.commit()


@app.cli.command()
def drop_db():
    db.drop_all()


if __name__ == '__main__':
    app.run(host='localhost', port=8077)
