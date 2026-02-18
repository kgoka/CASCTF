from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.notification import Notification
from ..models.user import User
from ..schemas.notification import (
    NotificationClearResponse,
    NotificationCreate,
    NotificationResponse,
)
from .auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


def _now_ts() -> int:
    return int(datetime.now(timezone.utc).timestamp())


@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=500),
    after_id: int | None = Query(default=None, ge=0),
):
    query = db.query(Notification)
    if after_id is not None:
        # Return only newer notifications to reduce polling payload.
        return (
            query.filter(Notification.id > after_id)
            .order_by(Notification.id.asc())
            .limit(limit)
            .all()
        )

    return query.order_by(Notification.id.desc()).limit(limit).all()


@router.get("/admin", response_model=List[NotificationResponse])
def list_notifications_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=200, ge=1, le=1000),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return db.query(Notification).order_by(Notification.id.desc()).limit(limit).all()


@router.post("/admin", response_model=NotificationResponse, status_code=201)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    item = Notification(
        title=payload.title.strip(),
        content=payload.content.strip(),
        notice_type=payload.notice_type,
        play_sound=payload.play_sound,
        created_by=current_user.username,
        created_ts=_now_ts(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/admin/clear", response_model=NotificationClearResponse)
def clear_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    deleted_count = db.query(Notification).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": deleted_count}


@router.delete("/admin/{notification_id}", status_code=204)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    target = db.query(Notification).filter(Notification.id == notification_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(target)
    db.commit()
    return None
