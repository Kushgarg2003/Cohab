from __future__ import annotations
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = "cohab-dev-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

GOOGLE_CLIENT_ID = "863061899819-p74tbi4qpfi5f4bghlhd946dp96mpnph.apps.googleusercontent.com"


# ---------------------------------------------------------------------------
# User tokens
# ---------------------------------------------------------------------------

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "role": "user", "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    return verify_token(credentials.credentials)


def get_optional_user_id(credentials: HTTPAuthorizationCredentials = Depends(security_optional)) -> str | None:
    if not credentials:
        return None
    try:
        return verify_token(credentials.credentials)
    except HTTPException:
        return None


# ---------------------------------------------------------------------------
# Broker tokens
# ---------------------------------------------------------------------------

def create_broker_token(broker_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": broker_id, "role": "broker", "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_broker_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "broker":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Broker token required")
        broker_id = payload.get("sub")
        if not broker_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return broker_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def verify_approved_broker(
    broker_id: str = Depends(get_current_broker_id),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Dependency: broker must be APPROVED. Returns broker_id."""
    from app.database import SessionLocal
    from app.models import Broker, BrokerStatus
    db = SessionLocal()
    try:
        broker = db.query(Broker).filter(Broker.id == broker_id).first()
        if not broker:
            raise HTTPException(status_code=404, detail="Broker not found")
        if broker.status != BrokerStatus.APPROVED:
            raise HTTPException(
                status_code=403,
                detail="Your account is pending admin approval. You'll receive access once approved."
            )
        return broker_id
    finally:
        db.close()
