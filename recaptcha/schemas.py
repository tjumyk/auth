from pydantic import BaseModel, Field


class ChallengeCreated(BaseModel):
    challenge_id: str


class VerifyRequest(BaseModel):
    challenge_id: str
    answer: str
    client_ip: str | None = None


class VerifyResponse(BaseModel):
    valid: bool
    reason: str | None = None


class ErrorResponse(BaseModel):
    msg: str
    detail: str | None = None
