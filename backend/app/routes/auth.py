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

    is_new_user = False
    if not user:
        user = User(google_id=google_id, email=email, name=name, picture=picture)
        db.add(user)
        is_new_user = True
    else:
        user.google_id = google_id
        user.picture = picture
        if email:
            user.email = email
        if name and not user.name:
            user.name = name

    db.commit()
    db.refresh(user)

    import threading
    from app.database import SessionLocal

    if is_new_user and user.email:
        _we, _wn, _wid = user.email, user.name or "", user.id
        def _send_welcome(email=_we, name=_wn, uid=_wid):
            thread_db = SessionLocal()
            try:
                u = thread_db.query(User).filter(User.id == uid).first()
                from app.email_service import send_welcome_email
                send_welcome_email(email, name, user=u, db=thread_db)
            except Exception as e:
                print(f"[email] Welcome email failed: {e}")
            finally:
                thread_db.close()
        threading.Thread(target=_send_welcome, daemon=True).start()

    else:
        # Returning user — check for survey reminder and conversation nudge
        _uid = user.id
        _email = user.email
        _name = user.name or ""

        def _check_and_nudge(uid=_uid, email=_email, name=_name):
            from datetime import datetime, timedelta
            from app.database import SessionLocal
            from app.models import User, MutualMatch, Message, GroupMember, EmailLog
            from app.routes.communication import _is_eligible_for_reminder
            from app.email_service import send_survey_reminder_email, send_conversation_nudge_email

            thread_db = SessionLocal()
            try:
                u = thread_db.query(User).filter(User.id == uid).first()
                if not u or not u.email or u.email_unsubscribed:
                    return

                # ── Survey reminder ──────────────────────────────────────
                if not u.survey_completed:
                    hours_since_signup = (datetime.utcnow() - u.created_at).total_seconds() / 3600
                    if hours_since_signup >= 24:
                        eligible, num = _is_eligible_for_reminder(u, thread_db)
                        if eligible:
                            send_survey_reminder_email(u.email, u.name or "there", num, user=u, db=thread_db)

                # ── Conversation nudge for silent matches ────────────────
                else:
                    # Already sent a nudge in last 7 days?
                    recent_nudge = thread_db.query(EmailLog).filter(
                        EmailLog.user_id == uid,
                        EmailLog.email_type == "conversation_nudge",
                        EmailLog.sent_at >= datetime.utcnow() - timedelta(days=7),
                    ).first()
                    if recent_nudge:
                        return

                    # Find matches older than 3 days with 0 messages from this user
                    matches = thread_db.query(MutualMatch).filter(
                        (MutualMatch.user_a_id == uid) | (MutualMatch.user_b_id == uid),
                        MutualMatch.matched_at <= datetime.utcnow() - timedelta(days=3),
                    ).all()

                    for m in matches:
                        if not m.group_id:
                            continue
                        msg_count = thread_db.query(Message).filter(
                            Message.group_id == m.group_id
                        ).count()
                        if msg_count == 0:
                            other_id = m.user_b_id if m.user_a_id == uid else m.user_a_id
                            other = thread_db.query(User).filter(User.id == other_id).first()
                            send_conversation_nudge_email(
                                u.email, u.name or "there",
                                other.name if other else "your match",
                                str(m.group_id),
                                user=u, db=thread_db
                            )
                            break  # one nudge per login max
            except Exception as e:
                print(f"[email] Login nudge check failed: {e}")
            finally:
                thread_db.close()

        threading.Thread(target=_check_and_nudge, daemon=True).start()

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
