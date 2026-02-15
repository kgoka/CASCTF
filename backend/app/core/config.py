import os

# 환경변수 미설정 시 로컬 SQLite를 기본 DB로 사용
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./casctf.db")

# 기본 어드민 계정 (개발용)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin1234")

# 업로드 파일 저장 경로
CHALLENGE_UPLOAD_DIR = os.path.abspath(os.getenv("CHALLENGE_UPLOAD_DIR", "./uploads/challenges"))

# JWT 설정
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "180"))
ACCESS_TOKEN_COOKIE_NAME = os.getenv("ACCESS_TOKEN_COOKIE_NAME", "casctf_access_token")

# 로컬 개발 프론트엔드 허용 목록
CORS_ALLOW_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
]
# localhost/127.0.0.1의 다른 포트도 허용 (예: 3001 등)
CORS_ALLOW_ORIGIN_REGEX = r"https?://(localhost|127\.0\.0\.1):\d+"

