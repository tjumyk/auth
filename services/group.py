import re

from sqlalchemy import or_, func

from error import BasicError
from models import db, Group


class GroupServiceError(BasicError):
    pass


class GroupService:
    name_pattern = re.compile('^[\w]{3,24}$')
    description_max_length = 256

    profile_fields = {
        'description'
    }

    @staticmethod
    def get_all():
        return Group.query.all()

    @staticmethod
    def get(_id):
        if _id is None:
            raise GroupServiceError('id is required')
        if type(_id) is not int:
            raise GroupServiceError('id must be an integer')

        return Group.query.get(_id)

    @staticmethod
    def get_by_name(name):
        if name is None:
            raise GroupServiceError('name is required')

        return Group.query.filter_by(name=name).first()

    @staticmethod
    def search_by_name(name, limit=5):
        if name is None:
            raise GroupServiceError('name is required')
        if len(name) == 0:
            raise GroupServiceError('name must not be empty')

        name_lower = name.lower()
        _filter = or_(func.lower(Group.name).contains(name_lower), func.lower(Group.description).contains(name_lower))
        if limit is None:
            return Group.query.filter(_filter).all()
        else:
            if type(limit) is not int:
                raise GroupServiceError('limit must be an integer')
            return Group.query.filter(_filter).limit(limit)

    @staticmethod
    def add(name, description):
        if name is None:
            raise GroupServiceError('name is required')

        if not GroupService.name_pattern.match(name):
            raise GroupServiceError('invalid name format')
        if db.session.query(func.count()).filter(Group.name == name).scalar():
            raise GroupServiceError('duplicate name')
        group = Group(name=name, description=description)
        db.session.add(group)
        return group

    @staticmethod
    def update_profile(group, **kwargs):
        if group is None:
            raise GroupServiceError('group is required')

        if any(key not in GroupService.profile_fields for key in kwargs):
            raise GroupServiceError('unexpected profile field')
        old_values = {field: getattr(group, field) for field in kwargs}

        for key, value in kwargs.items():
            if key == 'description':
                if value is not None:
                    if len(value) > GroupService.description_max_length:
                        raise GroupServiceError('description too long')
            setattr(group, key, value)
        return old_values
