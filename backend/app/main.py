from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import CORS_ALLOW_ORIGINS, CORS_ALLOW_ORIGIN_REGEX
from .db.base import Base
from .db.session import engine
from .routers import auth
from . import models  # noqa: F401

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("[422 VALIDATION ERROR]", exc.errors())
    print("[BODY]", (await request.body()).decode("utf-8", errors="ignore"))
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/")
def read_root():
    return {"message": "CASCTF Backend is running!"}
