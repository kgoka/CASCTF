from typing import Optional

from pydantic import BaseModel, Field


class PublicConfigResponse(BaseModel):
    ctf_name: str
    duration_start_ts: Optional[int] = None
    duration_end_ts: Optional[int] = None
    is_active: bool


class AdminConfigResponse(PublicConfigResponse):
    pass


class AdminConfigGeneralUpdate(BaseModel):
    ctf_name: str = Field(min_length=1, max_length=80)


class AdminConfigDurationUpdate(BaseModel):
    duration_start_ts: Optional[int] = Field(default=None, ge=0)
    duration_end_ts: Optional[int] = Field(default=None, ge=0)
