from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date, datetime
from app.database import get_db
from app.models import User, SurveyResponse, UserGender
from app.schemas import UserResponse, APIResponse, UserCreate

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/", response_model=APIResponse)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user and return their user_id.
    No authentication in Phase 1.
    """
    try:
        new_user = User()
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return APIResponse(
            status="success",
            data={
                "user_id": str(new_user.id),
                "created_at": new_user.created_at.isoformat()
            },
            message="User created successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{user_id}", response_model=APIResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    """
    Get user details with their survey status.
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == user_id).first()

    return APIResponse(
        status="success",
        data={
            "user_id": str(user.id),
            "created_at": user.created_at.isoformat(),
            "survey_completed": user.survey_completed,
            "survey_id": str(survey.id) if survey else None
        },
        message="User retrieved successfully"
    )

@router.patch("/{user_id}/name", response_model=APIResponse)
def update_user_name(user_id: UUID, payload: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name cannot be empty")
    user.name = name
    db.commit()
    return APIResponse(status="success", data={"user_id": str(user.id), "name": user.name}, message="Name saved")

@router.patch("/{user_id}/basic-info", response_model=APIResponse)
def update_basic_info(user_id: UUID, payload: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name cannot be empty")
    dob_str = payload.get("date_of_birth")
    dob = None
    if dob_str:
        try:
            dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
            today = date.today()
            age = (today - dob).days // 365
            if age < 18 or age > 60:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Must be between 18 and 60 years old")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid date format, use YYYY-MM-DD")
    phone = (payload.get("phone") or "").strip() or None
    gender_val = payload.get("gender")
    gender = UserGender(gender_val) if gender_val in [g.value for g in UserGender] else None
    user.name = name
    user.date_of_birth = dob
    user.phone = phone
    user.gender = gender
    db.commit()
    return APIResponse(status="success", data={"user_id": str(user.id)}, message="Basic info saved")

@router.get("/{user_id}/profile", response_model=APIResponse)
def get_user_profile(user_id: UUID, db: Session = Depends(get_db)):
    """
    Get user's complete profile with survey data.
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == user_id).first()

    if not survey:
        return APIResponse(
            status="success",
            data={
                "user_id": str(user.id),
                "name": user.name,
                "gender": user.gender.value if user.gender else None,
                "phone": user.phone,
                "date_of_birth": user.date_of_birth.isoformat() if user.date_of_birth else None,
                "survey_completed": False,
                "is_verified": user.is_verified or False,
                "survey": None
            },
            message="User has no survey yet"
        )

    return APIResponse(
        status="success",
        data={
            "user_id": str(user.id),
            "name": user.name,
            "gender": user.gender.value if user.gender else None,
            "phone": user.phone,
            "date_of_birth": user.date_of_birth.isoformat() if user.date_of_birth else None,
            "survey_completed": user.survey_completed,
            "is_verified": user.is_verified or False,
            "survey": {
                "survey_id": str(survey.id),
                "budget_range": survey.budget_range,
                "locations": survey.locations or [],
                "move_in_timeline": survey.move_in_timeline,
                "occupancy_type": survey.occupancy_type,
                "social_battery": survey.social_battery or [],
                "habits": survey.habits or [],
                "work_study": survey.work_study or [],
                "pets": survey.pets,
                "smoking": survey.smoking,
                "dietary": survey.dietary,
                "gender": survey.gender,
                "deep_dive_responses": survey.deep_dive_responses or {},
                "created_at": survey.created_at.isoformat(),
                "updated_at": survey.updated_at.isoformat()
            }
        },
        message="User profile retrieved successfully"
    )
