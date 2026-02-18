import asyncio
import logging
from contextlib import suppress

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .bootstrap import (
    ensure_admin_user,
    ensure_app_config_columns,
    ensure_challenge_solve_columns,
    ensure_challenge_columns,
    ensure_user_role_column,
    ensure_user_score_column,
)
from .core.config import (
    CHALLENGE_INSTANCE_CLEANUP_INTERVAL_SECONDS,
    CORS_ALLOW_ORIGINS,
    CORS_ALLOW_ORIGIN_REGEX,
)
from .db.base import Base
from .db.session import SessionLocal, engine
from .routers import auth, challenge, config, scoreboard
from .services.scoring import recalculate_all_user_scores
from . import models  # noqa: F401

# 앱 시작 시 모델 메타데이터 기준으로 테이블 자동 생성
Base.metadata.create_all(bind=engine)
# 기존 DB 스키마 보정 및 기본 어드민 계정 생성
ensure_user_role_column()
ensure_user_score_column()
ensure_challenge_columns()
ensure_challenge_solve_columns()
ensure_app_config_columns()
ensure_admin_user()
with SessionLocal() as db:
    recalculate_all_user_scores(db)

app = FastAPI()
logger = logging.getLogger(__name__)
_instance_cleanup_task: asyncio.Task | None = None


def _run_instance_cleanup_once() -> None:
    with SessionLocal() as db:
        challenge._cleanup_expired_instances(db)


async def _instance_cleanup_loop() -> None:
    while True:
        await asyncio.sleep(CHALLENGE_INSTANCE_CLEANUP_INTERVAL_SECONDS)
        try:
            _run_instance_cleanup_once()
        except Exception:
            logger.exception("Periodic challenge instance cleanup failed")


@app.on_event("startup")
async def start_instance_cleanup_loop() -> None:
    global _instance_cleanup_task

    try:
        _run_instance_cleanup_once()
    except Exception:
        logger.exception("Initial challenge instance cleanup failed")

    if _instance_cleanup_task is None or _instance_cleanup_task.done():
        _instance_cleanup_task = asyncio.create_task(_instance_cleanup_loop())


@app.on_event("shutdown")
async def stop_instance_cleanup_loop() -> None:
    global _instance_cleanup_task
    if _instance_cleanup_task is None:
        return

    _instance_cleanup_task.cancel()
    with suppress(asyncio.CancelledError):
        await _instance_cleanup_task
    _instance_cleanup_task = None


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # 디버깅용: 유효성 검증 실패 시 상세 에러와 요청 본문 출력
    print("[422 VALIDATION ERROR]", exc.errors())
    print("[BODY]", (await request.body()).decode("utf-8", errors="ignore"))
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


# 프론트엔드(로컬 개발 서버)에서 API 호출할 수 있도록 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 인증 라우터(/api/auth/*) 등록
app.include_router(auth.router)
# 챌린지 라우터(/api/challenges*) 등록
app.include_router(challenge.router)
# 앱 설정 라우터(/api/config*) 등록
app.include_router(config.router)
# 스코어보드 라우터(/api/scoreboard*) 등록
app.include_router(scoreboard.router)


@app.get("/")
def read_root():
    return {"message": "CASCTF Backend is running!"}
