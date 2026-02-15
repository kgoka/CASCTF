from typing import Literal, Optional

from pydantic import BaseModel, Field


CategoryType = Literal["OSINT", "Web", "Forensics", "Pwn", "Reversing", "Network"]
StateType = Literal["Visible", "Hidden"]
ScoreType = Literal["basic", "dynamic"]


class ChallengeFileResponse(BaseModel):
    id: int
    original_name: str
    content_type: Optional[str] = None
    file_size: int

    class Config:
        orm_mode = True


class ChallengeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: CategoryType
    message: str = Field(default="", max_length=2000)
    point: int = Field(ge=1, le=10000)
    score_type: ScoreType = "basic"
    state: StateType = "Visible"
    flag: str = Field(min_length=1, max_length=200)
    attachment_file_id: Optional[int] = None


class ChallengeUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: CategoryType
    message: str = Field(default="", max_length=2000)
    point: int = Field(ge=1, le=10000)
    score_type: ScoreType = "basic"
    state: StateType = "Visible"
    flag: Optional[str] = Field(default=None, min_length=1, max_length=200)
    attachment_file_id: Optional[int] = None


class ChallengeResponse(BaseModel):
    id: int
    name: str
    category: CategoryType
    message: str
    point: int
    score_type: ScoreType
    state: StateType
    attachment_file_id: Optional[int] = None
    attachment_file_name: Optional[str] = None

    class Config:
        orm_mode = True


class FlagSubmitRequest(BaseModel):
    flag: str = Field(min_length=1, max_length=200)


class FlagSubmitResponse(BaseModel):
    success: bool
    message: str
    awarded_point: int
    total_score: int

