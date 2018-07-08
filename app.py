from flask import Flask, request, jsonify

from api_account import account
from api_admin import admin
from api_oauth import oauth
from api_open_account import open_account
from models import db
from utils import upload

app = Flask(__name__)
app.config.from_json('config.json')

db.init_app(app)
upload.init_app(app)

app.register_blueprint(account, url_prefix='/api/account')
app.register_blueprint(admin, url_prefix='/api/admin')
app.register_blueprint(oauth, url_prefix='/api/oauth')
app.register_blueprint(open_account, url_prefix='/api/open/account')


@app.route('/')
@app.route('/account/<path:path>')
@app.route('/admin/<path:path>')
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
def init_db():
    db.create_all()


if __name__ == '__main__':
    app.run(host='localhost', port=8077)
