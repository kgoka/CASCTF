from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..core.config import DATABASE_URL

# SQLAlchemy 엔진 생성 (SQLite는 스레드 옵션 필요)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
# 요청 단위로 사용할 DB 세션 팩토리
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    # FastAPI 의존성 주입용 DB 세션 생성/정리
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
