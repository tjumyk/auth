import json
import os
import re
import subprocess
import sys
from typing import Any, Callable

import click
from flask import Flask, request, jsonify, send_from_directory

from api_account import account
from api_admin import admin
from api_meta import meta
from api_oauth import oauth
from models import db
from page_oauth import oauth_pages
from services.group import GroupService
from services.oauth import OAuthService, OAuthServiceError
from services.oauth_bootstrap import (
    import_oauth_client_from_env,
    import_oauth_clients_from_file,
    parse_oauth_clients_file,
)
from services.user import UserService
from utils import upload
from utils.external_auth import provider
from utils.ip import get_geo_country
from utils.request_client import get_client_ip


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
        # fix media issue with angular 21 builder, but no regional support
        self.add_url_rule(
            '/media/<path:filename>',
            endpoint='static_media',
            view_func=self.send_static_media_file
        )

    def send_static_file(self, filename):
        return self.send_region_static_file(filename, None)

    def send_static_media_file(self, filename):
        return self.send_region_static_file(os.path.join('media', filename), None)

    def send_region_static_file(self, filename, region):
        """Identify hashed static files and send them with a longer cache timeout.
        For 'index.html', send it with a short cache timeout.
        For other static files, the default cache timeout is used.
        """
        if not self.has_static_folder:
            raise RuntimeError('No static folder for this object')
        if filename.endswith('index.html'):
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
            ip = get_client_ip(behind_proxy=bool(self.config['SITE'].get('behind_proxy')))
            country = get_geo_country(ip)
            if country:
                country_code = country.country.iso_code.lower()
                if country_code in detect_regions:
                    return country_code
        return None


_STATIC_ROOT_PATH = 'static/browser'  # for newer angular setup
_STATIC_INDEX_HTML_PATH = 'index.html'
_STATIC_URL_PATH = '/static'


def _parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {'1', 'true', 't', 'yes', 'y', 'on'}:
        return True
    if normalized in {'0', 'false', 'f', 'no', 'n', 'off'}:
        return False
    raise ValueError(f'Invalid boolean value: {value}')


def _set_nested_config(config: dict[str, Any], path: tuple[str, ...], value: Any) -> None:
    target: dict[str, Any] = config
    for key in path[:-1]:
        nested = target.get(key)
        if not isinstance(nested, dict):
            nested = {}
            target[key] = nested
        target = nested
    target[path[-1]] = value


def _get_env_override(env_names: tuple[str, ...]) -> str | None:
    for env_name in env_names:
        env_value = os.environ.get(env_name)
        if env_value is not None:
            return env_value
    return None


def _load_config_with_env_overrides(config_path: str) -> dict[str, Any]:
    with open(config_path) as f_cfg:
        config: dict[str, Any] = json.load(f_cfg)

    override_specs: list[tuple[tuple[str, ...], tuple[str, ...], Callable[[str], Any]]] = [
        (('SECRET_KEY',), ('SECRET_KEY',), str),
        (('SQLALCHEMY_DATABASE_URI',), ('DB_URL', 'SQLALCHEMY_DATABASE_URI'), str),
        (('SITE', 'root_url'), ('SITE_ROOT_URL',), str),
        (('SITE', 'base_url'), ('SITE_BASE_URL',), str),
        (('SITE', 'behind_proxy'), ('SITE_BEHIND_PROXY',), _parse_bool),
        (('SITE', 'name'), ('SITE_NAME',), str),
        (('SITE', 'organization_name'), ('SITE_ORGANIZATION_NAME',), str),
        (('SITE', 'group_name'), ('SITE_GROUP_NAME',), str),
        (('SITE', 'copyright'), ('SITE_COPYRIGHT',), str),
        (('ADMIN', 'name'), ('ADMIN_NAME',), str),
        (('ADMIN', 'email'), ('ADMIN_EMAIL',), str),
        (('ADMIN', 'password'), ('ADMIN_PASSWORD',), str),
        (('MAIL', 'enabled'), ('MAIL_ENABLED',), _parse_bool),
        (('MAIL', 'from'), ('MAIL_FROM',), str),
        (('MAIL', 'display_name'), ('MAIL_DISPLAY_NAME',), str),
        (('MAIL', 'reply_to'), ('MAIL_REPLY_TO',), str),
        (('MAIL', 'reply_to_name'), ('MAIL_REPLY_TO_NAME',), str),
        (('UPLOAD', 'root_folder'), ('UPLOAD_ROOT_FOLDER',), str),
        (('DEBUG',), ('FLASK_DEBUG',), _parse_bool),
        (('CAPTCHA', 'enabled'), ('CAPTCHA_ENABLED',), _parse_bool),
        (('CAPTCHA', 'service_url'), ('CAPTCHA_SERVICE_URL',), str),
        (('CAPTCHA', 'secret'), ('CAPTCHA_SECRET',), str),
    ]
    for config_path_keys, env_names, parser in override_specs:
        env_value = _get_env_override(env_names)
        if env_value is None:
            continue
        _set_nested_config(config, config_path_keys, parser(env_value))

    if _get_env_override(('MAIL_SMTP_HOST',)):
        mail_cfg = config.get('MAIL')
        if isinstance(mail_cfg, dict):
            mail_cfg.pop('mail_catcher', None)

    return config


