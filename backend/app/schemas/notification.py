from typing import Literal

from pydantic import BaseModel, Field


NoticeType = Literal["Toast", "Alert"]


class NotificationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=2000)
    notice_type: NoticeType = "Toast"
    play_sound: bool = False


class NotificationResponse(BaseModel):
    id: int
    title: str
    content: str
    notice_type: NoticeType
    play_sound: bool
    created_by: str
    created_ts: int

    class Config:
        orm_mode = True


class NotificationClearResponse(BaseModel):
    deleted_count: int
