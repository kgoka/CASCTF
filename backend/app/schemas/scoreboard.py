from pydantic import BaseModel
from typing import List

class ScoreHistory(BaseModel):
    ts: int
    score: int

class ScoreboardRowResponse(BaseModel):
    rank: int
    username: str
    score: int
    solved_count: int
    last_solve_ts: int | None
    history: List[ScoreHistory] = []