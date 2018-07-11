from sqlalchemy import desc

from error import BasicError
from models import db, LoginRecord


class LoginRecordServiceError(BasicError):
    pass


class LoginRecordService:
    @staticmethod
    def get(_id):
        return LoginRecord.query.get(_id)

    @staticmethod
    def get_for_user(user):
        if user is None:
            raise LoginRecordServiceError('user is required')

        return LoginRecord.query.with_parent(user).order_by(desc(LoginRecord.id)).all()

    @staticmethod
    def add(user_id, ip, user_agent, success, reason):
        if user_id is None:
            raise LoginRecordServiceError('user id required')

        record = LoginRecord(user_id=user_id, ip=ip, user_agent=user_agent,
                             success=success, reason=reason)
        db.session.add(record)
        return record