app = MyFlask(__name__, static_folder=_STATIC_ROOT_PATH, static_url_path=_STATIC_URL_PATH)
app.config.from_mapping(_load_config_with_env_overrides('config.json'))

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
    return app.send_region_static_file(_STATIC_INDEX_HTML_PATH, region)


@app.errorhandler(404)
def page_not_found(error):
    for mime in request.accept_mimetypes:
        if mime[0] == 'text/html':
            break
        if mime[0] == 'application/json':
            return jsonify(msg='wrong url', detail='You have accessed an unknown location'), 404

    region = app.get_request_region()
    # in case we are building the front-end
    if not os.path.exists(os.path.join(app.get_region_static_folder(region), _STATIC_INDEX_HTML_PATH)):
        return "Building front-end in progress", 503
    return app.send_region_static_file(_STATIC_INDEX_HTML_PATH, region), 404


@app.cli.command()
def create_db():
    """Apply Alembic migrations (alias for alembic upgrade head)."""
    result = subprocess.run(
        [sys.executable, '-m', 'alembic', 'upgrade', 'head'],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(result.returncode)


@app.cli.command()
def init_db():
    admin_config = app.config['ADMIN']
    admin_user = UserService.init_admin(**admin_config)
    admin_group = GroupService.add('admin', 'System Administrators')
    admin_user.groups.append(admin_group)
    db.session.commit()


@app.cli.command('import-oauth-clients')
@click.argument('path', type=click.Path(exists=True, dir_okay=False))
def import_oauth_clients_cmd(path: str) -> None:
    """Import OAuth clients from a JSON file (idempotent by client name)."""
    _run_oauth_client_import(lambda: import_oauth_clients_from_file(path), path=path)


@app.cli.command('import-oauth-client-from-env')
def import_oauth_client_from_env_cmd() -> None:
    """Import a single OAuth client from OAUTH_CLIENT_* environment variables."""
    _run_oauth_client_import(import_oauth_client_from_env)


def _run_oauth_client_import(
    import_fn: Callable[[], list[tuple[Any, bool]]],
    path: str | None = None,
) -> None:
    try:
        if path is not None:
            specs = parse_oauth_clients_file(path)
            if not specs:
                click.echo('No OAuth clients to import')
                return

        results = import_fn()
        if not results:
            click.echo('No OAuth client configured for import')
            return

        db.session.commit()
        for client, created in results:
            if created:
                click.echo(f'Imported OAuth client {client.name!r} (id={client.id})')
            else:
                click.echo(f'Skipped existing OAuth client {client.name!r} (id={client.id})')
    except OAuthServiceError as e:
        if e.msg == 'oauth_client table not found':
            click.echo('Skipping OAuth client import: database not initialized')
            return
        raise click.ClickException(f'{e.msg}: {e.detail}' if e.detail else e.msg) from e


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
    app.run(host='localhost', port=8077, debug=True)
