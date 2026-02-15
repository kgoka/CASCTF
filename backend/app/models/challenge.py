from sqlalchemy import Column, Integer, String, Text

from ..db.base import Base


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    message = Column(Text, nullable=False, default="")
    point = Column(Integer, nullable=False, default=100)
    state = Column(String, nullable=False, default="Visible")
    score_type = Column(String, nullable=False, default="basic")
    # 정답 flag (관리자/서버에서만 사용)
    flag = Column(String, nullable=False, default="")
    # 업로드 파일 ID (challenge_files.id)
    attachment_file_id = Column(Integer, nullable=True)

