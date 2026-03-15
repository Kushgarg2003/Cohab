from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SurveyResponse
from app.schemas import APIResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=APIResponse)
def list_all_users(db: Session = Depends(get_db)):
    """Get all users with their survey data."""
    users = db.query(User).order_by(User.created_at.desc()).all()

    result = []
    for user in users:
        survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == user.id).first()
        result.append({
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
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

    return APIResponse(
        status="success",
        data={"users": result, "total": len(result)},
        message=f"{len(result)} users found"
    )
