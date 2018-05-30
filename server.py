import json
import uuid

from threading import Lock

from flask import Flask, request, render_template, redirect
from passlib.apache import HtpasswdFile

app = Flask(__name__)
with open('config.json') as _f:
    config = json.load(_f)

ht = HtpasswdFile(config['htpasswd']['path'], default_scheme=config['htpasswd']['scheme'])
ht_lock = Lock()

reset_keys = {}


@app.route('/')
def index():
    return render_template('msg.html', content='You are not authorized to view this page!', color='red'), 401


@app.route('/reset', methods=['GET', 'POST'])
def reset_pass_form():
    key = request.args.get('key')
    if key is None:
        return render_template('msg.html', content='You are not authorized to view this page!', color='red'), 401
    target = reset_keys.get(key)
    if target is None:
        return render_template('msg.html', content='Your key is invalid or has been used!', color='red'), 403

    if request.method == 'GET':
        return render_template('reset.html', username=target['username'])
    else:
        form = request.form
        new_pass = form.get('password')
        if new_pass != form.get('password_repeat'):
            return render_template('msg.html', content='Two passwords do not match!', color='red'), 400
        with ht_lock:
            ht.set_password(target['username'], new_pass)
            ht.save()
        del reset_keys[key]
        return render_template('msg.html', content='Password Reset Succeeded!', color='green')


@app.route('/add_reset', methods=['GET', 'POST'])
def add_reset_form():
    if request.method == 'GET':
        return app.send_static_file('add_reset.html')
    else:
        form = request.form
        if form.get('admin_name') != config['admin']['name'] or \
                form.get('admin_password') != config['admin']['password']:
            return render_template('msg.html', content='You are not admin!', color='red'), 403
        new_username = form.get('username')
        if not new_username:
            return render_template('msg.html', content='User name not provided!', color='red'), 400
        new_key = str(uuid.uuid4())
        reset_keys[new_key] = {
            "username": new_username
        }
        return redirect('reset?key=%s' % new_key)


if __name__ == '__main__':
    app.run(**config['server'])
