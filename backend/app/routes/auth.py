from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.database import get_db
from app.models import User
from app.auth import create_access_token, get_current_user_id, GOOGLE_CLIENT_ID
from app.schemas import APIResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/google", response_model=APIResponse)
def google_auth(payload: dict, db: Session = Depends(get_db)):
    token_str = payload.get("id_token")
    if not token_str:
        raise HTTPException(status_code=422, detail="id_token required")

    try:
        info = id_token.verify_oauth2_token(token_str, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    google_id = info["sub"]
    email = info.get("email")
    name = info.get("name")
    picture = info.get("picture")

    # Find existing user by google_id or email
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(google_id=google_id, email=email, name=name, picture=picture)
        db.add(user)
    else:
        user.google_id = google_id
        user.picture = picture
        if email:
            user.email = email
        if name and not user.name:
            user.name = name

    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))

    return APIResponse(
        status="success",
        data={
            "token": token,
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "picture": user.picture,
            "survey_completed": user.survey_completed,
        },
        message="Authenticated successfully"
    )


@router.get("/me", response_model=APIResponse)
def get_me(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return APIResponse(
        status="success",
        data={
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "picture": user.picture,
            "survey_completed": user.survey_completed,
        },
        message="OK"
    )
