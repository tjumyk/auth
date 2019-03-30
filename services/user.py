import re
from datetime import timedelta, datetime
from secrets import token_urlsafe

from passlib.hash import pbkdf2_sha256
from sqlalchemy import or_, func

from error import BasicError
from models import db, User


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

        error = None
        if not user.is_active:
            error = 'inactive user'
        elif not user.is_email_confirmed:
            error = 'email not confirmed'
        elif not pbkdf2_sha256.verify(password, user.password):
            error = 'wrong password'

        from .login_record import LoginRecordService
        LoginRecordService.add(user, ip, user_agent.string, error is None, error)
        db.session.commit()  # force commit, a little bit ugly

        if error is not None:
            raise UserServiceError(error)
        return user

    @staticmethod
    def invite(name, email):
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
        if db.session.query(func.count()).filter(User.name == name).scalar():
            raise UserServiceError('duplicate name')
        if db.session.query(func.count()).filter(User.email == email).scalar():
            raise UserServiceError('duplicate email')

        password = pbkdf2_sha256.hash(token_urlsafe(12))
        user = User(name=name, password=password, email=email,
                    is_email_confirmed=False, email_confirm_token=token_urlsafe(),
                    email_confirm_token_expire_at=datetime.utcnow() + UserService.email_confirm_token_valid)
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
    def confirm_email(user, token, new_password, check_only=False):
        if user is None:
            raise UserServiceError('user is required')
        if token is None:
            raise UserServiceError('token is required')
        if not check_only:
            if new_password is None:
                raise UserServiceError('new password is required')

        if not user.is_active:
            raise UserServiceError('inactive user')
        if user.is_email_confirmed:
            raise UserServiceError('already confirmed')
        if user.email_confirm_token is None:
            raise UserServiceError('not to confirm')
        if user.email_confirm_token != token:
            raise UserServiceError('invalid token')
        if user.email_confirm_token_expire_at < datetime.utcnow():
            raise UserServiceError('token expired')

        if not check_only:
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
            raise UserServiceError('not to reset')
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
