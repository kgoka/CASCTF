import os
from pathlib import Path
from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy import case
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.config import CHALLENGE_UPLOAD_DIR
from ..db.session import get_db
from ..models.app_config import AppConfig
from ..models.challenge import Challenge
from ..models.challenge_file import ChallengeFile
from ..models.challenge_solve import ChallengeSolve
from ..models.user import User
from ..schemas.challenge import (
    ChallengeCreate,
    ChallengeAdminResponse,
    ChallengeFileResponse,
    ChallengeResponse,
    ChallengeUpdate,
    FlagSubmitRequest,
    FlagSubmitResponse,
)
from .auth import get_current_user

router = APIRouter(prefix="/api/challenges", tags=["Challenges"])


def _difficulty_order():
    return case(
        (Challenge.difficulty == "NORMAL", 0),
        (Challenge.difficulty == "HARD", 1),
        else_=2,
    )


def _attach_file_names(db: Session, items: List[Challenge]) -> List[Challenge]:
    file_ids = {item.attachment_file_id for item in items if item.attachment_file_id is not None}
    if not file_ids:
        return items

    files = db.query(ChallengeFile).filter(ChallengeFile.id.in_(file_ids)).all()
    file_map = {item.id: item.original_name for item in files}
    for challenge in items:
        challenge.attachment_file_name = file_map.get(challenge.attachment_file_id)
    return items


def _validate_attachment_file(db: Session, attachment_file_id: int | None) -> None:
    if attachment_file_id is None:
        return

    exists = db.query(ChallengeFile).filter(ChallengeFile.id == attachment_file_id).first()
    if not exists:
        raise HTTPException(status_code=400, detail="Attachment file not found")


def _is_ctf_running(db: Session) -> bool:
    cfg = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not cfg:
        return False
    if cfg.duration_start_ts is None or cfg.duration_end_ts is None:
        return False

    now_ts = int(datetime.now(timezone.utc).timestamp())
    return cfg.duration_start_ts <= now_ts < cfg.duration_end_ts


@router.get("", response_model=List[ChallengeResponse])
def list_visible_challenges(db: Session = Depends(get_db)):
    items = (
        db.query(Challenge)
        .filter(Challenge.state == "Visible")
        .order_by(_difficulty_order().asc(), Challenge.id.asc())
        .all()
    )
    return _attach_file_names(db, items)


