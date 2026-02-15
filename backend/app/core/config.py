import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_PATH = BASE_DIR / "casctf.db"
# 환경변수 미설정 시 backend/casctf.db를 기본 DB로 사용 (실행 위치와 무관)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")

# 기본 어드민 계정 (개발용)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin1234")

# 업로드 파일 저장 경로 (기본: backend/uploads/challenges)
CHALLENGE_UPLOAD_DIR = os.path.abspath(
    os.getenv("CHALLENGE_UPLOAD_DIR", str((BASE_DIR / "uploads" / "challenges").as_posix()))
)
# 도커 문제 템플릿 루트 경로 (기본: backend/docker)
CHALLENGE_DOCKER_ROOT = os.path.abspath(
    os.getenv("CHALLENGE_DOCKER_ROOT", str((BASE_DIR / "docker").as_posix()))
)
# 플레이어에게 노출할 접속 호스트 (기본: localhost)
CHALLENGE_INSTANCE_HOST = os.getenv("CHALLENGE_INSTANCE_HOST", "127.0.0.1")
# 문제 인스턴스 TTL (기본: 30분)
CHALLENGE_INSTANCE_TTL_SECONDS = int(os.getenv("CHALLENGE_INSTANCE_TTL_SECONDS", "1800"))
# 문제 인스턴스 호스트 포트 풀 (기본: 15000~20000)
CHALLENGE_INSTANCE_PORT_MIN = int(os.getenv("CHALLENGE_INSTANCE_PORT_MIN", "15000"))
CHALLENGE_INSTANCE_PORT_MAX = int(os.getenv("CHALLENGE_INSTANCE_PORT_MAX", "20000"))
if CHALLENGE_INSTANCE_PORT_MIN > CHALLENGE_INSTANCE_PORT_MAX:
    CHALLENGE_INSTANCE_PORT_MIN = 15000
    CHALLENGE_INSTANCE_PORT_MAX = 20000
# docker CLI context (비워두면 시스템 기본 context 사용)
CHALLENGE_DOCKER_CONTEXT = os.getenv("CHALLENGE_DOCKER_CONTEXT", "").strip()

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
