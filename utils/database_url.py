import os
from urllib.parse import quote

from flask import Flask


def resolve_database_uri(uri: str, app: Flask) -> str:
    """Resolve SQLAlchemy URI the same way Flask-SQLAlchemy does for relative SQLite paths."""
    if not uri:
        return uri

    if uri in ('sqlite://', 'sqlite:///:memory:'):
        return uri

    if uri.startswith('sqlite:///'):
        path_part = uri[len('sqlite:///'):]
        if not path_part:
            return uri
        # Absolute: sqlite:////absolute/path (four slashes on Linux)
        if path_part.startswith('/'):
            return uri
        instance_path = app.instance_path
        os.makedirs(instance_path, exist_ok=True)
        abs_path = os.path.join(instance_path, path_part)
        return 'sqlite:///' + quote(abs_path, safe='/')

    return uri
