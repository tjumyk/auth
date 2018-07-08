import re
from datetime import datetime, timedelta
from secrets import token_urlsafe

from error import BasicError
from models import OAuthClient, db, OAuthClientUser


class OAuthServiceError(BasicError):
    pass


class OAuthService:
    client_name_pattern = re.compile('^[\w]{3,16}$')
    client_url_max_length = 128
    client_description_max_length = 256

    client_profile_fields = {
        'redirect_url',
        'home_url',
        'description',
        'icon'
    }

    @staticmethod
    def get_client(_id):
        if _id is None:
            raise OAuthServiceError('id is required')

        return OAuthClient.query.get(_id)

    @staticmethod
    def get_all_clients():
        return OAuthClient.query.all()

    @staticmethod
    def add_client(name, redirect_url, home_url, description):
        if name is None:
            raise OAuthServiceError('name is required')
        if redirect_url is None:
            raise OAuthServiceError('redirect_url is required')
        secret = token_urlsafe()

        if not OAuthService.client_name_pattern.match(name):
            raise OAuthServiceError('invalid name format')
        if len(redirect_url) > OAuthService.client_url_max_length:
            raise OAuthServiceError('redirect_url too long')
        if home_url and len(home_url) > OAuthService.client_url_max_length:
            raise OAuthServiceError('home_url too long')
        if description and len(description) > OAuthService.client_description_max_length:
            raise OAuthServiceError('description too long')

        client = OAuthClient(name=name, secret=secret, redirect_url=redirect_url,
                             home_url=home_url, description=description)
        db.session.add(client)
        return client

    @staticmethod
    def update_client_profile(client, **kwargs):
        if client is None:
            raise OAuthServiceError('client is required')

        if any(key not in OAuthService.client_profile_fields for key in kwargs):
            raise OAuthServiceError('unexpected profile field')
        old_values = {field: client[field] for field in kwargs}

        for key, value in kwargs.items():
            if key == 'redirect_url':
                if value is None:
                    raise OAuthServiceError('redirect_url is required')
                if len(value) > OAuthService.client_url_max_length:
                    raise OAuthServiceError('redirect_url too long')
            elif key == 'home_url':
                if value and len(value) > OAuthService.client_url_max_length:
                    raise OAuthServiceError('home_url too long')
            elif key == 'description':
                if value and len(value) > OAuthService.client_description_max_length:
                    raise OAuthServiceError('description too long')
            client[key] = value
        return old_values

    @staticmethod
    def regenerate_client_secret(client):
        if client is None:
            raise OAuthServiceError('client is required')

        client.secret = token_urlsafe()

    @staticmethod
    def connect(client, user, redirect_url):
        if client is None:
            raise OAuthServiceError('client is required')
        if user is None:
            raise OAuthServiceError('user is required')
        if redirect_url is None:
            raise OAuthServiceError('redirect_url is required')

        if client.redirect_url != redirect_url:
            raise OAuthServiceError('redirect_url mismatch')

        authorize_token = token_urlsafe()
        expire = datetime.utcnow() + timedelta(minutes=1)

        client_user = OAuthClientUser.query.filter_by(client_id=client.id, user_id=user.id).first()
        if client_user is None:
            client_user = OAuthClientUser(client_id=client.id, user_id=user.id,
                                          authorize_token=authorize_token, authorize_token_expire_at=expire)
            db.session.add(client_user)
        else:
            client_user.authorize_token = authorize_token
            client_user.authorize_token_expire_at = expire
        return authorize_token

    @staticmethod
    def get_access_token(client, user, client_secret, redirect_url, authorize_token):
        if client is None:
            raise OAuthServiceError('client is required')
        if user is None:
            raise OAuthServiceError('user is required')
        if client_secret is None:
            raise OAuthServiceError('client_secret is required')
        if redirect_url is None:
            raise OAuthServiceError('redirect_url is required')
        if authorize_token is None:
            raise OAuthServiceError('authorize_token is required')

        if client.authorize_token_expire_at < datetime.utcnow():
            raise OAuthServiceError('authorize_token expired')
        if client.redirect_url != redirect_url:
            raise OAuthServiceError('redirect_url mismatch')
        if client.secret != client_secret:
            raise OAuthServiceError('wrong client secret')

        client_user = OAuthClientUser.query.filter_by(client_id=client.id, user_id=user.id).first()
        if client_user is None:
            raise OAuthServiceError('authorize not started')
        if client_user.authorize_token != authorize_token:
            raise OAuthServiceError('wrong authorize_token')

        access_token = None
        for _ in range(5):  # repeat 5 times in case token collision
            token = token_urlsafe()
            if OAuthClientUser.query.filter_by(access_token=token).count() == 0:
                access_token = token
                break
        if access_token is None:
            raise OAuthServiceError('token space almost exhausted')

        client_user.access_token = access_token
        return access_token

    @staticmethod
    def verify_access_token(access_token):
        if access_token is None:
            raise OAuthServiceError('access_token is required')

        client_user = OAuthClientUser.query.filter_by(access_token=access_token).first()
        if client_user is None:
            raise OAuthServiceError('invalid access_token')
        return client_user
