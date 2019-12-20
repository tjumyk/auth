import re
from datetime import timedelta, datetime
from secrets import token_urlsafe

from passlib.hash import pbkdf2_sha256
from sqlalchemy import or_, func

import utils.two_factor as two_factor
from error import BasicError
from models import db, User
from utils.external_auth.provider import get_provider, ExternalAuthError


class UserServiceError(BasicError):
    pass


class UserService:
    name_pattern = re.compile('^[\w]{3,16}$')
    nickname_pattern = re.compile('^[ \w\-]{3,16}$')
    password_pattern = re.compile('^.{8,20}$')
    email_pattern = re.compile('^.+@\w+(\.\w+)*$')
    email_max_length = 64
    email_confirm_token_valid = timedelta(days=30)
    password_reset_token_valid = timedelta(minutes=15)
    email_reconfirm_request_wait = timedelta(minutes=1)
    password_reset_request_wait = timedelta(minutes=1)
    login_recent_failures_time_span = timedelta(minutes=15)
    login_recent_failures_lock_threshold = 5
    two_factor_disable_token_valid = timedelta(minutes=15)
    two_factor_disable_token_request_wait = timedelta(minutes=1)

    profile_fields = {
        'nickname',
        'avatar'
    }

    @staticmethod
    def get(_id):
        if _id is None:
            raise UserServiceError('id is required')
        if type(_id) is not int:
            raise UserServiceError('id must be an integer')

        return User.query.get(_id)

    @staticmethod
    def get_by_id_list(id_list):
        if id_list is None:
            raise UserServiceError('id list is required')
        if not isinstance(id_list, (list, set, tuple)):
            raise UserServiceError('id list must be a list, set or tuple')
        if not id_list:  # accept empty list
            return []
        for _id in id_list:
            if type(_id) is not int:
                raise UserServiceError('id must be an integer')

        return User.query.filter(User.id.in_(id_list)).all()

    @staticmethod
    def get_by_name(name):
        if name is None:
            raise UserServiceError('name is required')
        return User.query.filter_by(name=name).first()

    @staticmethod
    def get_by_email(email):
        if email is None:
            raise UserServiceError('email is required')
        return User.query.filter_by(email=email).first()

    @staticmethod
    def get_by_role(role):
        if role is None:
            raise UserServiceError('role is required')

        return User.query.with_parent(role).all()

    @staticmethod
    def get_all():
        return User.query.all()

    @staticmethod
    def search_by_name(name, limit=5):
        if name is None:
            raise UserServiceError('name is required')
        if len(name) == 0:
            raise UserServiceError('name must not be empty')

        _filter = or_(User.name.contains(name), User.nickname.contains(name))
        if limit is None:
            return User.query.filter(_filter).all()
        else:
            if type(limit) is not int:
                raise UserServiceError('limit must be an integer')
            return User.query.filter(_filter).limit(limit)

    @staticmethod
    def login(name_or_email, password, ip, user_agent):
        if name_or_email is None:
            raise UserServiceError('name or email is required')
        if password is None:
            raise UserServiceError('password is required')

        if '@' in name_or_email:
            user = User.query.filter_by(email=name_or_email).first()
        else:
            user = User.query.filter_by(name=name_or_email).first()
        if user is None:
            return None

        UserService.check_login_recent_failures(user)

        error = None
        error_detail = None
        if not user.is_active:
            error = 'inactive user'
        elif not user.is_email_confirmed:
            error = 'email not confirmed'
            error_detail = 'Please find the E-mail Confirmation letter in your mailbox and click the link in the ' \
                           'letter to confirm your E-mail address. If you want us to resend the letter, please click ' \
                           'the "Re-confirm E-mail" link below.'
        else:
            if user.external_auth_provider_id is not None:
                auth_provider = get_provider(user.external_auth_provider_id)
                if auth_provider is None:
                    error = 'unknown auth provider'
                    error_detail = 'Unknown external auth provider: %s' % user.external_auth_provider_id
                else:
                    try:
                        if not user.external_auth_enforced:
                            if not pbkdf2_sha256.verify(password, user.password):  # try local password first
                                if not auth_provider.check(user.name, password):  # then try external auth
                                    error = 'wrong password'
                                    error_detail = 'Both the local password and the external password (%s) of this ' \
                                                   'account failed to match your input. If you forgot your password, ' \
                                                   'please click the "Reset Password" link below.' % auth_provider.name
                        elif not auth_provider.check(user.name, password):  # try external auth only
                            error = 'wrong password'
                            error_detail = 'Please make sure that you are using your current password (%s). ' \
                                           'If you forgot your password, please click the "Reset Password" ' \
                                           'link below.' \
                                           % auth_provider.name
                    except ExternalAuthError as e:
                        error = 'external auth error'
                        error_detail = e.msg
                        if e.detail:
                            error_detail += ': ' + e.detail
            elif not pbkdf2_sha256.verify(password, user.password):
                error = 'wrong password'
                error_detail = 'Please use the password that you set during the E-mail ' \
                               'confirmation. If you forgot your password, please click the "Reset ' \
                               'Password" link below.'

        # two-factor authentication
        if error is None and user.is_two_factor_enabled:  # skip adding 'success' login record
            return user

        from .login_record import LoginRecordService
        LoginRecordService.add(user, ip, user_agent.string, error is None, error)
        db.session.commit()  # force commit, a little bit ugly

        if error is not None:
            raise UserServiceError(error, detail=error_detail)
        return user

    @staticmethod
    def two_factor_login(user: User, token, ip, user_agent):
        if user is None:
            raise UserServiceError('user is required')
        if token is None:
            raise UserServiceError('token is required')

        UserService.check_login_recent_failures(user)

        error = None
        error_source = None
        # duplicate user status checks to ensure safety
        if not user.is_active:
            error = 'inactive user'
        elif not user.is_email_confirmed:
            error = 'email not confirmed'
        elif not user.is_two_factor_enabled:
            error = 'two-factor authentication is not enabled'
        else:
            try:
                two_factor.verify(user, token)
            except two_factor.TwoFactorError as e:
                error = 'two-factor: %s' % e.msg
                error_source = e

        from .login_record import LoginRecordService
        LoginRecordService.add(user, ip, user_agent.string, error is None, error)
        db.session.commit()  # force commit, a little bit ugly

        if error is not None:
            if error_source is not None:
                raise UserServiceError(msg=error_source.msg, detail=error_source.detail)
            else:
                raise UserServiceError(error)

    @staticmethod
    def check_login_recent_failures(user):
        from .login_record import LoginRecordService
        recent_failures_time_span = UserService.login_recent_failures_time_span
        if LoginRecordService.count_recent_failures_for_user(user, recent_failures_time_span) >= \
                UserService.login_recent_failures_lock_threshold:
            recent_failures_minutes = round(recent_failures_time_span.total_seconds() / 60)
            raise UserServiceError('too many recent failures', 'Please wait for at most %d minutes and then try again'
                                   % recent_failures_minutes)

    @staticmethod
    def invite(name, email, external_auth_provider_id: str = None, skip_email_confirmation: bool = False):
        if name is None:
            raise UserServiceError('name is required')
        if email is None:
            raise UserServiceError('email is required')

        if not UserService.name_pattern.match(name):
            raise UserServiceError('invalid name format')
        if not UserService.email_pattern.match(email):
            raise UserServiceError('invalid email format')
        if len(email) > UserService.email_max_length:
            raise UserServiceError('email too long')

        if external_auth_provider_id:
            external_auth_enforced = True  # enforce external auth when external auth provider provided
            provider = get_provider(external_auth_provider_id)
            if provider is None:
                raise UserServiceError('provider not found')
        else:
            external_auth_enforced = False
            if skip_email_confirmation:
                raise UserServiceError('cannot skip email confirmation',
                                       'Skipping email confirmation is not allowed when no external auth provider is '
                                       'selected.')

        if db.session.query(func.count()).filter(User.name == name).scalar():
            raise UserServiceError('duplicate name')
        if db.session.query(func.count()).filter(User.email == email).scalar():
            raise UserServiceError('duplicate email')

        password = pbkdf2_sha256.hash(token_urlsafe(12))  # dummy initial password
        user_args = dict(name=name, password=password, email=email,
                         external_auth_provider_id=external_auth_provider_id,
                         external_auth_enforced=external_auth_enforced)
        if skip_email_confirmation:
            user_args['is_email_confirmed'] = True
            user_args['email_confirmed_at'] = datetime.utcnow()
        else:
            user_args['is_email_confirmed'] = False
            user_args['email_confirm_token'] = token_urlsafe()
            user_args['email_confirm_token_expire_at'] = datetime.utcnow() + UserService.email_confirm_token_valid
        user = User(**user_args)
        db.session.add(user)
        return user

    @staticmethod
    def init_admin(name, password, email):
        if name is None:
            raise UserServiceError('name is required')
        if password is None:
            raise UserServiceError('password is required')
        if email is None:
            raise UserServiceError('email is required')

        if not UserService.name_pattern.match(name):
            raise UserServiceError('invalid name format')
        if not UserService.email_pattern.match(email):
            raise UserServiceError('invalid email format')
        if len(email) > UserService.email_max_length:
            raise UserServiceError('email too long')
        if not UserService.password_pattern.match(password):
            raise UserServiceError('invalid password format')
        if db.session.query(func.count()).filter(User.name == name).scalar():
            raise UserServiceError('duplicate name')
        if db.session.query(func.count()).filter(User.email == email).scalar():
            raise UserServiceError('duplicate email')

        password_hash = pbkdf2_sha256.hash(password)
        user = User(name=name, password=password_hash, email=email,
                    is_email_confirmed=True, email_confirmed_at=datetime.utcnow())
        db.session.add(user)
        return user

    @staticmethod
    def request_reconfirm_email(name_or_email):
        if name_or_email is None:
            raise UserServiceError('name or email is required')

        if '@' in name_or_email:
            user = User.query.filter_by(email=name_or_email).first()
        else:
            user = User.query.filter_by(name=name_or_email).first()
        if user is None:
            raise UserServiceError('user not found')
        if not user.is_active:
            raise UserServiceError('inactive user')
        if user.email is None:
            raise UserServiceError('no email')
        if user.is_email_confirmed:
            raise UserServiceError('email already confirmed')

        if user.email_confirm_token_expire_at is not None:  # check if requested too frequently
            wait = user.email_confirm_token_expire_at - UserService.email_confirm_token_valid + \
                   UserService.email_reconfirm_request_wait - datetime.utcnow()
            wait_seconds = round(wait.total_seconds())
            if wait_seconds > 0:
                raise UserServiceError('requested too frequently',
                                       'please wait for %d seconds and then try again' % wait_seconds)

        user.is_email_confirmed = False
        user.email_confirm_token = token_urlsafe()
        user.email_confirm_token_expire_at = datetime.utcnow() + UserService.email_confirm_token_valid
        user.email_confirmed_at = None
        return user

    @staticmethod
    def reconfirm_email(user):
        if user is None:
            raise UserServiceError('user is required')
        if not user.is_active:
            raise UserServiceError('inactive user')
        if user.is_email_confirmed:
            raise UserServiceError('email already confirmed')

        user.is_email_confirmed = False
        user.email_confirm_token = token_urlsafe()
        user.email_confirm_token_expire_at = datetime.utcnow() + UserService.email_confirm_token_valid
        user.email_confirmed_at = None

    @staticmethod
    def confirm_email(user: User, token, new_password, check_only=False):
        if user is None:
            raise UserServiceError('user is required')
        if token is None:
            raise UserServiceError('token is required')
        if not check_only and not user.external_auth_provider_id:
            # To simplify the logic, regardless of whether the external auth is enforced or not, we do not require and
            # ignore the new local password when external auth provider exists. In such case, the local password will
            # remain random (as it was initialized when the user was created).
            if new_password is None:
                raise UserServiceError('new password is required')

        if not user.is_active:
            raise UserServiceError('inactive user')
        if user.is_email_confirmed:
            raise UserServiceError('already confirmed')
        if user.email_confirm_token is None:
            raise UserServiceError('no active request')
        if user.email_confirm_token != token:
            raise UserServiceError('invalid token')
        if user.email_confirm_token_expire_at < datetime.utcnow():
            raise UserServiceError('token expired')

        if not check_only:
            if not user.external_auth_provider_id:
                if not UserService.password_pattern.match(new_password):
                    raise UserServiceError('invalid password format')
                user.password = pbkdf2_sha256.hash(new_password)
            user.email_confirm_token = None
            user.email_confirm_token_expire_at = None
            user.email_confirmed_at = datetime.utcnow()
            user.is_email_confirmed = True

    @staticmethod
    def update_profile(user, **kwargs):
        if user is None:
            raise UserServiceError('user is required')
        if not user.is_active:
            raise UserServiceError('inactive user')

        if any(key not in UserService.profile_fields for key in kwargs):
            raise UserServiceError('unexpected profile field')
        old_values = {field: getattr(user, field) for field in kwargs}

        for key, value in kwargs.items():
            if key == 'nickname':
                if value is not None:
                    if not UserService.nickname_pattern.match(value):
                        raise UserServiceError('invalid nickname format')
                    if value != user.nickname and db.session.query(func.count()). \
                            filter(User.nickname == value).scalar():
                        raise UserServiceError('duplicate nickname')
            setattr(user, key, value)
        return old_values

    @staticmethod
    def update_password(user, new_password, old_password):
        if user is None:
            raise UserServiceError('user is required')
        if new_password is None:
            raise UserServiceError('new password is required')
        if old_password is None:
            raise UserServiceError('old password is required')

        if not user.is_active:
            raise UserServiceError('inactive user')
        if not UserService.password_pattern.match(new_password):
            raise UserServiceError('invalid password format')
        if not old_password:
            raise UserServiceError('require old password')
        if not pbkdf2_sha256.verify(old_password, user.password):
            raise UserServiceError('wrong old password')
        user.password = pbkdf2_sha256.hash(new_password)

    @staticmethod
    def request_reset_password(name_or_email):
        if name_or_email is None:
            raise UserServiceError('name or email is required')

        if '@' in name_or_email:
            user = User.query.filter_by(email=name_or_email).first()
        else:
            user = User.query.filter_by(name=name_or_email).first()
        if user is None:
            raise UserServiceError('user not found')
        if not user.is_active:
            raise UserServiceError('inactive user')

        if user.external_auth_provider_id:
            # To simplify the interactions, regardless of whether the external auth is enforced or not, we do not allow
            # resetting local password as long as the external auth provider exists.
            return user  # do nothing but returning the found user, let the api function do the rest.

        if user.email is None:
            raise UserServiceError('no email')

        if user.password_reset_token_expire_at is not None:  # check if requested too frequently
            wait = user.password_reset_token_expire_at - UserService.password_reset_token_valid + \
                   UserService.password_reset_request_wait - datetime.utcnow()
            wait_seconds = round(wait.total_seconds())
            if wait_seconds > 0:
                raise UserServiceError('requested too frequently',
                                       'please wait for %d seconds and then try again' % wait_seconds)

        user.password_reset_token = token_urlsafe()
        user.password_reset_token_expire_at = datetime.utcnow() + UserService.password_reset_token_valid
        return user

    @staticmethod
    def reset_password(user, reset_token, new_password, check_only=False):
        if user is None:
            raise UserServiceError('user is required')
        if reset_token is None:
            raise UserServiceError('token is required')
        if not check_only:
            if new_password is None:
                raise UserServiceError('new password is required')

        if not user.is_active:
            raise UserServiceError('inactive user')
        if user.password_reset_token is None:
            raise UserServiceError('no active request')
        if user.password_reset_token != reset_token:
            raise UserServiceError('invalid token')
        if user.password_reset_token_expire_at < datetime.utcnow():
            raise UserServiceError('token expired')

        if not check_only:
            if not UserService.password_pattern.match(new_password):
                raise UserServiceError('invalid password format')
            user.password = pbkdf2_sha256.hash(new_password)
            user.password_reset_token = None
            user.password_reset_token_expire_at = None

    @staticmethod
    def two_factor_request_disable_by_email(user: User):
        if user is None:
            raise UserServiceError('user is required')

        if not user.is_active:
            raise UserServiceError('inactive user')
        if user.email is None:
            raise UserServiceError('no email')

        if not user.is_two_factor_enabled:
            raise UserServiceError('two-factor authentication is not enabled')

        if user.two_factor_disable_token_expire_at is not None:  # check if requested too frequently
            wait = user.two_factor_disable_token_expire_at - UserService.two_factor_disable_token_valid + \
                   UserService.two_factor_disable_token_request_wait - datetime.utcnow()
            wait_seconds = round(wait.total_seconds())
            if wait_seconds > 0:
                raise UserServiceError('requested too frequently',
                                       'please wait for %d seconds and then try again' % wait_seconds)

        user.two_factor_disable_token = token_urlsafe()
        user.two_factor_disable_token_expire_at = datetime.utcnow() + UserService.two_factor_disable_token_valid

    @staticmethod
    def two_factor_disable_by_email(user: User, reset_token):
        if user is None:
            raise UserServiceError('user is required')
        if reset_token is None:
            raise UserServiceError('token is required')

        if not user.is_active:
            raise UserServiceError('inactive user')

        if not user.is_two_factor_enabled:
            raise UserServiceError('two-factor authentication is not enabled')
        if user.two_factor_disable_token is None:
            raise UserServiceError('no active request')
        if user.two_factor_disable_token != reset_token:
            raise UserServiceError('invalid token')
        if user.two_factor_disable_token_expire_at < datetime.utcnow():
            raise UserServiceError('token expired')

        user.two_factor_disable_token = None
        user.two_factor_disable_token_expire_at = None
        user.is_two_factor_enabled = False
