from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from ..db.base import Base  # 👈 경로를 정확하게 맞췄습니다!

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    # user.py의 테이블명이 users, challenge.py의 테이블명이 challenges 인 것을 확인했습니다.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    
    # 유저가 제출한 텍스트 (삽질 기록!)
    provided_flag = Column(String(255), nullable=False)
    
    # 정답 여부 (True면 정답, False면 삽질)
    is_correct = Column(Boolean, default=False)
    
    # 제출 시간
    created_at = Column(DateTime(timezone=True), server_default=func.now())