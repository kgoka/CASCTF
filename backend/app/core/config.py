import os

# 환경변수 미설정 시 로컬 SQLite를 기본 DB로 사용
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./casctf.db")

# 로컬 개발 프론트엔드 허용 목록
CORS_ALLOW_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# localhost/127.0.0.1의 다른 포트도 허용 (예: 3001 등)
CORS_ALLOW_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1):\d+"
