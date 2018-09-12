import re
from datetime import datetime, timedelta
from secrets import token_urlsafe

from sqlalchemy import func
from sqlalchemy.orm import joinedload

from error import BasicError
from models import OAuthClient, db, OAuthAuthorization, User, client_allowed_groups, user_groups


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
        if type(_id) is not int:
            raise OAuthServiceError('id must be an integer')

        return OAuthClient.query.get(_id)

    @staticmethod
    def get_all_clients():
        return OAuthClient.query.all()

    @staticmethod
    def get_clients_for_user(user: User):
        if user is None:
            raise OAuthServiceError('user is required')

        group_allowed_clients = db.session.query(OAuthClient.id.label('client_id')) \
            .filter(client_allowed_groups.c.client_id == OAuthClient.id,
                    client_allowed_groups.c.group_id == user_groups.c.group_id,
                    user_groups.c.user_id == user.id)
        public_clients = db.session.query(OAuthClient.id.label('client_id')) \
            .filter(OAuthClient.is_public == True)
        all_client_ids = group_allowed_clients.union(public_clients).subquery()
        return db.session.query(OAuthClient) \
            .filter(OAuthClient.id == all_client_ids.c.client_id) \
            .order_by(OAuthClient.id) \
            .all()

    @staticmethod
    def add_client(name, redirect_url, home_url, description):
        if not name:
            raise OAuthServiceError('name is required')
        if not redirect_url:
            raise OAuthServiceError('redirect_url is required')
        if not home_url:
            raise OAuthServiceError('home_url is required')
        secret = token_urlsafe()

        if not OAuthService.client_name_pattern.match(name):
            raise OAuthServiceError('invalid name format')
        if len(redirect_url) > OAuthService.client_url_max_length:
            raise OAuthServiceError('redirect_url too long')
        if len(home_url) > OAuthService.client_url_max_length:
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
                if not value:
                    raise OAuthServiceError('redirect_url is required')
                if len(value) > OAuthService.client_url_max_length:
                    raise OAuthServiceError('redirect_url too long')
            elif key == 'home_url':
                if not value:
                    raise OAuthServiceError('home_url is required')
                if len(value) > OAuthService.client_url_max_length:
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
    def _pre_check_client(client, redirect_url):
        if client is None:
            raise OAuthServiceError('client is required')
        if redirect_url is None:
            raise OAuthServiceError('redirect_url is required')

        if client.redirect_url != redirect_url:
            raise OAuthServiceError('redirect_url mismatch')

    @staticmethod
    def start_authorization(client, user, redirect_url):
        if client is None:
            raise OAuthServiceError('client is required')
        if user is None:
            raise OAuthServiceError('user is required')
        if redirect_url is None:
            raise OAuthServiceError('redirect_url is required')

        OAuthService._pre_check_client(client, redirect_url)
        OAuthService._check_user_eligibility(client, user)

        authorize_token = None
        for _ in range(OAuthService.token_generation_retry):  # repeat in case token collision
            token = token_urlsafe()
            if db.session.query(func.count()).filter(OAuthAuthorization.authorize_token == token).scalar() == 0:
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

        OAuthService._pre_check_client(client, redirect_url)

        if client.secret != client_secret:
            raise OAuthServiceError('wrong client secret')

        auth = OAuthAuthorization.query.filter_by(client_id=client.id, authorize_token=authorize_token).first()
        if auth is None:
            raise OAuthServiceError('invalid authorization token')
        if auth.authorize_token_expire_at < datetime.utcnow():
            raise OAuthServiceError('authorization token expired')

        OAuthService._check_user_eligibility(client, auth.user)

        access_token = None
        for _ in range(OAuthService.token_generation_retry):  # repeat in case token collision
            token = token_urlsafe()
            if db.session.query(func.count()).filter(OAuthAuthorization.access_token == token).scalar() == 0:
                access_token = token
                break
        if access_token is None:
            raise OAuthServiceError('token space almost exhausted')

        auth.access_token = access_token
        auth.authorize_token = None
        auth.authorize_token_expire_at = None
        return access_token

    @staticmethod
    def verify_access_token(access_token):
        if access_token is None:
            raise OAuthServiceError('access_token is required')
        if len(access_token) == 0:
            raise OAuthServiceError('access_token can not be empty')

        auth = OAuthAuthorization.query.filter_by(access_token=access_token).options(joinedload('client')).first()
        if auth is None:
            raise OAuthServiceError('invalid access_token')

        OAuthService._check_user_eligibility(auth.client, auth.user)

        return auth

    @staticmethod
    def _check_user_eligibility(client: OAuthClient, user: User):
        if user is None:
            raise OAuthServiceError('user is required')

        if not user.is_active:
            raise OAuthServiceError('inactive user')

        if not client.is_public:  # check if user is in a group among the client's allowed_groups
            access_group_found = False
            for group_allowed in client.allowed_groups:
                for group in user.groups:
                    if group.id == group_allowed.id:
                        access_group_found = True
                        break
                if access_group_found:
                    break
            if not access_group_found:
                raise OAuthServiceError('permission denied')

    @staticmethod
    def clear_user_tokens(user):
        if user is None:
            raise OAuthServiceError('user is required')
        for auth in OAuthAuthorization.query.with_parent(user):
            auth.authorize_token = None
            auth.authorize_token_expire_at = None
            auth.access_token = None
