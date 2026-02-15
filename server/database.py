"""
Database models and session management using SQLAlchemy + SQLite.
Stores users, processing jobs, uploaded documents, OCR results,
extracted fields, and export records.
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./billscan.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending | processing | completed | failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    error = Column(Text, nullable=True)
    excel_path = Column(String(500), nullable=True)
    total_documents = Column(Integer, default=0)
    total_pages = Column(Integer, default=0)
    processing_time_ms = Column(Integer, nullable=True)

    user = relationship("User", back_populates="jobs")
    documents = relationship("Document", back_populates="job", cascade="all, delete-orphan")
    exports = relationship("ExportRecord", back_populates="job", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    original_name = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), nullable=True)
    file_hash = Column(String(64), nullable=True)       # SHA-256 of file content
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    ocr_text = Column(Text, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    ocr_engine = Column(String(50), default="easyocr")
    ocr_processed_at = Column(DateTime, nullable=True)
    page_count = Column(Integer, default=1)

    job = relationship("Job", back_populates="documents")
    extractions = relationship("Extraction", back_populates="document", cascade="all, delete-orphan")


class Extraction(Base):
    __tablename__ = "extractions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    field_key = Column(String(100), nullable=False)
    field_label = Column(String(100), nullable=False)
    value = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    extraction_method = Column(String(20), default="regex")  # regex | llm
    extracted_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="extractions")


class ExportRecord(Base):
    """Tracks every Excel export generated for a job."""
    __tablename__ = "export_records"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    document_count = Column(Integer, default=0)
    field_count = Column(Integer, default=0)
    exported_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="exports")


def get_db():
    """Dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)
    db_name = DATABASE_URL.split("/")[-1] if "sqlite" in DATABASE_URL else DATABASE_URL.split("@")[-1]
    print(f"✅ Database initialized ({db_name})")
