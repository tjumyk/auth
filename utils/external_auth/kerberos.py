from typing import Optional

import kerberos

from utils.external_auth.provider import ExternalAuthProvider, ExternalAuthError


class KerberosAuthProvider(ExternalAuthProvider):
    def __init__(self, _id: str, name: str, description: Optional[str],
                 update_password_url: Optional[str], reset_password_url: Optional[str],
                 endpoint_url: str, default_realm: str):
        super().__init__(_id, name, description, update_password_url, reset_password_url)
        self.endpoint_url = endpoint_url
        self.default_realm = default_realm

    def check(self, name: str, password: str) -> bool:
        try:
            return kerberos.checkPassword(name, password, self.endpoint_url, self.default_realm)
        except Exception as e:
            raise ExternalAuthError('External authentication failed', str(e)) from e

    def to_dict(self) -> dict:
        return super().to_dict()
