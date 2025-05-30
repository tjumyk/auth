import json
import os
import re

import click
from flask import Flask, request, jsonify, send_from_directory

from api_account import account
from api_admin import admin
from api_meta import meta
from api_oauth import oauth
from models import db
from page_oauth import oauth_pages
from services.group import GroupService
from services.oauth import OAuthService
from services.user import UserService
from utils import upload
from utils.external_auth import provider
from utils.ip import get_geo_country


class MyFlask(Flask):
    _hashed_static_file_pattern = re.compile(r'^.+\.[a-z0-9]{20}\.\w+$')
    _hashed_static_file_cache_timeout = 365 * 24 * 60 * 60  # 1 year
    _index_page_cache_timeout = 5 * 60  # 5 minutes

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.add_url_rule(
            self.static_url_path + '_<string:region>/<path:filename>',
            endpoint='region_static',
            view_func=self.send_region_static_file
        )

    def send_static_file(self, filename):
        return self.send_region_static_file(filename, None)

    def send_region_static_file(self, filename, region):
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

        static_folder = self.get_region_static_folder(region)
        return send_from_directory(static_folder, filename, max_age=cache_timeout)

    def get_region_static_folder(self, region):
        if region:  # use the static folder for this region
            static_folder = '%s_%s' % (self.static_folder, region)
        else:  # use default static folder
            static_folder = self.static_folder
        return static_folder

    def get_request_region(self):
        detect_regions = self.config.get('DETECT_REQUEST_REGIONS')
        if detect_regions:
            if self.config['SITE'].get('behind_proxy'):
                ip = request.environ.get('HTTP_X_REAL_IP') or request.remote_addr
            else:
                ip = request.remote_addr
            country = get_geo_country(ip)
            if country:
                country_code = country.country.iso_code.lower()
                if country_code in detect_regions:
                    return country_code
        return None


app = MyFlask(__name__)
with open('config.json') as _f_cfg:
    app.config.from_mapping(json.load(_f_cfg))

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
    region = app.get_request_region()
    return app.send_region_static_file('index.html', region)


@app.errorhandler(404)
def page_not_found(error):
    for mime in request.accept_mimetypes:
        if mime[0] == 'text/html':
            break
        if mime[0] == 'application/json':
            return jsonify(msg='wrong url', detail='You have accessed an unknown location'), 404

    region = app.get_request_region()
    # in case we are building the front-end
    if not os.path.exists(os.path.join(app.get_region_static_folder(region), 'index.html')):
        return "Building front-end in progress", 503
    return app.send_region_static_file('index.html', region), 404


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


@app.cli.command()
@click.argument('client_id', type=int)
@click.argument('client_new_name')
def rename_client(client_id: int, client_new_name):
    with app.test_request_context():
        client = OAuthService.get_client(client_id)
        if client is None:
            raise RuntimeError('client not found')
        client.name = client_new_name
        db.session.commit()
        print(str(client))


if __name__ == '__main__':
    app.run(host='localhost', port=8077)
