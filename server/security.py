from passlib.context import CryptContext
from datetime import datetime
from fastapi.security import APIKeyHeader
from fastapi import Security, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db, User, APIKey
import hashlib
import secrets

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def generate_api_key():
    """Generate a random API key and its hash."""
    raw_key = "sk_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    return raw_key, key_hash

def get_api_key_user(
    api_key: str = Security(api_key_header),
    db: Session = Depends(get_db)
):
    """Dependency to validate API Key and return associated User."""
    if not api_key:
        return None
        
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    key_record = db.query(APIKey).filter(
        APIKey.key_hash == key_hash,
        APIKey.is_active == True
    ).first()
    
    if not key_record:
        raise HTTPException(status_code=403, detail="Invalid API Key")
        
    if key_record.expires_at and key_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=403, detail="API Key expired")
        
    return key_record.user

def check_role(required_role: str):
    """Dependency factory to enforce RBAC."""
    def role_dependency(current_user: User):
        if current_user.role != required_role and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Insufficient privileges")
        return current_user
    return role_dependency
