from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite 파일 경로
DATABASE_URL = "sqlite:///./casctf.db"

# DB 엔진 생성 (connect_args는 SQLite 전용 옵션)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# 세션 생성기
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모델들이 상속받을 기본 클래스
Base = declarative_base()

# DB 세션 의존성 함수 (다른 파일에서 가져다 씀)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()