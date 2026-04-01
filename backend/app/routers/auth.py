from fastapi import APIRouter, Depends, HTTPException, Request, Response
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from typing import List, Literal # 🚨 Literal 추가
from pydantic import BaseModel # 🚨 BaseModel 추가

from ..core.config import ACCESS_TOKEN_COOKIE_NAME, ACCESS_TOKEN_EXPIRE_MINUTES
from ..core.security import create_access_token, decode_access_token
from ..db.session import get_db
from ..models.user import User
from ..schemas.auth import CurrentUserResponse, LoginResponse, UserCreate, UserLogin, UserListResponse, UserUpdateRequest
from ..models.challenge import Challenge
from ..models.challenge_solve import ChallengeSolve
from ..services.scoring import get_challenge_solve_count_map, compute_challenge_value

# 방금 새로 만든 오답/정답 제출 기록 모델
from ..models.submission import Submission

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 🚨 [신규 추가] 권한 토글용 Pydantic 스키마 정의 (일반 유저는 'player'로 칭함)
class UserRoleUpdate(BaseModel):
    role: Literal["admin", "player"]


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
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists.")

    hashed_password = pwd_context.hash(user.password)
    new_user = User(username=user.username, password_hash=hashed_password, role="player", score=0)
    db.add(new_user)
    db.commit()
    return {"message": "Signup successful."}


@router.post("/login", response_model=LoginResponse)
def login(user: UserLogin, response: Response, db: Session = Depends(get_db)):
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
    current_user: User = Depends(get_current_user) 
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")

    users = db.query(User).all()
    return users

@router.get("/admin/users/{user_id}", response_model=UserListResponse)
def get_user_detail(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    return user

@router.patch("/admin/users/{user_id}")
def update_user(
    user_id: int, 
    update_data: UserUpdateRequest, 
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

@router.get("/profile/{username}")  
def get_public_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    solves = (
        db.query(ChallengeSolve, Challenge)
        .join(Challenge, ChallengeSolve.challenge_id == Challenge.id)
        .filter(ChallengeSolve.user_id == user.id) 
        .order_by(ChallengeSolve.solved_at_ts.desc())
        .all()
    )

    challenges = db.query(Challenge).all()
    c_ids = [c.id for c in challenges]
    solve_counts = get_challenge_solve_count_map(db, c_ids)

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
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="시즌을 초기화할 권한이 없습니다.")

    try:
        db.query(ChallengeSolve).delete()
        db.query(Submission).delete()
        db.query(User).filter(User.id != current_user.id).filter(User.role != 'admin').delete()
        db.query(User).update({User.score: 0})

        db.commit()
        return {"message": "✅ 새로운 CTF 시즌 준비가 완료되었습니다. 모든 유저 데이터와 풀이/제출 기록이 초기화되었습니다."}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB 초기화 중 에러가 발생했습니다: {str(e)}")

# -------------------------------------------------------------
# 📋 실시간 전체 제출(오답 포함) 로그 조회 API
# -------------------------------------------------------------
@router.get("/admin/submissions")
def get_all_submissions_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")

    try:
        results = (
            db.query(
                Submission.id,
                User.username,
                Challenge.name.label("challenge_name"),
                Submission.provided_flag,
                Submission.is_correct,
                Submission.created_at
            )
            .join(User, Submission.user_id == User.id)
            .join(Challenge, Submission.challenge_id == Challenge.id)
            .order_by(Submission.created_at.desc())
            .limit(500)
            .all()
        )

        logs = []
        for r in results:
            logs.append({
                "id": r.id,
                "username": r.username,
                "challenge_name": r.challenge_name,
                "provided_flag": r.provided_flag, 
                "is_correct": r.is_correct,
                "created_at": r.created_at.isoformat() if r.created_at else None
            })

        return logs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"로그를 불러오는 중 에러가 발생했습니다: {str(e)}")

# -------------------------------------------------------------
# 👑 [신규 추가] 특정 유저 어드민 권한 부여/강등 API
# -------------------------------------------------------------
@router.patch("/admin/users/{target_user_id}/role")
def update_user_role(
    target_user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. 호출한 사람이 관리자인지 확인
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")

    # 2. 권한을 변경할 타겟 유저 검색
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="해당 유저를 찾을 수 없습니다.")

    # 3. 권한 변경 (admin <-> player)
    target.role = payload.role
    db.commit()

    return {"success": True, "message": f"성공적으로 {target.username}의 권한이 {payload.role}(으)로 변경되었습니다."}