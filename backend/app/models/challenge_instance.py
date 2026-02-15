from sqlalchemy import Column, Integer, String, UniqueConstraint

from ..db.base import Base


class ChallengeInstance(Base):
    __tablename__ = "challenge_instances"
    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id", name="uq_user_challenge_instance"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    challenge_id = Column(Integer, nullable=False, index=True)

    docker_project_name = Column(String, nullable=False, unique=True, index=True)
    runtime_compose_path = Column(String, nullable=False)
    service_name = Column(String, nullable=False)
    host_port = Column(Integer, nullable=False)
    container_port = Column(Integer, nullable=False)

    created_ts = Column(Integer, nullable=False, index=True)
    expires_ts = Column(Integer, nullable=False, index=True)
