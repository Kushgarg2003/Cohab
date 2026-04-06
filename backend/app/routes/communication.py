from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from uuid import UUID
from app.database import get_db, settings
from app.models import User, EmailLog, UserSwipe, SwipeAction
from app.schemas import APIResponse

router = APIRouter(tags=["communication"])

ADMIN_ROUTER = APIRouter(prefix="/api/admin/communication", tags=["communication"])
PUBLIC_ROUTER = APIRouter(tags=["communication"])


def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reminder_count(user_id, db) -> int:
    return db.query(EmailLog).filter(
        EmailLog.user_id == user_id,
        EmailLog.email_type.like("survey_reminder_%"),
    ).count()


def _last_likes_email(user_id, db):
    row = db.query(EmailLog).filter(
        EmailLog.user_id == user_id,
        EmailLog.email_type == "has_likes",
    ).order_by(EmailLog.sent_at.desc()).first()
    return row.sent_at if row else None


def _is_eligible_for_reminder(user, db) -> tuple[bool, int]:
    """Returns (eligible, next_reminder_number). Eligible if < 3 reminders sent."""
    if user.survey_completed or user.email_unsubscribed or not user.email:
        return False, 0
    count = _reminder_count(user.id, db)
    if count >= 3:
        return False, 0
    return True, count + 1


