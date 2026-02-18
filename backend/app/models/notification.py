from sqlalchemy import Boolean, Column, Integer, String, Text

from ..db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(120), nullable=False)
    content = Column(Text, nullable=False)
    notice_type = Column(String(20), nullable=False, default="Toast")
    play_sound = Column(Boolean, nullable=False, default=False)
    created_by = Column(String(50), nullable=False)
    created_ts = Column(Integer, nullable=False, index=True)
