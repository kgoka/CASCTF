import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./casctf.db")

CORS_ALLOW_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1):\d+"
