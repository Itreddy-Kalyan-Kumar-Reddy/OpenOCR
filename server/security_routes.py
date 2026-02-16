from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy.orm import Session
from database import get_db, APIKey, AuditLog, User
from security import get_api_key_user, generate_api_key, check_role
from auth import get_current_user
from datetime import datetime, timedelta
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

router = APIRouter()

class APIKeyCreate(BaseModel):
    name: str
    expires_in_days: Optional[int] = None

class APIKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    key: str  # Only returned on creation
    created_at: datetime
    expires_at: Optional[datetime] = None

class APIKeyList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool

@router.post("/keys", response_model=APIKeyResponse)
def create_api_key(
    request: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a new API key."""
    raw_key, key_hash = generate_api_key()
    
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)
        
    api_key = APIKey(
        user_id=current_user.id,
        key_hash=key_hash,
        name=request.name,
        expires_at=expires_at
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": raw_key,  # Show once
        "created_at": api_key.created_at,
        "expires_at": api_key.expires_at
    }

@router.get("/keys", response_model=List[APIKeyList])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all API keys for the user."""
    keys = db.query(APIKey).filter(APIKey.user_id == current_user.id, APIKey.is_active == True).all()
    return keys

@router.delete("/keys/{key_id}")
def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke an API key."""
    key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.user_id == current_user.id).first()
    if not key:
        raise HTTPException(404, "API Key not found")
        
    key.is_active = False
    db.commit()
    return {"message": "Key revoked"}

# Audit Logs (Admin Only)
@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """View system audit logs (Admin only)."""
    if current_user.role not in ("admin",):
        raise HTTPException(403, "Admin access required")
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": str(log.timestamp) if log.timestamp else None,
        }
        for log in logs
    ]
