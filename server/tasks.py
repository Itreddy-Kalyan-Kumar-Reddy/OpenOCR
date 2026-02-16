import os
from celery_worker import celery_app
from ocr_engine import extract_text
from extractor import extract_fields_sync  # We'll need to rename/refactor this
from database import SessionLocal, Job, Document, Extraction
from datetime import datetime
import json

# We need a synchronous version of extract_fields or wrap the async one
# For now, let's assume we use the synchronous logic we have or adapted it.

@celery_app.task(bind=True)
def process_ocr_task(self, job_id: str, doc_ids: list):
    """
    Async Celery task to run OCR on a list of documents.
    """
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return {"status": "failed", "error": "Job not found"}

        job.status = "processing"
        job.updated_at = datetime.utcnow()
        db.commit()

        # Update progress (optional, via Redis/Celery state)
        total = len(doc_ids)
        
        for idx, doc_id in enumerate(doc_ids):
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if doc:
                # Run OCR
                result = extract_text(doc.stored_path)
                doc.ocr_text = result["text"]
                doc.ocr_confidence = result["confidence"]
                doc.ocr_processed_at = datetime.utcnow()
                
                # Update task state
                self.update_state(state='PROGRESS', meta={'current': idx + 1, 'total': total})

        job.status = "completed"
        job.updated_at = datetime.utcnow()
        db.commit()
        return {"status": "completed", "job_id": job_id}

    except Exception as e:
        if job:
            job.status = "failed"
            job.error = str(e)
            db.commit()
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()
