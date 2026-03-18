from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db, settings
from app.models import User, SurveyResponse, MatchScore, MutualMatch
from app.schemas import APIResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/users", response_model=APIResponse)
def list_all_users(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Get all users with their survey data."""
    users = db.query(User).order_by(User.created_at.desc()).all()

    result = []
    for user in users:
        survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == user.id).first()
        result.append({
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "picture": user.picture,
            "survey_completed": user.survey_completed,
            "created_at": user.created_at.isoformat(),
            "survey": {
                "budget_range": survey.budget_range.value if survey and survey.budget_range else None,
                "locations": survey.locations or [] if survey else [],
                "move_in_timeline": survey.move_in_timeline.value if survey and survey.move_in_timeline else None,
                "occupancy_type": survey.occupancy_type.value if survey and survey.occupancy_type else None,
                "social_battery": survey.social_battery or [] if survey else [],
                "habits": survey.habits or [] if survey else [],
                "work_study": survey.work_study or [] if survey else [],
                "pets": survey.pets.value if survey and survey.pets else None,
                "smoking": survey.smoking.value if survey and survey.smoking else None,
                "dietary": survey.dietary.value if survey and survey.dietary else None,
                "gender": survey.gender.value if survey and survey.gender else None,
            } if survey else None
        })

    mutual_matches = db.query(MutualMatch).count()

    return APIResponse(
        status="success",
        data={"users": result, "total": len(result), "mutual_matches": mutual_matches},
        message=f"{len(result)} users found"
    )


@router.post("/test-email", response_model=APIResponse)
def test_email(payload: dict, _: None = Depends(verify_admin)):
    """Send a test welcome email to the given address."""
    to = payload.get("email")
    if not to:
        raise HTTPException(status_code=422, detail="email required")
    from app.email_service import send_welcome_email
    success = send_welcome_email(to, payload.get("name", "Tester"))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email — check RESEND_API_KEY in env vars")
    return APIResponse(status="success", data={}, message=f"Test email sent to {to}")


@router.delete("/match-scores", response_model=APIResponse)
def flush_match_scores(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Delete all cached match scores so they recompute with the latest algorithm."""
    count = db.query(MatchScore).delete()
    db.commit()
    return APIResponse(status="success", data={"deleted": count}, message=f"Flushed {count} cached match scores")


@router.delete("/users/{user_id}", response_model=APIResponse)
def delete_user(user_id: str, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Delete a user and all their data."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return APIResponse(
        status="success",
        data={},
        message=f"User {user_id} deleted"
    )