@router.get("/admin", response_model=List[ChallengeAdminResponse])
def list_all_challenges(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    items = db.query(Challenge).order_by(Challenge.id.asc()).all()
    return _attach_file_names(db, items)


@router.get("/solved/me", response_model=List[int])
def list_my_solved_challenge_ids(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    rows = (
        db.query(ChallengeSolve.challenge_id)
        .filter(ChallengeSolve.user_id == current_user.id)
        .order_by(ChallengeSolve.id.asc())
        .all()
    )
    return [row[0] for row in rows]


@router.post("/files", response_model=ChallengeFileResponse, status_code=201)
async def upload_challenge_file(
    request: Request,
    filename: str = Query(..., min_length=1, max_length=255),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    file_bytes = await request.body()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    original_name = Path(filename).name
    stored_name = f"{uuid4().hex}_{original_name}"
    os.makedirs(CHALLENGE_UPLOAD_DIR, exist_ok=True)
    save_path = os.path.join(CHALLENGE_UPLOAD_DIR, stored_name)

    with open(save_path, "wb") as out_file:
        out_file.write(file_bytes)

    saved = ChallengeFile(
        original_name=original_name,
        stored_name=stored_name,
        content_type=request.headers.get("content-type"),
        file_size=len(file_bytes),
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.post("", response_model=ChallengeAdminResponse, status_code=201)
def create_challenge(
    payload: ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    _validate_attachment_file(db, payload.attachment_file_id)

    new_item = Challenge(
        name=payload.name.strip(),
        category=payload.category,
        difficulty=payload.difficulty,
        message=payload.message.strip(),
        point=payload.point,
        state=payload.state,
        score_type=payload.score_type,
        flag=payload.flag.strip(),
        attachment_file_id=payload.attachment_file_id,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return _attach_file_names(db, [new_item])[0]


@router.put("/{challenge_id}", response_model=ChallengeAdminResponse)
def update_challenge(
    challenge_id: int,
    payload: ChallengeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    target = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Challenge not found")

    _validate_attachment_file(db, payload.attachment_file_id)

    target.name = payload.name.strip()
    target.category = payload.category
    target.difficulty = payload.difficulty
    target.message = payload.message.strip()
    target.point = payload.point
    target.score_type = payload.score_type
    target.state = payload.state
    target.attachment_file_id = payload.attachment_file_id
    if payload.flag is not None:
        target.flag = payload.flag.strip()

    db.commit()
    db.refresh(target)
    return _attach_file_names(db, [target])[0]


@router.delete("/{challenge_id}", status_code=204)
def delete_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    target = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Challenge not found")

    attachment_file_id = target.attachment_file_id
    has_other_attachment_reference = False
    if attachment_file_id is not None:
        has_other_attachment_reference = (
            db.query(Challenge)
            .filter(
                Challenge.attachment_file_id == attachment_file_id,
                Challenge.id != challenge_id,
            )
            .first()
            is not None
        )

    db.query(ChallengeSolve).filter(ChallengeSolve.challenge_id == challenge_id).delete(
        synchronize_session=False
    )
    db.delete(target)

    if attachment_file_id is not None and not has_other_attachment_reference:
        attachment = db.query(ChallengeFile).filter(ChallengeFile.id == attachment_file_id).first()
        if attachment:
            save_path = os.path.join(CHALLENGE_UPLOAD_DIR, attachment.stored_name)
            if os.path.exists(save_path):
                try:
                    os.remove(save_path)
                except OSError:
                    pass
            db.delete(attachment)

    db.commit()
    return None


@router.get("/{challenge_id}/file")
def download_challenge_file(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if challenge.state != "Visible" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    if challenge.attachment_file_id is None:
        raise HTTPException(status_code=404, detail="No attached file")

    attachment = db.query(ChallengeFile).filter(ChallengeFile.id == challenge.attachment_file_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment file not found")

    save_path = os.path.join(CHALLENGE_UPLOAD_DIR, attachment.stored_name)
    if not os.path.exists(save_path):
        raise HTTPException(status_code=404, detail="File missing on server")

    return FileResponse(
        path=save_path,
        filename=attachment.original_name,
        media_type=attachment.content_type or "application/octet-stream",
    )


@router.post("/{challenge_id}/submit-flag", response_model=FlagSubmitResponse)
def submit_flag(
    challenge_id: int,
    payload: FlagSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_ctf_running(db):
        raise HTTPException(status_code=403, detail="CTF is not currently running.")

    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if challenge.state != "Visible" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    if not challenge.flag:
        raise HTTPException(status_code=400, detail="Flag is not configured for this challenge")

    already = (
        db.query(ChallengeSolve)
        .filter(
            ChallengeSolve.user_id == current_user.id,
            ChallengeSolve.challenge_id == challenge.id,
        )
        .first()
    )
    if already:
        return {
            "success": True,
            "message": "Already solved.",
            "awarded_point": 0,
            "total_score": current_user.score,
            "blood": None,
        }

    if payload.flag.strip() != challenge.flag:
        return {
            "success": False,
            "message": "Incorrect flag.",
            "awarded_point": 0,
            "total_score": current_user.score,
            "blood": None,
        }

    solve = ChallengeSolve(user_id=current_user.id, challenge_id=challenge.id)
    current_user.score += challenge.point
    db.add(solve)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        db.refresh(current_user)
        return {
            "success": True,
            "message": "Already solved.",
            "awarded_point": 0,
            "total_score": current_user.score,
            "blood": None,
        }

    db.refresh(current_user)
    solve_order = (
        db.query(ChallengeSolve)
        .filter(ChallengeSolve.challenge_id == challenge.id)
        .count()
    )
    blood = None
    if solve_order == 1:
        blood = "first"
    elif solve_order == 2:
        blood = "second"
    elif solve_order == 3:
        blood = "third"

    return {
        "success": True,
        "message": "Correct flag.",
        "awarded_point": challenge.point,
        "total_score": current_user.score,
        "blood": blood,
    }

