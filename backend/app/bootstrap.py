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
        if "score_type" not in cols:
            conn.execute(text("ALTER TABLE challenges ADD COLUMN score_type VARCHAR NOT NULL DEFAULT 'basic'"))
        if "point" not in cols:
            conn.execute(text("ALTER TABLE challenges ADD COLUMN point INTEGER NOT NULL DEFAULT 100"))
        if "dynamic_min_point" not in cols:
            conn.execute(
                text("ALTER TABLE challenges ADD COLUMN dynamic_min_point INTEGER NOT NULL DEFAULT 100")
            )
        if "dynamic_decay" not in cols:
            conn.execute(text("ALTER TABLE challenges ADD COLUMN dynamic_decay INTEGER NOT NULL DEFAULT 50"))
        if "flag" not in cols:
            conn.execute(text("ALTER TABLE challenges ADD COLUMN flag VARCHAR NOT NULL DEFAULT ''"))
        if "attachment_file_id" not in cols:
            conn.execute(text("ALTER TABLE challenges ADD COLUMN attachment_file_id INTEGER"))
        if "docker_enabled" not in cols:
            conn.execute(
                text("ALTER TABLE challenges ADD COLUMN docker_enabled BOOLEAN NOT NULL DEFAULT 0")
            )
        if "docker_template_id" not in cols:
            conn.execute(text("ALTER TABLE challenges ADD COLUMN docker_template_id VARCHAR"))


def ensure_challenge_solve_columns() -> None:
    """기존 SQLite challenge_solves 테이블에 solved_at_ts 컬럼이 없으면 추가한다."""
    inspector = inspect(engine)
    if "challenge_solves" not in inspector.get_table_names():
        return

    cols = {col["name"] for col in inspector.get_columns("challenge_solves")}
    if "solved_at_ts" in cols:
        return

    with engine.begin() as conn:
        now_ts = conn.execute(text("SELECT CAST(strftime('%s','now') AS INTEGER)")).scalar() or 0
        conn.execute(
            text("ALTER TABLE challenge_solves ADD COLUMN solved_at_ts INTEGER NOT NULL DEFAULT 0")
        )
        conn.execute(
            text("UPDATE challenge_solves SET solved_at_ts = :now_ts WHERE solved_at_ts = 0"),
            {"now_ts": int(now_ts)},
        )


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

