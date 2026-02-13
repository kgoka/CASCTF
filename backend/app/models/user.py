from sqlalchemy import Column, Integer, String

from ..db.base import Base


# 사용자 인증에 필요한 최소 정보 모델
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    # 평문 비밀번호 대신 해시값만 저장
    password_hash = Column(String)
