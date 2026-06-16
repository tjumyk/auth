import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import inspect

from models import OAuthClient, db
from services.oauth import OAuthService, OAuthServiceError


@dataclass(frozen=True)
class OAuthClientImportSpec:
    name: str
    redirect_url: str
    home_url: str
    description: str | None = None
    secret: str | None = None
    is_public: bool = True


def _parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {'1', 'true', 't', 'yes', 'y', 'on'}:
        return True
    if normalized in {'0', 'false', 'f', 'no', 'n', 'off'}:
        return False
    raise OAuthServiceError(f'invalid boolean value: {value}')


def _parse_client_entry(raw: Any, index: int) -> OAuthClientImportSpec:
    if not isinstance(raw, dict):
        raise OAuthServiceError(f'client #{index} must be an object')

    name = raw.get('name')
    redirect_url = raw.get('redirect_url')
    home_url = raw.get('home_url')
    if not isinstance(name, str) or not name:
        raise OAuthServiceError(f'client #{index} name is required')
    if not isinstance(redirect_url, str) or not redirect_url:
        raise OAuthServiceError(f'client #{index} redirect_url is required')
    if not isinstance(home_url, str) or not home_url:
        raise OAuthServiceError(f'client #{index} home_url is required')

    description = raw.get('description')
    if description is not None and not isinstance(description, str):
        raise OAuthServiceError(f'client #{index} description must be a string')

    secret = raw.get('secret')
    if secret is not None and not isinstance(secret, str):
        raise OAuthServiceError(f'client #{index} secret must be a string')

    is_public = raw.get('is_public', True)
    if not isinstance(is_public, bool):
        raise OAuthServiceError(f'client #{index} is_public must be a boolean')

    return OAuthClientImportSpec(
        name=name,
        redirect_url=redirect_url,
        home_url=home_url,
        description=description,
        secret=secret,
        is_public=is_public,
    )


def parse_oauth_clients_file(path: str | Path) -> list[OAuthClientImportSpec]:
    file_path = Path(path)
    with file_path.open(encoding='utf-8') as handle:
        payload = json.load(handle)

    if not isinstance(payload, list):
        raise OAuthServiceError('OAuth clients file must contain a JSON array')

    return [_parse_client_entry(entry, index) for index, entry in enumerate(payload)]


def parse_oauth_client_from_env() -> OAuthClientImportSpec | None:
    name = os.environ.get('OAUTH_CLIENT_NAME')
    if not name:
        return None

    redirect_url = os.environ.get('OAUTH_CLIENT_REDIRECT_URL')
    home_url = os.environ.get('OAUTH_CLIENT_HOME_URL')
    if not redirect_url:
        raise OAuthServiceError('OAUTH_CLIENT_REDIRECT_URL is required when OAUTH_CLIENT_NAME is set')
    if not home_url:
        raise OAuthServiceError('OAUTH_CLIENT_HOME_URL is required when OAUTH_CLIENT_NAME is set')

    description = os.environ.get('OAUTH_CLIENT_DESCRIPTION')
    secret = os.environ.get('OAUTH_CLIENT_SECRET')
    is_public_raw = os.environ.get('OAUTH_CLIENT_IS_PUBLIC')
    is_public = _parse_bool(is_public_raw) if is_public_raw is not None else True

    return OAuthClientImportSpec(
        name=name,
        redirect_url=redirect_url,
        home_url=home_url,
        description=description,
        secret=secret,
        is_public=is_public,
    )


def oauth_client_table_exists() -> bool:
    inspector = inspect(db.engine)
    return OAuthClient.__tablename__ in inspector.get_table_names()


def import_oauth_clients(specs: list[OAuthClientImportSpec]) -> list[tuple[OAuthClient, bool]]:
    results: list[tuple[OAuthClient, bool]] = []
    for spec in specs:
        existing = OAuthClient.query.filter_by(name=spec.name).first()
        if existing is not None:
            results.append((existing, False))
            continue

        client = OAuthService.import_client(
            name=spec.name,
            redirect_url=spec.redirect_url,
            home_url=spec.home_url,
            description=spec.description,
            secret=spec.secret,
            is_public=spec.is_public,
        )
        results.append((client, True))
    return results


def import_oauth_clients_from_file(path: str | Path) -> list[tuple[OAuthClient, bool]]:
    specs = parse_oauth_clients_file(path)
    if not specs:
        return []
    if not oauth_client_table_exists():
        raise OAuthServiceError(
            'oauth_client table not found',
            'Run database migrations before importing OAuth clients',
        )
    return import_oauth_clients(specs)


def import_oauth_client_from_env() -> list[tuple[OAuthClient, bool]]:
    spec = parse_oauth_client_from_env()
    if spec is None:
        return []
    if not oauth_client_table_exists():
        raise OAuthServiceError(
            'oauth_client table not found',
            'Run database migrations before importing OAuth clients',
        )
    return import_oauth_clients([spec])
