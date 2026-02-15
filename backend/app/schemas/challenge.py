from typing import Literal, Optional

from pydantic import BaseModel, Field


CategoryType = Literal["OSINT", "Web", "Forensics", "Pwn", "Reversing", "Network"]
DifficultyType = Literal["NORMAL", "HARD"]
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
    difficulty: DifficultyType = "NORMAL"
    message: str = Field(default="", max_length=2000)
    point: int = Field(ge=1, le=10000)
    score_type: ScoreType = "basic"
    state: StateType = "Visible"
    flag: str = Field(min_length=1, max_length=200)
    attachment_file_id: Optional[int] = None
    docker_enabled: bool = False
    docker_template_id: Optional[str] = Field(default=None, max_length=120)


class ChallengeUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: CategoryType
    difficulty: DifficultyType = "NORMAL"
    message: str = Field(default="", max_length=2000)
    point: int = Field(ge=1, le=10000)
    score_type: ScoreType = "basic"
    state: StateType = "Visible"
    flag: Optional[str] = Field(default=None, min_length=1, max_length=200)
    attachment_file_id: Optional[int] = None
    docker_enabled: bool = False
    docker_template_id: Optional[str] = Field(default=None, max_length=120)


class ChallengeResponse(BaseModel):
    id: int
    name: str
    category: CategoryType
    difficulty: DifficultyType
    message: str
    point: int
    score_type: ScoreType
    state: StateType
    attachment_file_id: Optional[int] = None
    attachment_file_name: Optional[str] = None
    docker_enabled: bool
    docker_template_id: Optional[str] = None

    class Config:
        orm_mode = True


class ChallengeAdminResponse(ChallengeResponse):
    flag: str


class ChallengeDockerTemplateResponse(BaseModel):
    template_id: str
    services: list[str]
    default_service: Optional[str] = None
    default_container_port: Optional[int] = None


class ChallengeServerAccessResponse(BaseModel):
    challenge_id: int
    host: str
    port: int
    url: str
    expires_at_ts: int
    remaining_seconds: int
    reused: bool


class FlagSubmitRequest(BaseModel):
    flag: str = Field(min_length=1, max_length=200)


class FlagSubmitResponse(BaseModel):
    success: bool
    message: str
    awarded_point: int
    total_score: int
    blood: Optional[Literal["first", "second", "third"]] = None
