import os
from celery_worker import celery_app
from ocr_engine import extract_text
from extractor import extract_fields_sync  # We'll need to rename/refactor this
from database import SessionLocal, Job, Document, Extraction
from datetime import datetime
import json
import redis
import os

# Initialize Redis client for publishing updates
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL)

# We need a synchronous version of extract_fields or wrap the async one
# For now, let's assume we use the synchronous logic we have or adapted it.

@celery_app.task(bind=True)
def process_ocr_task(self, job_id: str, doc_ids: list, languages: list = ["en"]):
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
                result = extract_text(doc.stored_path, languages=languages)
                doc.ocr_text = result["text"]
                doc.ocr_confidence = result["confidence"]
                doc.ocr_engine = result.get("method", "easyocr")
                doc.ocr_processed_at = datetime.utcnow()
                doc.ocr_processed_at = datetime.utcnow()
                
                # Update task state (Celery)
                self.update_state(state='PROGRESS', meta={'current': idx + 1, 'total': total})

                # Publish real-time update to Redis
                progress_percent = int(((idx + 1) / total) * 100)
                event = {
                    "type": "job_progress",
                    "job_id": job_id,
                    "progress": progress_percent,
                    "status": "processing",
                    "current_doc": idx + 1,
                    "total_docs": total
                }
                redis_client.publish("job_updates", json.dumps(event))

        job.status = "completed"
        job.updated_at = datetime.utcnow()
        db.commit()

        # Publish completion event
        completion_event = {
            "type": "job_completed",
            "job_id": job_id,
            "status": "completed",
            "progress": 100
        }
        redis_client.publish("job_updates", json.dumps(completion_event))

        return {"status": "completed", "job_id": job_id}

    except Exception as e:
        if job:
            job.status = "failed"
            job.error = str(e)
            db.commit()
            
            # Publish failure event
            failure_event = {
                "type": "job_failed",
                "job_id": job_id,
                "status": "failed",
                "error": str(e)
            }
            redis_client.publish("job_updates", json.dumps(failure_event))
        
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()
