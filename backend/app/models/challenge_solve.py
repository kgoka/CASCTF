from sqlalchemy import Column, Integer, UniqueConstraint

from ..db.base import Base


class ChallengeSolve(Base):
    __tablename__ = "challenge_solves"
    __table_args__ = (UniqueConstraint("user_id", "challenge_id", name="uq_user_challenge_solve"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    challenge_id = Column(Integer, nullable=False, index=True)
    solved_at_ts = Column(Integer, nullable=False, index=True)