def _is_eligible_for_likes_email(user, db) -> bool:
    if not user.survey_completed or user.email_unsubscribed or not user.email:
        return False
    last = _last_likes_email(user.id, db)
    if last and (datetime.utcnow() - last) < timedelta(days=7):
        return False
    return True


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@ADMIN_ROUTER.get("/stats", response_model=APIResponse)
def get_stats(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    total = db.query(User).filter(User.email.isnot(None)).count()
    unsubscribed = db.query(User).filter(User.email_unsubscribed == True).count()
    today = datetime.utcnow().date()
    sent_today = db.query(EmailLog).filter(
        func.date(EmailLog.sent_at) == today
    ).count()
    sent_month = db.query(EmailLog).filter(
        EmailLog.sent_at >= datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    ).count()

    # Eligible counts
    all_users = db.query(User).filter(User.email.isnot(None)).all()
    survey_eligible = sum(1 for u in all_users if _is_eligible_for_reminder(u, db)[0])

    liked_target_ids = {
        s.target_id for s in db.query(UserSwipe).filter(
            UserSwipe.action == SwipeAction.LIKE
        ).all()
    }
    likes_eligible = sum(
        1 for u in all_users
        if u.id in liked_target_ids and _is_eligible_for_likes_email(u, db)
    )

    return APIResponse(
        status="success",
        data={
            "total_subscribers": total - unsubscribed,
            "unsubscribed": unsubscribed,
            "sent_today": sent_today,
            "sent_month": sent_month,
            "survey_reminder_eligible": survey_eligible,
            "has_likes_eligible": likes_eligible,
        },
        message="Stats loaded",
    )


# ---------------------------------------------------------------------------
# Email logs
# ---------------------------------------------------------------------------

@ADMIN_ROUTER.get("/logs", response_model=APIResponse)
def get_logs(
    limit: int = 50,
    offset: int = 0,
    email_type: str = None,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    q = db.query(EmailLog, User).join(User, EmailLog.user_id == User.id)
    if email_type:
        q = q.filter(EmailLog.email_type == email_type)
    total = q.count()
    rows = q.order_by(EmailLog.sent_at.desc()).offset(offset).limit(limit).all()
    logs = [
        {
            "id": str(log.id),
            "user_id": str(log.user_id),
            "name": user.name,
            "email": user.email,
            "email_type": log.email_type,
            "subject": log.subject,
            "sent_at": log.sent_at.isoformat(),
        }
        for log, user in rows
    ]
    return APIResponse(status="success", data={"logs": logs, "total": total}, message=f"{total} logs")


# ---------------------------------------------------------------------------
# Per-user email history (for admin user table)
# ---------------------------------------------------------------------------

@ADMIN_ROUTER.get("/user/{user_id}/history", response_model=APIResponse)
def get_user_email_history(user_id: str, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid user_id")
    logs = db.query(EmailLog).filter(EmailLog.user_id == uid).order_by(EmailLog.sent_at.desc()).all()
    return APIResponse(
        status="success",
        data={
            "logs": [{"type": l.email_type, "subject": l.subject, "sent_at": l.sent_at.isoformat()} for l in logs],
            "reminder_count": sum(1 for l in logs if l.email_type.startswith("survey_reminder_")),
        },
        message=f"{len(logs)} emails sent",
    )


# ---------------------------------------------------------------------------
# Campaigns
# ---------------------------------------------------------------------------

@ADMIN_ROUTER.post("/campaign", response_model=APIResponse)
def run_campaign(payload: dict, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """
    Run a smart campaign. Automatically respects limits, cooldowns, unsubscribes.
    payload.type: 'survey_reminder' | 'has_likes' | 'custom'
    For 'custom': payload.subject, payload.body_html required.
    Optional: payload.user_ids (list) to send to specific users only.
    """
    from app.email_service import send_survey_reminder_email, send_you_have_likes_email, send_custom_broadcast_email

    campaign_type = payload.get("type")
    if campaign_type not in ("survey_reminder", "has_likes", "custom"):
        raise HTTPException(status_code=422, detail="Invalid campaign type")

    # Optional: restrict to specific user IDs
    target_ids = payload.get("user_ids")  # list of str UUIDs or None

    sent = failed = skipped = 0

    if campaign_type == "survey_reminder":
        users = db.query(User).filter(User.email.isnot(None)).all()
        if target_ids:
            users = [u for u in users if str(u.id) in target_ids]
        for user in users:
            eligible, num = _is_eligible_for_reminder(user, db)
            if not eligible:
                skipped += 1
                continue
            ok = send_survey_reminder_email(user.email, user.name or "there", num, user=user, db=db)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

    elif campaign_type == "has_likes":
        liked_target_ids = {
            s.target_id for s in db.query(UserSwipe).filter(
                UserSwipe.action == SwipeAction.LIKE
            ).all()
        }
        like_counts = {}
        for s in db.query(UserSwipe).filter(UserSwipe.action == SwipeAction.LIKE).all():
            like_counts[s.target_id] = like_counts.get(s.target_id, 0) + 1

        users = db.query(User).filter(User.email.isnot(None)).all()
        if target_ids:
            users = [u for u in users if str(u.id) in target_ids]
        for user in users:
            if user.id not in liked_target_ids or not _is_eligible_for_likes_email(user, db):
                skipped += 1
                continue
            count = like_counts.get(user.id, 1)
            ok = send_you_have_likes_email(user.email, user.name or "there", count, user=user, db=db)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

    elif campaign_type == "custom":
        subject = payload.get("subject", "").strip()
        body_html = payload.get("body_html", "").strip()
        if not subject or not body_html:
            raise HTTPException(status_code=422, detail="subject and body_html required")
        users = db.query(User).filter(
            User.email.isnot(None),
            User.email_unsubscribed != True,
        ).all()
        if target_ids:
            users = [u for u in users if str(u.id) in target_ids]
        for user in users:
            ok = send_custom_broadcast_email(user.email, user.name or "there", subject, body_html, user=user, db=db)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

    return APIResponse(
        status="success",
        data={"sent": sent, "failed": failed, "skipped": skipped, "total": sent + failed + skipped},
        message=f"Done: {sent} sent, {skipped} skipped (already emailed/unsubscribed), {failed} failed",
    )


# ---------------------------------------------------------------------------
# Unsubscribe (public — no auth)
# ---------------------------------------------------------------------------

@PUBLIC_ROUTER.get("/unsubscribe/{token}", response_class=HTMLResponse)
def unsubscribe(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.unsubscribe_token == token).first()
    if not user:
        return HTMLResponse(content=_unsub_page("Invalid or expired unsubscribe link."), status_code=404)
    user.email_unsubscribed = True
    db.commit()
    return HTMLResponse(content=_unsub_page(f"You've been unsubscribed. You won't receive any more emails from Colocsy."))


def _unsub_page(message: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Colocsy — Unsubscribe</title>
  <style>
    body {{ margin: 0; background: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }}
    .box {{ background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px; padding: 48px 40px; max-width: 420px; text-align: center; }}
    h1 {{ font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #fff; }}
    p {{ font-size: 14px; color: #aaa; line-height: 1.6; margin: 0 0 24px; }}
    a {{ color: #6c47ff; text-decoration: none; font-size: 14px; }}
  </style>
</head>
<body>
  <div class="box">
    <h1>Colocsy</h1>
    <p>{message}</p>
    <a href="https://colocsy.com">Back to Colocsy →</a>
  </div>
</body>
</html>"""


# Register both sub-routers
router = APIRouter()
router.include_router(ADMIN_ROUTER)
router.include_router(PUBLIC_ROUTER)
