from collections import defaultdict
from math import ceil

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.challenge import Challenge
from ..models.challenge_solve import ChallengeSolve
from ..models.user import User

DEFAULT_DYNAMIC_MIN_POINT = 100
DEFAULT_DYNAMIC_DECAY = 50


def normalize_dynamic_params(
    point: int,
    dynamic_min_point: int | None,
    dynamic_decay: int | None,
) -> tuple[int, int]:
    min_point = dynamic_min_point
    if min_point is None:
        min_point = DEFAULT_DYNAMIC_MIN_POINT
    min_point = max(1, min(min_point, point))

    decay = dynamic_decay if dynamic_decay is not None else DEFAULT_DYNAMIC_DECAY
    decay = max(1, decay)
    return min_point, decay


def compute_dynamic_value(
    initial_point: int,
    min_point: int,
    decay: int,
    solve_count: int,
) -> int:
    if solve_count <= 0:
        return initial_point

    curve = ((min_point - initial_point) / float(decay * decay)) * float(solve_count * solve_count)
    return max(min_point, int(ceil(curve + initial_point)))


def compute_challenge_value(challenge: Challenge, solve_count: int) -> int:
    if challenge.score_type != "dynamic":
        return challenge.point

    min_point, decay = normalize_dynamic_params(
        point=challenge.point,
        dynamic_min_point=challenge.dynamic_min_point,
        dynamic_decay=challenge.dynamic_decay,
    )
    return compute_dynamic_value(
        initial_point=challenge.point,
        min_point=min_point,
        decay=decay,
        solve_count=solve_count,
    )


def get_challenge_solve_count_map(db: Session, challenge_ids: list[int]) -> dict[int, int]:
    if not challenge_ids:
        return {}

    rows = (
        db.query(ChallengeSolve.challenge_id, func.count(ChallengeSolve.id))
        .filter(ChallengeSolve.challenge_id.in_(challenge_ids))
        .group_by(ChallengeSolve.challenge_id)
        .all()
    )
    return {challenge_id: count for challenge_id, count in rows}


def recalculate_all_user_scores(db: Session) -> dict[int, int]:
    challenges = db.query(Challenge).all()
    challenge_ids = [challenge.id for challenge in challenges]
    solve_counts = get_challenge_solve_count_map(db, challenge_ids)
    challenge_values = {
        challenge.id: compute_challenge_value(challenge, solve_counts.get(challenge.id, 0))
        for challenge in challenges
    }

    user_scores: dict[int, int] = defaultdict(int)
    solves = db.query(ChallengeSolve.user_id, ChallengeSolve.challenge_id).all()
    for user_id, challenge_id in solves:
        user_scores[user_id] += challenge_values.get(challenge_id, 0)

    users = db.query(User).all()
    changed = False
    for user in users:
        next_score = user_scores.get(user.id, 0)
        if user.score != next_score:
            user.score = next_score
            changed = True

    if changed:
        db.commit()

    return {user.id: user_scores.get(user.id, 0) for user in users}


def build_scoreboard_rows(db: Session) -> list[dict]:
    users = db.query(User).filter(User.role != "admin").all()
    user_ids = [user.id for user in users]

    solved_count_rows = (
        db.query(ChallengeSolve.user_id, func.count(ChallengeSolve.id))
        .filter(ChallengeSolve.user_id.in_(user_ids))
        .group_by(ChallengeSolve.user_id)
        .all()
        if user_ids
        else []
    )
    solved_counts = {user_id: count for user_id, count in solved_count_rows}

    last_solve_rows = (
        db.query(ChallengeSolve.user_id, func.max(ChallengeSolve.solved_at_ts))
        .filter(ChallengeSolve.user_id.in_(user_ids))
        .group_by(ChallengeSolve.user_id)
        .all()
        if user_ids
        else []
    )
    last_solve_map = {user_id: solved_at_ts for user_id, solved_at_ts in last_solve_rows}

    ranked = sorted(
        users,
        key=lambda user: (
            -user.score,
            last_solve_map.get(user.id) if last_solve_map.get(user.id) is not None else 2**31 - 1,
            user.username.lower(),
            user.id,
        ),
    )

    rows = []
    for index, user in enumerate(ranked, start=1):
        rows.append(
            {
                "rank": index,
                "username": user.username,
                "score": user.score,
                "solved_count": solved_counts.get(user.id, 0),
                "last_solve_ts": last_solve_map.get(user.id),
            }
        )
    return rows
