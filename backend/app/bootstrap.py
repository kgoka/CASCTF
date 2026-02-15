from passlib.context import CryptContext
from sqlalchemy import inspect, text

from .core.config import ADMIN_PASSWORD, ADMIN_USERNAME
from .db.session import SessionLocal, engine
from .models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def ensure_user_role_column() -> None:
    """기존 SQLite users 테이블에 role 컬럼이 없으면 추가한다."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    cols = {col["name"] for col in inspector.get_columns("users")}
    if "role" in cols:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'player'"))


def ensure_user_score_column() -> None:
    """기존 SQLite users 테이블에 score 컬럼이 없으면 추가한다."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    cols = {col["name"] for col in inspector.get_columns("users")}
    if "score" in cols:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN score INTEGER NOT NULL DEFAULT 0"))


def ensure_challenge_columns() -> None:
    """기존 SQLite challenges 테이블에 필요한 컬럼이 없으면 추가한다."""
    inspector = inspect(engine)
    if "challenges" not in inspector.get_table_names():
        return

    cols = {col["name"] for col in inspector.get_columns("challenges")}

    with engine.begin() as conn:
        if "difficulty" not in cols:
            conn.execute(
                text("ALTER TABLE challenges ADD COLUMN difficulty VARCHAR NOT NULL DEFAULT 'NORMAL'")
            )
        if "flag" not in cols:
            conn.execute(text("ALTER TABLE challenges ADD COLUMN flag VARCHAR NOT NULL DEFAULT ''"))
        if "attachment_file_id" not in cols:
            conn.execute(text("ALTER TABLE challenges ADD COLUMN attachment_file_id INTEGER"))


def ensure_app_config_columns() -> None:
    """기존 SQLite app_config 테이블에 duration 컬럼이 없으면 추가한다."""
    inspector = inspect(engine)
    if "app_config" not in inspector.get_table_names():
        return

    cols = {col["name"] for col in inspector.get_columns("app_config")}
    with engine.begin() as conn:
        if "duration_start_ts" not in cols:
            conn.execute(text("ALTER TABLE app_config ADD COLUMN duration_start_ts INTEGER"))
        if "duration_end_ts" not in cols:
            conn.execute(text("ALTER TABLE app_config ADD COLUMN duration_end_ts INTEGER"))


def ensure_admin_user() -> None:
    """기본 어드민 계정을 보장한다."""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        if admin:
            if admin.role != "admin":
                admin.role = "admin"
                db.commit()
            return

        admin_user = User(
            username=ADMIN_USERNAME,
            password_hash=pwd_context.hash(ADMIN_PASSWORD),
            role="admin",
            score=0,
        )
        db.add(admin_user)
        db.commit()
    finally:
        db.close()

