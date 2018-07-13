import re
from datetime import datetime, timedelta
from secrets import token_urlsafe

from error import BasicError
from models import OAuthClient, db, OAuthAuthorization


class OAuthServiceError(BasicError):
    pass


class OAuthService:
    client_name_pattern = re.compile('^[\w]{3,16}$')
    client_url_max_length = 128
    client_description_max_length = 256
    token_generation_retry = 5

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
        old_values = {field: getattr(client, field) for field in kwargs}

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
            setattr(client, key, value)
        return old_values

    @staticmethod
    def regenerate_client_secret(client):
        if client is None:
            raise OAuthServiceError('client is required')

        client.secret = token_urlsafe()

    @staticmethod
    def pre_check_client(client, redirect_url):
        if client is None:
            raise OAuthServiceError('client is required')
        if redirect_url is None:
            raise OAuthServiceError('redirect_url is required')

        if client.redirect_url != redirect_url:
            raise OAuthServiceError('redirect_url mismatch')

    @staticmethod
    def has_access_token(client, user):
        if client is None:
            raise OAuthServiceError('client is required')
        if user is None:
            raise OAuthServiceError('user is required')

        return OAuthAuthorization.query.filter_by(client_id=client.id, user_id=user.id).count() > 0

    @staticmethod
    def start_authorization(client, user, redirect_url):
        if client is None:
            raise OAuthServiceError('client is required')
        if user is None:
            raise OAuthServiceError('user is required')
        if redirect_url is None:
            raise OAuthServiceError('redirect_url is required')

        OAuthService.pre_check_client(client, redirect_url)

        authorize_token = None
        for _ in range(OAuthService.token_generation_retry):  # repeat in case token collision
            token = token_urlsafe()
            if OAuthAuthorization.query.filter_by(authorize_token=token).count() == 0:
                authorize_token = token
                break
        if authorize_token is None:
            raise OAuthServiceError('token space almost exhausted')

        expire = datetime.utcnow() + timedelta(minutes=1)

        auth = OAuthAuthorization.query.filter_by(client_id=client.id, user_id=user.id).first()
        if auth is None:
            auth = OAuthAuthorization(client_id=client.id, user_id=user.id,
                                      authorize_token=authorize_token, authorize_token_expire_at=expire)
            db.session.add(auth)
        else:
            auth.authorize_token = authorize_token
            auth.authorize_token_expire_at = expire
        return authorize_token

    @staticmethod
    def get_access_token(client, client_secret, redirect_url, authorize_token):
        if client is None:
            raise OAuthServiceError('client is required')
        if client_secret is None:
            raise OAuthServiceError('client secret is required')
        if redirect_url is None:
            raise OAuthServiceError('redirect_url is required')
        if authorize_token is None:
            raise OAuthServiceError('authorization token is required')

        OAuthService.pre_check_client(client, redirect_url)

        if client.secret != client_secret:
            raise OAuthServiceError('wrong client secret')

        auth = OAuthAuthorization.query.filter_by(client_id=client.id, authorize_token=authorize_token).first()
        if auth is None:
            raise OAuthServiceError('invalid authorization token')
        if auth.authorize_token_expire_at < datetime.utcnow():
            raise OAuthServiceError('authorization token expired')

        access_token = None
        for _ in range(OAuthService.token_generation_retry):  # repeat in case token collision
            token = token_urlsafe()
            if OAuthAuthorization.query.filter_by(access_token=token).count() == 0:
                access_token = token
                break
        if access_token is None:
            raise OAuthServiceError('token space almost exhausted')

        auth.access_token = access_token
        return access_token

    @staticmethod
    def verify_access_token(access_token):
        if access_token is None:
            raise OAuthServiceError('access_token is required')

        auth = OAuthAuthorization.query.filter_by(access_token=access_token).first()
        if auth is None:
            raise OAuthServiceError('invalid access_token')
        return auth
