"""SQLite persistence for analysis history, using SQLAlchemy."""
from __future__ import annotations
from sqlalchemy import create_engine, Column, String, Float, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime
from ..core_config import DB_PATH

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class AnalysisRecord(Base):
    __tablename__ = "analyses"

    analysis_id = Column(String, primary_key=True)
    query = Column(Text, nullable=False)
    mode = Column(String, nullable=False)
    task = Column(String, nullable=False)
    agent = Column(String, nullable=False)
    selected_model = Column(String, nullable=False)
    answer = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    confidence_label = Column(String, nullable=False)
    evidence_json = Column(Text, nullable=False)
    visual_outputs_json = Column(Text, nullable=False)
    trace_json = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=False)
    image_ids_json = Column(Text, nullable=False)
    is_demo = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class MissionRecord(Base):
    __tablename__ = "missions"

    mission_id = Column(String, primary_key=True)
    objective = Column(Text, nullable=False)
    mission_type = Column(String, nullable=False)
    mission_title = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    image_ids_json = Column(Text, nullable=False)
    tasks_json = Column(Text, nullable=False)
    visual_outputs_json = Column(Text, nullable=False)
    primary_finding = Column(Text, nullable=False)
    executive_summary = Column(Text, nullable=False)
    key_findings_json = Column(Text, nullable=False)
    evidence_cards_json = Column(Text, nullable=False)
    affected_regions_json = Column(Text, nullable=False)
    statistics_json = Column(Text, nullable=False)
    limitations_json = Column(Text, nullable=False)
    missing_input_warning = Column(Text, nullable=True)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_session():
    return SessionLocal()
