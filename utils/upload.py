import os
from uuid import uuid4

from flask import current_app as app, send_from_directory

from error import BasicError


class UploadError(BasicError):
    pass


def get_upload(path):
    return send_from_directory(app.config['UPLOAD']['root_folder'], path)


def init_app(app):
    app.add_url_rule('/upload/<path:path>', None, get_upload)


def handle_upload(file, _type):
    cfg = app.config['UPLOAD']
    upload_config = cfg[_type]
    name = os.path.basename(file.filename)
    _, ext = os.path.splitext(name)
    if ext:
        ext = ext[1:]  # remove dot
    if ext.lower() not in upload_config['accept_ext']:
        raise UploadError('invalid file extension')

    save_file = None
    for _ in range(5):
        _file = "%s.%s" % (str(uuid4()), ext)
        if not os.path.lexists(_file):
            save_file = _file
            break
    if save_file is None:
        raise UploadError('file name space almost exhausted')
    upload_root = cfg['root_folder']
    sub_folder = _type
    save_folder = os.path.join(upload_root, sub_folder)
    if not os.path.isdir(save_folder):
        os.makedirs(save_folder)
    save_path = os.path.join(save_folder, save_file)
    file.save(save_path)

    if os.stat(save_path).st_size > upload_config['size_limit']:
        os.unlink(save_path)
        raise UploadError('file size too big')

    url = '/'.join(['upload', sub_folder, save_file])
    return url


def handle_post_upload(old_url, _type):
    parts = old_url.split('/', 1)
    if parts[0] != 'upload':
        return

    old_file = parts[-1]
    upload_root = app.config['UPLOAD']['root_folder']
    sub_folder = _type
    old_path = os.path.join(upload_root, sub_folder, old_file)
    if os.path.isfile(old_path):
        os.unlink(old_path)
