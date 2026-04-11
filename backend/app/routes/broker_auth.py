from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.models import Broker, BrokerStatus
from app.auth import create_broker_token, get_current_broker_id
from app.schemas import APIResponse

router = APIRouter(prefix="/api/broker/auth", tags=["broker-auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash(password: str) -> str:
    return pwd_context.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _broker_public(broker: Broker) -> dict:
    return {
        "id": str(broker.id),
        "email": broker.email,
        "display_name": broker.display_name,
        "city": broker.city,
        "status": broker.status.value,
        "created_at": broker.created_at.isoformat(),
    }


@router.post("/register", response_model=APIResponse)
def register(payload: dict, db: Session = Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    display_name = (payload.get("display_name") or "").strip()
    phone = (payload.get("phone") or "").strip()
    city = (payload.get("city") or "").strip()

    if not email or not password or not display_name:
        raise HTTPException(status_code=422, detail="email, password, and display_name are required")
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    existing = db.query(Broker).filter(Broker.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    broker = Broker(
        email=email,
        hashed_password=_hash(password),
        display_name=display_name,
        phone=phone or None,
        city=city or None,
        status=BrokerStatus.PENDING,
    )
    db.add(broker)
    db.commit()
    db.refresh(broker)

    token = create_broker_token(str(broker.id))
    return APIResponse(
        status="success",
        data={"token": token, "broker": _broker_public(broker)},
        message="Registration successful. Your account is pending admin approval.",
    )


@router.post("/login", response_model=APIResponse)
def login(payload: dict, db: Session = Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    broker = db.query(Broker).filter(Broker.email == email).first()
    if not broker or not _verify(password, broker.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if broker.status == BrokerStatus.SUSPENDED:
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support.")

    token = create_broker_token(str(broker.id))
    return APIResponse(
        status="success",
        data={"token": token, "broker": _broker_public(broker)},
        message="Login successful",
    )


@router.get("/me", response_model=APIResponse)
def get_me(broker_id: str = Depends(get_current_broker_id), db: Session = Depends(get_db)):
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    # me endpoint shows phone (to self only)
    data = _broker_public(broker)
    data["phone"] = broker.phone
    return APIResponse(status="success", data=data, message="OK")
