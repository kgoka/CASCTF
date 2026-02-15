from sqlalchemy import Column, Integer, String

from ..db.base import Base


class ChallengeFile(Base):
    __tablename__ = "challenge_files"

    id = Column(Integer, primary_key=True, index=True)
    original_name = Column(String, nullable=False)
    stored_name = Column(String, nullable=False, unique=True, index=True)
    content_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=False, default=0)

