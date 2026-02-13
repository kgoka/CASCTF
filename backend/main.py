from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from database import engine, Base
from routers import auth

# DB 테이블 생성 (앱 시작 시 자동 실행)
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("✅ 422 VALIDATION ERROR:", exc.errors())
    print("✅ BODY:", (await request.body()).decode("utf-8", errors="ignore"))
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# CORS 설정
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,   # 쿠키/세션 쓸 가능성 있으면 True 권장
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록 (이제 /api/auth 기능이 연결됨)
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "CASCTF Backend is running!"}