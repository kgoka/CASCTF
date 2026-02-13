from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import CORS_ALLOW_ORIGINS, CORS_ALLOW_ORIGIN_REGEX
from .db.base import Base
from .db.session import engine
from .routers import auth
from . import models  # noqa: F401

# 앱 시작 시 모델 메타데이터 기준으로 테이블 자동 생성
Base.metadata.create_all(bind=engine)

app = FastAPI()


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


@app.get("/")
def read_root():
    return {"message": "CASCTF Backend is running!"}
