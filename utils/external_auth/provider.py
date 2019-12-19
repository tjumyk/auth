from typing import Optional, List

from flask import Flask

from error import BasicError

_providers = {}


class ExternalAuthError(BasicError):
    pass


class ExternalAuthProvider:
    def __init__(self, _id: str, name: str, description: Optional[str],
                 update_password_url: Optional[str], reset_password_url: Optional[str]):
        self.id = _id
        self.name = name
        self.description = description
        self.update_password_url = update_password_url
        self.reset_password_url = reset_password_url

    def check(self, name: str, password: str) -> bool:
        raise NotImplementedError()

    def to_dict(self) -> dict:
        return dict(id=self.id, name=self.name, description=self.description,
                    update_password_url=self.update_password_url, reset_password_url=self.reset_password_url)


def _create_provider(config: dict) -> ExternalAuthProvider:
    _type = config['type']
    if _type == 'kerberos':
        from .kerberos import KerberosAuthProvider
        return KerberosAuthProvider(config['id'], config['name'], config.get('description'),
                                    config.get('update_password_url'), config.get('reset_password_url'),
                                    config['endpoint_url'], config['default_realm'])
    else:
        raise ValueError('Unsupported external auth provider type: %s' % _type)


def init_app(app: Flask):
    for config in app.config.get('EXTERNAL_AUTH_PROVIDERS', []):
        provider = _create_provider(config)
        _providers[provider.id] = provider


def get_provider(_id: str) -> Optional[ExternalAuthProvider]:
    return _providers.get(_id)


def get_providers() -> List[ExternalAuthProvider]:
    return list(_providers.values())
