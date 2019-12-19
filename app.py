from flask import Flask, request, jsonify

from api_account import account
from api_admin import admin
from api_oauth import oauth
from models import db
from page_oauth import oauth_pages
from services.group import GroupService
from services.user import UserService
from utils import upload
from utils.external_auth import provider

app = Flask(__name__)
app.config.from_json('config.json')

db.init_app(app)
upload.init_app(app)
provider.init_app(app)

app.register_blueprint(account, url_prefix='/api/account')
app.register_blueprint(admin, url_prefix='/api/admin')
app.register_blueprint(oauth, url_prefix='/api/oauth')
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
