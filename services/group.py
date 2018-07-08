import re

from error import BasicError
from models import db, Group


class GroupServiceError(BasicError):
    pass


class GroupService:
    name_pattern = re.compile('^[\w]{3,16}$')
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

        return Group.query.get(_id)

    @staticmethod
    def get_by_name(name):
        if name is None:
            raise GroupServiceError('name is required')

        return Group.query.filter_by(name=name).first()

    @staticmethod
    def add(name, description):
        if name is None:
            raise GroupServiceError('name is required')

        if not GroupService.name_pattern.match(name):
            raise GroupServiceError('invalid name format')
        if Group.query.filter_by(name=name).count():
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
        old_values = {field: group[field] for field in kwargs}

        for key, value in kwargs.items():
            if key == 'description':
                if value is not None:
                    if len(value) > GroupService.description_max_length:
                        raise GroupServiceError('description too long')
            group[key] = value
        return old_values

    @staticmethod
    def delete(_id):
        if _id is None:
            raise GroupServiceError('id is required')

        group = Group.query.get(_id)
        if group is None:
            raise GroupServiceError('group not found')
        db.session.delete(group)
