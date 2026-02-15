from pydantic import BaseModel


class ScoreboardRowResponse(BaseModel):
    rank: int
    username: str
    score: int
    solved_count: int
    last_solve_ts: int | None
