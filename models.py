from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

user_groups = db.Table('user_groups',
                       db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
                       db.Column('group_id', db.Integer, db.ForeignKey('group.id'), primary_key=True))


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(16), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(64), unique=True, nullable=False)
    nickname = db.Column(db.String(16), unique=True)
    avatar = db.Column(db.String(128))

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    email_confirmed_at = db.Column(db.DateTime)

    email_confirm_token = db.Column(db.String(64))
    email_confirm_token_expire_at = db.Column(db.DateTime)
    password_reset_token = db.Column(db.String(64))
    password_reset_token_expire_at = db.Column(db.DateTime)

    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_email_confirmed = db.Column(db.Boolean, nullable=False, default=False)

    login_records = db.relationship('LoginRecord', backref=db.backref('user'), cascade="all, delete-orphan")
    client_users = db.relationship('OAuthClientUser', backref=db.backref('user'), cascade="all, delete-orphan")

    def to_dict(self, with_groups=True, with_group_ids=False, with_advanced_fields=False):
        _dict = dict(id=self.id, name=self.name, email=self.email, nickname=self.nickname, avatar=self.avatar,
                     is_active=self.is_active)
        if with_groups:
            _dict['groups'] = [group.to_dict() for group in self.groups]
        elif with_group_ids:
            _dict['group_ids'] = [group.id for group in self.groups]

        if with_advanced_fields:
            _dict['created_at'] = self.created_at
            _dict['modified_at'] = self.modified_at
            _dict['email_confirmed_at'] = self.email_confirmed_at
            _dict['is_email_confirmed'] = self.is_email_confirmed

        return _dict

    def __repr__(self):
        return '<User %r>' % self.name


class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(16), unique=True, nullable=False)
    description = db.Column(db.String(256))

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = db.relationship('User', secondary=user_groups, backref=db.backref('groups'))

    def to_dict(self, with_users=False, with_user_ids=False, with_advanced_fields=False):
        _dict = dict(id=self.id, name=self.name, description=self.description)
        if with_users:
            _dict['users'] = [user.to_dict(with_groups=False) for user in self.users]
        elif with_user_ids:
            _dict['users'] = [user.id for user in self.users]

        if with_advanced_fields:
            _dict['created_at'] = self.created_at
            _dict['modified_at'] = self.modified_at

        return _dict

    def __repr__(self):
        return '<Group %r>' % self.name


class LoginRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    ip = db.Column(db.String(64))
    user_agent = db.Column(db.String(128))
    success = db.Column(db.Boolean, nullable=False)
    reason = db.Column(db.String(32))

    def to_dict(self, with_user=False):
        _dict = dict(id=self.id, user_id=self.user_id, time=self.time, ip=self.ip, user_agent=self.user_agent,
                     success=self.success, reason=self.reason)
        if with_user:
            _dict['user'] = self.user.to_dict()
        return _dict

    def __repr__(self):
        return '<LoginRecord %r (%r)>' % (self.user_id, self.time)


class OAuthClient(db.Model):
    __tablename__ = 'oauth_client'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(16), unique=True, nullable=False)
    secret = db.Column(db.String(128), nullable=False)
    redirect_url = db.Column(db.String(128), nullable=False)

    home_url = db.Column(db.String(128))
    description = db.Column(db.String(256))
    icon = db.Column(db.String(128))

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = db.relationship('OAuthClientUser', backref=db.backref('client'), cascade="all, delete-orphan")

    def to_dict(self, with_advanced_fields=False):
        _dict = dict(id=self.id, name=self.name, secret=self.secret, redirect_url=self.redirect_url,
                     home_url=self.home_url, description=self.description, icon=self.icon)

        if with_advanced_fields:
            _dict['created_at'] = self.created_at
            _dict['modified_at'] = self.modified_at

        return _dict

    def __repr__(self):
        return '<OAuthClient %r>' % self.name


class OAuthClientUser(db.Model):
    __tablename__ = 'oauth_client_user'

    client_id = db.Column(db.Integer, db.ForeignKey('oauth_client.id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)

    authorize_token = db.Column(db.String(64))
    authorize_token_expire_at = db.Column(db.DateTime)
    access_token = db.Column(db.String(64), unique=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, with_advanced_fields=False):
        _dict = dict(client_id=self.client_id, user_id=self.user_id)

        if with_advanced_fields:
            _dict['created_at'] = self.created_at
            _dict['modified_at'] = self.modified_at

        return _dict

    def __repr__(self):
        return '<OAuthClientUser %r,%r>' % (self.client_id, self.user_id)
