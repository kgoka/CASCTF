import os
from pathlib import Path
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.config import CHALLENGE_UPLOAD_DIR
from ..db.session import get_db
from ..models.challenge import Challenge
from ..models.challenge_file import ChallengeFile
from ..models.challenge_solve import ChallengeSolve
from ..models.user import User
from ..schemas.challenge import (
    ChallengeCreate,
    ChallengeFileResponse,
    ChallengeResponse,
    ChallengeUpdate,
    FlagSubmitRequest,
    FlagSubmitResponse,
)
from .auth import get_current_user

router = APIRouter(prefix="/api/challenges", tags=["Challenges"])


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


@router.get("", response_model=List[ChallengeResponse])
def list_visible_challenges(db: Session = Depends(get_db)):
    items = (
        db.query(Challenge)
        .filter(Challenge.state == "Visible")
        .order_by(Challenge.id.asc())
        .all()
    )
    return _attach_file_names(db, items)


@router.get("/admin", response_model=List[ChallengeResponse])
def list_all_challenges(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    items = db.query(Challenge).order_by(Challenge.id.asc()).all()
    return _attach_file_names(db, items)


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


@router.post("", response_model=ChallengeResponse, status_code=201)
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


@router.put("/{challenge_id}", response_model=ChallengeResponse)
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
        }

    if payload.flag.strip() != challenge.flag:
        return {
            "success": False,
            "message": "Incorrect flag.",
            "awarded_point": 0,
            "total_score": current_user.score,
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
        }

    db.refresh(current_user)
    return {
        "success": True,
        "message": "Correct flag.",
        "awarded_point": challenge.point,
        "total_score": current_user.score,
    }
