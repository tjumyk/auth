import os
import tempfile
from uuid import uuid4

from PIL import Image
from flask import current_app as app, send_from_directory, request, jsonify

from error import BasicError


class UploadError(BasicError):
    pass


def get_upload(path):
    source_root = app.config['UPLOAD']['root_folder']
    size_param = request.args.get('size')
    if size_param:
        try:
            size = int(size_param)
            prefix, ext = os.path.splitext(path)
            thumbnail_root = os.path.join(tempfile.gettempdir(), 'idm_thumbnails')
            thumbnail_path = '%s_s%d%s' % (prefix, size, ext)
            thumbnail_path_full = os.path.join(thumbnail_root, thumbnail_path)
            if not os.path.exists(thumbnail_path_full):
                source_path_full = os.path.join(source_root, path)
                im = Image.open(source_path_full)
                im.thumbnail((size, size))
                thumbnail_folder_full = os.path.dirname(thumbnail_path_full)
                if not os.path.exists(thumbnail_folder_full):
                    os.makedirs(thumbnail_folder_full)
                im.save(thumbnail_path_full)
            return send_from_directory(thumbnail_root, thumbnail_path)
        except ValueError:
            return jsonify(msg='invalid thumbnail parameter'), 400
        except IOError as e:
            return jsonify(msg='failed to create thumbnail', detail=str(e)), 500
    return send_from_directory(source_root, path)


def init_app(app):
    app.add_url_rule('/upload/<path:path>', None, get_upload)


def handle_upload(file, _type, image_check=False, image_check_squared=False):
    cfg = app.config['UPLOAD']
    upload_config = cfg[_type]
    name = os.path.basename(file.filename)
    _, ext = os.path.splitext(name)
    if ext:
        ext = ext[1:]  # remove dot
        ext = ext.lower()  # normalize to lower case
    if ext not in upload_config['accept_ext']:
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

    if image_check:
        try:
            with Image.open(save_path) as im:
                image_size = im.size
        except IOError:
            os.unlink(save_path)
            raise UploadError('invalid image file')
        if image_check_squared:
            if image_size[0] != image_size[1]:
                os.unlink(save_path)
                raise UploadError('image is not squared')

    url = '/'.join(['upload', sub_folder, save_file])
    return url


def handle_post_upload(old_url, _type):
    parts = old_url.split('/')
    if len(parts) != 3:
        return
    root, sub_folder, file = parts
    if root != 'upload' or sub_folder != _type:
        return

    upload_root = app.config['UPLOAD']['root_folder']
    old_path = os.path.join(upload_root, sub_folder, file)
    if os.path.isfile(old_path):
        os.unlink(old_path)
