from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..schemas.scoreboard import ScoreboardRowResponse
from ..services.scoring import build_scoreboard_rows, recalculate_all_user_scores

router = APIRouter(prefix="/api/scoreboard", tags=["Scoreboard"])


@router.get("", response_model=list[ScoreboardRowResponse])
def get_scoreboard(db: Session = Depends(get_db)):
    recalculate_all_user_scores(db)
    return build_scoreboard_rows(db)
