from sqlalchemy import Column, Integer, String

from ..db.base import Base


class AppConfig(Base):
    __tablename__ = "app_config"

    id = Column(Integer, primary_key=True, index=True)
    ctf_name = Column(String, nullable=False, default="CASCTF")
    duration_start_ts = Column(Integer, nullable=True)
    duration_end_ts = Column(Integer, nullable=True)
