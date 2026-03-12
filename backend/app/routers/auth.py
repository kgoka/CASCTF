from fastapi import APIRouter, Depends, HTTPException, Request, Response
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from typing import List

from ..core.config import ACCESS_TOKEN_COOKIE_NAME, ACCESS_TOKEN_EXPIRE_MINUTES
from ..core.security import create_access_token, decode_access_token
from ..db.session import get_db
from ..models.user import User
from ..schemas.auth import CurrentUserResponse, LoginResponse, UserCreate, UserLogin, UserListResponse, UserUpdateRequest
from ..models.challenge import Challenge
from ..models.challenge_solve import ChallengeSolve
from ..services.scoring import get_challenge_solve_count_map, compute_challenge_value


router = APIRouter(prefix="/api/auth", tags=["Authentication"])
# 비밀번호 해시/검증 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db_user = db.query(User).filter(User.username == username).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")

    return db_user


@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # 동일 username 중복 가입 방지
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists.")

    # 비밀번호는 반드시 해시로 저장
    hashed_password = pwd_context.hash(user.password)
    new_user = User(username=user.username, password_hash=hashed_password, role="player", score=0)
    db.add(new_user)
    db.commit()
    return {"message": "Signup successful."}


@router.post("/login", response_model=LoginResponse)
def login(user: UserLogin, response: Response, db: Session = Depends(get_db)):
    # 사용자 조회 후 해시 검증
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    access_token = create_access_token(db_user.username, db_user.role)
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    return {
        "message": "Login successful.",
        "id": db_user.id,
        "username": db_user.username,
        "role": db_user.role,
        "score": db_user.score,
    }


@router.get("/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "role": current_user.role, "score": current_user.score}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE_NAME, path="/")
    return {"message": "Logged out."}

@router.get("/admin/users", response_model=List[UserListResponse])
def get_all_users_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # 현재 로그인한 유저 정보 가져오기
):
    # 1. 관리자(admin) 권한이 맞는지 검증
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")

    # 2. DB에서 전체 유저 조회 후 반환
    users = db.query(User).all()
    return users

# 1. 특정 유저 상세 조회
@router.get("/admin/users/{user_id}", response_model=UserListResponse)
def get_user_detail(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    return user

# 2. 특정 유저 정보 수정
@router.patch("/admin/users/{user_id}")
def update_user(
    user_id: int, 
    update_data: UserUpdateRequest, # 방금 만든 스키마
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    if update_data.username is not None:
        user.username = update_data.username
    if update_data.role is not None:
        user.role = update_data.role
    if update_data.score is not None:
        user.score = update_data.score
    if update_data.password is not None:
        user.password_hash = pwd_context.hash(update_data.password)

    db.commit()
    return {"message": "유저 정보가 성공적으로 수정되었습니다."}

# 3. 특정 유저 삭제
@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    db.delete(user)
    db.commit()
    return {"message": "유저가 삭제되었습니다."}

# 누구나 볼 수 있는 퍼블릭 프로필 API (푼 문제 기록 포함)
@router.get("/profile/{user_id}")
def get_public_profile(user_id: int, db: Session = Depends(get_db)):
    # 1. 유저 기본 정보 조회
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. 유저가 푼 문제 데이터 가져오기 (Challenge 테이블과 조인하여 문제 이름/카테고리 획득)
    solves = (
        db.query(ChallengeSolve, Challenge)
        .join(Challenge, ChallengeSolve.challenge_id == Challenge.id)
        .filter(ChallengeSolve.user_id == user_id)
        .order_by(ChallengeSolve.solved_at_ts.desc()) # 최근 푼 순서대로 정렬
        .all()
    )

    # 3. 현재 각 문제의 동적 점수(Dynamic Score) 계산을 위한 전체 풀이 횟수 맵핑
    challenges = db.query(Challenge).all()
    c_ids = [c.id for c in challenges]
    solve_counts = get_challenge_solve_count_map(db, c_ids)

    # 4. 프론트엔드로 보낼 응답 데이터 조립
    solved_list = []
    for solve_record, challenge in solves:
        # 시간이 지나 깎인 '현재 기준'의 점수 계산
        current_point = compute_challenge_value(challenge, solve_counts.get(challenge.id, 0))
        
        solved_list.append({
            "challenge_id": challenge.id,
            "challenge_name": getattr(challenge, "name", "Unknown"), 
            "category": getattr(challenge, "category", "Unknown"),
            "point": current_point,
            "solved_at_ts": solve_record.solved_at_ts
        })

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "score": user.score,
        "solves": solved_list
    }