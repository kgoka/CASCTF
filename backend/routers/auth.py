from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import models, schemas
from database import get_db

router = APIRouter(
    prefix="/api/auth",  # 이 파일의 모든 API 앞에 /api/auth 가 붙음
    tags=["Authentication"] # 스웨거(Docs)에서 그룹핑할 이름
)

# 암호화 도구
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 중복 체크
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    
    # 비밀번호 해싱 및 저장
    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(username=user.username, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    return {"message": "회원가입 성공!"}

@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 틀렸습니다.")
    
    return {"message": "로그인 성공!", "username": db_user.username}