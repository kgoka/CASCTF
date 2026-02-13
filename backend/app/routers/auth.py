from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.user import User
from ..schemas.auth import UserCreate, UserLogin

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
# 비밀번호 해시/검증 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # 동일 username 중복 가입 방지
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists.")

    # 비밀번호는 반드시 해시로 저장
    hashed_password = pwd_context.hash(user.password)
    new_user = User(username=user.username, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    return {"message": "Signup successful."}


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    # 사용자 조회 후 해시 검증
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    return {"message": "Login successful.", "username": db_user.username}
