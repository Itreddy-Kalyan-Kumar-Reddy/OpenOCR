"""
Protected API routes for document processing.
"""
import os
import uuid
import time
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from database import get_db, Job, Document, Extraction, ExportRecord, User
from auth import get_current_user
from ocr_engine import extract_text
from extractor import detect_fields, extract_fields, get_available_fields
from excel_export import generate_excel

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
EXPORT_DIR = os.path.join(os.path.dirname(__file__), "exports")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

router = APIRouter(prefix="/api", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"}


# ---- Helpers ----
def _job_to_dict(job: Job) -> dict:
    return {
        "id": job.id,
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "error": job.error,
        "has_excel": bool(job.excel_path),
        "document_count": len(job.documents),
        "documents": [
            {
                "id": doc.id,
                "original_name": doc.original_name,
                "file_size": doc.file_size,
                "ocr_text": doc.ocr_text,
                "ocr_confidence": doc.ocr_confidence,
                "detected_fields": detect_fields(doc.ocr_text) if doc.ocr_text else None,
                "extracted_fields": [
                    {
                        "key": ext.field_key,
                        "label": ext.field_label,
                        "value": ext.value,
                        "confidence": ext.confidence,
                    }
                    for ext in doc.extractions
                ] if doc.extractions else [],
            }
            for doc in job.documents
        ],
    }


# ---- Routes ----
@router.get("/fields")
def list_fields():
    """List all available extraction fields."""
    return get_available_fields()


@router.post("/upload")
async def upload_documents(
    documents: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload documents and create a processing job."""
    if not documents:
        raise HTTPException(400, "No files uploaded")

    # Validate files
    for f in documents:
        ext = os.path.splitext(f.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"Unsupported file type: {ext}")

    # Create job
    job_id = str(uuid.uuid4())
    job = Job(id=job_id, user_id=current_user.id, status="pending")
    db.add(job)

    # Save files
    for f in documents:
        doc_id = str(uuid.uuid4())
        ext = os.path.splitext(f.filename or "")[1].lower()
        stored_name = f"{doc_id}{ext}"
        stored_path = os.path.join(UPLOAD_DIR, stored_name)

        content = await f.read()
        with open(stored_path, "wb") as fp:
            fp.write(content)

        doc = Document(
            id=doc_id,
            job_id=job_id,
            original_name=f.filename,
            stored_path=stored_path,
            file_size=len(content),
            mime_type=f.content_type,
            file_hash=hashlib.sha256(content).hexdigest(),
            upload_timestamp=datetime.utcnow(),
        )
        db.add(doc)

    job.total_documents = len(documents)
    db.commit()
    db.refresh(job)

    print(f"📁 Job {job_id[:8]} created with {len(documents)} doc(s) by user {current_user.email}")
    return _job_to_dict(job)


@router.get("/jobs")
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all jobs for the current user."""
    jobs = (
        db.query(Job)
        .filter(Job.user_id == current_user.id)
        .order_by(Job.created_at.desc())
        .all()
    )
    return [_job_to_dict(j) for j in jobs]


@router.get("/jobs/{job_id}")
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single job by ID."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return _job_to_dict(job)


@router.post("/jobs/{job_id}/ocr")
def run_ocr(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run OCR on all documents in a job."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    job.status = "processing"
    job.updated_at = datetime.utcnow()
    db.commit()

    start_time = time.time()
    try:
        for doc in job.documents:
            result = extract_text(doc.stored_path)
            doc.ocr_text = result["text"]
            doc.ocr_confidence = result["confidence"]
            doc.ocr_processed_at = datetime.utcnow()

        job.status = "completed"
        job.processing_time_ms = int((time.time() - start_time) * 1000)
        job.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(job)
        print(f"✅ OCR completed for job {job_id[:8]} in {job.processing_time_ms}ms")
        return _job_to_dict(job)

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.updated_at = datetime.utcnow()
        db.commit()
        raise HTTPException(500, f"OCR failed: {str(e)}")


@router.post("/jobs/{job_id}/extract")
async def run_extraction(
    job_id: str,
    body: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Extract selected fields from OCR text."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    selected_fields = body.get("selectedFields", [])
    if not selected_fields:
        raise HTTPException(400, "selectedFields array is required")

    try:
        for doc in job.documents:
            if not doc.ocr_text:
                raise HTTPException(400, f"Document '{doc.original_name}' not OCR processed yet")

            # Clear old extractions
            db.query(Extraction).filter(Extraction.document_id == doc.id).delete()

            # Run extraction
            results = await extract_fields(doc.ocr_text, selected_fields)

            for field in results:
                ext = Extraction(
                    document_id=doc.id,
                    field_key=field["key"],
                    field_label=field["label"],
                    value=field["value"],
                    confidence=field["confidence"],
                )
                db.add(ext)

        job.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(job)
        print(f"🎯 Extraction completed for job {job_id[:8]}")
        return _job_to_dict(job)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Extraction failed: {str(e)}")


@router.post("/jobs/{job_id}/export")
def export_excel(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate Excel export for a job."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    # Build export data
    export_docs = []
    for doc in job.documents:
        if doc.extractions:
            export_docs.append({
                "filename": doc.original_name,
                "extracted_fields": [
                    {
                        "key": ext.field_key,
                        "label": ext.field_label,
                        "value": ext.value,
                        "confidence": ext.confidence,
                    }
                    for ext in doc.extractions
                ],
            })

    if not export_docs:
        raise HTTPException(400, "No extracted data to export")

    filename = f"export_{job_id[:8]}_{int(time.time())}.xlsx"
    output_path = os.path.join(EXPORT_DIR, filename)
    generate_excel(export_docs, output_path)

    job.excel_path = output_path
    job.updated_at = datetime.utcnow()

    # Track export in ExportRecord table
    export_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
    total_fields = sum(len(d.get("extracted_fields", [])) for d in export_docs)
    record = ExportRecord(
        job_id=job_id,
        file_path=output_path,
        file_size=export_size,
        document_count=len(export_docs),
        field_count=total_fields,
    )
    db.add(record)
    db.commit()

    return {"message": "Excel generated", "filename": filename, "job_id": job_id}


@router.get("/jobs/{job_id}/download")
def download_excel(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download generated Excel file."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.excel_path or not os.path.exists(job.excel_path):
        raise HTTPException(404, "Excel not generated yet")
    return FileResponse(
        job.excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=os.path.basename(job.excel_path),
    )


@router.post("/jobs/{job_id}/retry")
def retry_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reset a failed job for retry."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    job.status = "pending"
    job.error = None
    job.excel_path = None
    job.updated_at = datetime.utcnow()

    for doc in job.documents:
        doc.ocr_text = None
        doc.ocr_confidence = None
        db.query(Extraction).filter(Extraction.document_id == doc.id).delete()

    db.commit()
    db.refresh(job)
    return _job_to_dict(job)


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a job and its files."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    # Clean up files
    for doc in job.documents:
        if os.path.exists(doc.stored_path):
            os.remove(doc.stored_path)
    if job.excel_path and os.path.exists(job.excel_path):
        os.remove(job.excel_path)

    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


@router.get("/documents/{job_id}/{doc_id}/preview")
def preview_document(
    job_id: str,
    doc_id: str,
    token: str = None,
    db: Session = Depends(get_db),
):
    """Serve uploaded file for preview. Accepts token via query param or Bearer header."""
    from auth import get_current_user as _get_user
    from jose import jwt as _jwt, JWTError
    from auth import SECRET_KEY, ALGORITHM

    # Try query param token first
    user = None
    if token:
        try:
            payload = _jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = int(payload.get("sub"))
            user = db.query(User).filter(User.id == user_id).first()
        except (JWTError, ValueError, TypeError):
            pass

    if not user:
        raise HTTPException(401, "Invalid or missing token")

    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    doc = next((d for d in job.documents if d.id == doc_id), None)
    if not doc or not os.path.exists(doc.stored_path):
        raise HTTPException(404, "Document not found")

    return FileResponse(doc.stored_path, media_type=doc.mime_type or "application/octet-stream")

