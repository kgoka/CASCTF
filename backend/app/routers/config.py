from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.app_config import AppConfig
from ..models.user import User
from ..schemas.config import (
    AdminConfigDurationUpdate,
    AdminConfigGeneralUpdate,
    AdminConfigResponse,
    PublicConfigResponse,
)
from .auth import get_current_user

router = APIRouter(prefix="/api/config", tags=["Config"])


def _normalize_ctf_name(name: str) -> str:
    normalized = " ".join(name.split())
    return normalized[:80] if len(normalized) > 80 else normalized


def _get_or_create_config(db: Session) -> AppConfig:
    cfg = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if cfg:
        return cfg

    cfg = AppConfig(id=1, ctf_name="CASCTF", duration_start_ts=None, duration_end_ts=None)
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


def _is_active(cfg: AppConfig) -> bool:
    if cfg.duration_start_ts is None or cfg.duration_end_ts is None:
        return False

    now_ts = int(datetime.now(timezone.utc).timestamp())
    return cfg.duration_start_ts <= now_ts < cfg.duration_end_ts


def _to_response_payload(cfg: AppConfig) -> dict:
    return {
        "ctf_name": cfg.ctf_name,
        "duration_start_ts": cfg.duration_start_ts,
        "duration_end_ts": cfg.duration_end_ts,
        "is_active": _is_active(cfg),
    }


@router.get("/public", response_model=PublicConfigResponse)
def get_public_config(db: Session = Depends(get_db)):
    cfg = _get_or_create_config(db)
    return _to_response_payload(cfg)


@router.get("/admin", response_model=AdminConfigResponse)
def get_admin_config(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    cfg = _get_or_create_config(db)
    return _to_response_payload(cfg)


@router.put("/admin/general", response_model=AdminConfigResponse)
def update_admin_config_general(
    payload: AdminConfigGeneralUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    ctf_name = _normalize_ctf_name(payload.ctf_name)
    if not ctf_name:
        raise HTTPException(status_code=400, detail="CTF name cannot be empty.")

    cfg = _get_or_create_config(db)
    cfg.ctf_name = ctf_name
    db.commit()
    db.refresh(cfg)
    return _to_response_payload(cfg)


@router.put("/admin/duration", response_model=AdminConfigResponse)
def update_admin_config_duration(
    payload: AdminConfigDurationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    start_ts = payload.duration_start_ts
    end_ts = payload.duration_end_ts

    if (start_ts is None) != (end_ts is None):
        raise HTTPException(
            status_code=400,
            detail="Both duration_start_ts and duration_end_ts must be provided together.",
        )
    if start_ts is not None and end_ts is not None and start_ts >= end_ts:
        raise HTTPException(
            status_code=400,
            detail="duration_end_ts must be greater than duration_start_ts.",
        )

    cfg = _get_or_create_config(db)
    cfg.duration_start_ts = start_ts
    cfg.duration_end_ts = end_ts
    db.commit()
    db.refresh(cfg)
    return _to_response_payload(cfg)
