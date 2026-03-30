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
    #if current_user.role != "admin":
    #   raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")
    
    user = db.query(User).filter(User.id == user_id).first()
    users = db.query(User).order_by(User.score.desc()).all()
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

# 누구나 볼 수 있는 퍼블릭 프로필 API (username 기반으로 변경)
@router.get("/profile/{username}")  # <- id 대신 username을 경로 파라미터로 받습니다.
def get_public_profile(username: str, db: Session = Depends(get_db)):
    # 1. 유저 기본 정보 조회 (username으로 필터링)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. 유저가 푼 문제 데이터 가져오기 (이 부분은 내부 로직이므로 user.id를 그대로 써도 무방합니다)
    solves = (
        db.query(ChallengeSolve, Challenge)
        .join(Challenge, ChallengeSolve.challenge_id == Challenge.id)
        .filter(ChallengeSolve.user_id == user.id) 
        .order_by(ChallengeSolve.solved_at_ts.desc())
        .all()
    )

    # 3. 현재 각 문제의 동적 점수 계산을 위한 매핑
    challenges = db.query(Challenge).all()
    c_ids = [c.id for c in challenges]
    solve_counts = get_challenge_solve_count_map(db, c_ids)

    # 4. 데이터 조립
    solved_list = []
    for solve_record, challenge in solves:
        current_point = compute_challenge_value(challenge, solve_counts.get(challenge.id, 0))
        
        solved_list.append({
            "challenge_id": challenge.id,
            "challenge_name": getattr(challenge, "name", "Unknown"), 
            "category": getattr(challenge, "category", "Unknown"),
            "point": current_point,
            "solved_at_ts": solve_record.solved_at_ts
        })

    # 최종 결과 반환
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "score": user.score,
        "solves": solved_list
    }
    
# -------------------------------------------------------------
# 🚨 [DANGER ZONE] 시즌 초기화 API
# -------------------------------------------------------------
@router.delete("/admin/reset-season")
def reset_ctf_season(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. 최고 관리자(admin) 권한이 맞는지 철저히 검증
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="시즌을 초기화할 권한이 없습니다.")

    try:
        # 2. 풀이 기록 테이블(ChallengeSolve) 싹 비우기
        # (주의: 테이블 이름이 모델명과 다를 수 있습니다. sqlalchemy 모델 삭제 방식 사용)
        db.query(ChallengeSolve).delete()
        
        # 3. 유저 테이블(User)에서 관리자 빼고 싹 비우기
        # 현재 접속한 관리자(current_user)는 절대 지워지지 않도록 보호합니다.
        # (만약 'admin' 롤을 가진 모든 사람을 살리고 싶다면 User.role == 'admin' 조건 사용)
        db.query(User).filter(User.id != current_user.id).filter(User.role != 'admin').delete()
        
        # 4. 관리자 계정의 점수(score)도 0으로 초기화
        db.query(User).update({User.score: 0})

        # 5. DB에 변경사항 영구 저장
        db.commit()
        return {"message": "✅ 새로운 CTF 시즌 준비가 완료되었습니다. 모든 유저 데이터와 풀이 기록이 초기화되었습니다."}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB 초기화 중 에러가 발생했습니다: {str(e)}")