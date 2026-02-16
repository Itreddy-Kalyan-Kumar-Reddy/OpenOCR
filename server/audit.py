from sqlalchemy.orm import Session
from database import AuditLog


def log_audit(db: Session, user_id: int, action: str, resource_type: str, resource_id: str = None, details: dict = None, ip_address: str = None):
    """
    Record an entry in the Audit Log.
    """
    try:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            details=details,
            ip_address=ip_address
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"⚠️ Audit Log Failed: {e}")
