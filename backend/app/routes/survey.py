from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import User, SurveyResponse, LifestyleTag, LifestyleCategory, MatchScore
from app.schemas import (
    MandatoryDataRequest, MandatoryDataResponse,
    LifestyleTagsRequest, LifestyleTagsResponse,
    DealbreakerRequest, DealbreakerResponse,
    DeepDiveRequest, DeepDiveResponse,
    SurveyPreview, SurveyStatus, APIResponse
)

router = APIRouter(prefix="/api/survey", tags=["survey"])

# ========== Helper Functions ==========

def get_survey_or_404(survey_id: UUID, db: Session):
    """Helper to fetch survey or return 404"""
    survey = db.query(SurveyResponse).filter(SurveyResponse.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    return survey

def calculate_completion_percentage(survey: SurveyResponse) -> float:
    """Calculate survey completion percentage"""
    total_sections = 5
    completed = 0

    if (survey.budget_ranges or survey.budget_range) and survey.locations and survey.move_in_timeline and survey.occupancy_type:
        completed += 1
    if survey.social_battery or survey.habits or survey.work_study:
        completed += 1
    if survey.pets or survey.smoking or survey.dietary or survey.gender:
        completed += 1
    if survey.deep_dive_responses and len(survey.deep_dive_responses) > 0:
        completed += 1
    if survey.user and survey.user.survey_completed:
        completed += 1

    return (completed / total_sections) * 100

# ========== Survey Management ==========

@router.get("/questions", response_model=APIResponse)
def get_all_questions(db: Session = Depends(get_db)):
    """
    Return all survey questions and lifestyle tags.
    Frontend uses this to populate dropdowns and swipe cards.
    """
    # Fetch all lifestyle tags grouped by category
    tags = db.query(LifestyleTag).all()

    social_battery = [
        {"tag_key": t.tag_key, "tag_label": t.tag_label}
        for t in tags if t.category == LifestyleCategory.SOCIAL_BATTERY
    ]
    habits = [
        {"tag_key": t.tag_key, "tag_label": t.tag_label}
        for t in tags if t.category == LifestyleCategory.HABITS
    ]
    work_study = [
        {"tag_key": t.tag_key, "tag_label": t.tag_label}
        for t in tags if t.category == LifestyleCategory.WORK_STUDY
    ]

    questions = {
        "mandatory": {
            "budget_range": {
                "label": "What's your monthly rent budget?",
                "options": ["10k-15k", "15k-20k", "20k-30k", "30k-50k", "50k+"]
            },
            "locations": {
                "label": "Where do you need to be near?",
                "options": [
                    "Bangalore - Koramangala", "Bangalore - Indiranagar", "Bangalore - HSR Layout",
                    "Bangalore - Whitefield", "Bangalore - Electronic City", "Bangalore - Marathahalli",
                    "Bangalore - Bellandur", "Bangalore - Sarjapur Road", "Bangalore - Bannerghatta Road",
                    "Bangalore - JP Nagar", "Bangalore - Jayanagar", "Bangalore - Hebbal",
                    "Bangalore - Yelahanka", "Bangalore - Rajajinagar",
                    "Mumbai - BKC", "Mumbai - Andheri", "Mumbai - Powai", "Mumbai - Thane",
                    "Mumbai - Bandra", "Mumbai - Malad", "Mumbai - Goregaon", "Mumbai - Borivali",
                    "Mumbai - Worli", "Mumbai - Navi Mumbai",
                    "Hyderabad - Gachibowli", "Hyderabad - Hitech City", "Hyderabad - Kondapur",
                    "Hyderabad - Banjara Hills", "Hyderabad - Jubilee Hills", "Hyderabad - Madhapur",
                    "Hyderabad - Miyapur", "Hyderabad - Begumpet",
                    "Delhi - Connaught Place", "Delhi - Lajpat Nagar", "Delhi - Dwarka",
                    "Delhi - Hauz Khas", "Delhi - Saket", "Delhi - Vasant Kunj",
                    "Delhi - Rohini", "Delhi - Nehru Place",
                    "Gurgaon - Cyber City", "Gurgaon - Sohna Road", "Gurgaon - Golf Course Road",
                    "Gurgaon - MG Road", "Gurgaon - DLF Phase 1", "Gurgaon - DLF Phase 2",
                    "Gurgaon - Sector 56",
                    "Noida - Sector 62", "Noida - Sector 18", "Noida - Greater Noida",
                    "Noida - Sector 137", "Noida - Sector 50", "Noida - Expressway",
                    "Pune - Hinjewadi", "Pune - Kothrud", "Pune - Baner",
                    "Pune - Viman Nagar", "Pune - Wakad", "Pune - Aundh",
                    "Pune - Magarpatta", "Pune - Hadapsar", "Pune - Pimpri-Chinchwad",
                    "Chennai - OMR", "Chennai - Anna Nagar", "Chennai - Velachery",
                    "Chennai - T Nagar", "Chennai - Adyar", "Chennai - Porur",
                    "Chennai - Guindy", "Chennai - Sholinganallur",
                    "Kolkata - Salt Lake", "Kolkata - Rajarhat", "Kolkata - New Town",
                    "Kolkata - Park Street", "Kolkata - Ballygunge", "Kolkata - Howrah",
                    "Ahmedabad - SG Highway", "Ahmedabad - Prahlad Nagar",
                    "Ahmedabad - Satellite", "Ahmedabad - Bodakdev",
                    "Indore - Vijay Nagar", "Indore - AB Road", "Indore - Scheme 54",
                    "Jaipur - Vaishali Nagar", "Jaipur - C Scheme", "Jaipur - Malviya Nagar"
                ]
            },
            "move_in_timeline": {
                "label": "When are you looking to shift?",
                "options": ["ASAP", "1-month", "2-3-months"]
            },
            "occupancy_type": {
                "label": "Are you looking for a private room or shared?",
                "options": ["private", "twin-sharing"]
            }
        },
        "lifestyle_tags": {
            "social_battery": social_battery,
            "habits": habits,
            "work_study": work_study
        },
        "deep_dive_prompts": [
            "My ideal Sunday in the apartment looks like...",
            "The one house rule I won't compromise on is...",
            "In a roommate, I value [X] more than anything else.",
            "My 'toxic' roommate trait is..."
        ]
    }

    return APIResponse(
        status="success",
        data={"questions": questions},
        message="Survey questions retrieved successfully"
    )

@router.post("/start", response_model=APIResponse)
def start_survey(user_id: UUID, db: Session = Depends(get_db)):
    """
    Initialize a new survey for a user.
    Returns survey_id to use in subsequent requests.
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if survey already exists
    existing_survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == user_id).first()
    if existing_survey:
        return APIResponse(
            status="success",
            data={"survey_id": str(existing_survey.id), "message": "Survey already exists"},
            message="Survey retrieved"
        )

    try:
        new_survey = SurveyResponse(user_id=user_id)
        db.add(new_survey)
        db.commit()
        db.refresh(new_survey)

        return APIResponse(
            status="success",
            data={
                "survey_id": str(new_survey.id),
                "user_id": str(user_id),
                "created_at": new_survey.created_at.isoformat()
            },
            message="Survey started successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ========== Mandatory Data Endpoints ==========

@router.post("/{survey_id}/mandatory", response_model=APIResponse)
def save_mandatory_data(survey_id: UUID, data: MandatoryDataRequest, db: Session = Depends(get_db)):
    """Save mandatory hard constraints"""
    survey = get_survey_or_404(survey_id, db)

    try:
        survey.budget_ranges = data.budget_ranges
        survey.locations = data.locations
        survey.move_in_timelines = data.move_in_timelines or []
        survey.occupancy_types = data.occupancy_types or []
        # keep legacy single fields in sync with first selection for backward compat
        if data.move_in_timelines:
            survey.move_in_timeline = data.move_in_timelines[0]
        if data.occupancy_types:
            survey.occupancy_type = data.occupancy_types[0]
        survey.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(survey)

        return APIResponse(
            status="success",
            data={
                "survey_id": str(survey.id),
                "budget_ranges": survey.budget_ranges,
                "locations": survey.locations,
                "move_in_timeline": survey.move_in_timeline,
                "occupancy_type": survey.occupancy_type,
                "updated_at": survey.updated_at.isoformat()
            },
            message="Mandatory data saved successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ========== Lifestyle Tags Endpoints ==========

@router.post("/{survey_id}/lifestyle", response_model=APIResponse)
def save_lifestyle_tags(survey_id: UUID, data: LifestyleTagsRequest, db: Session = Depends(get_db)):
    """Save lifestyle personality tags"""
    survey = get_survey_or_404(survey_id, db)

    try:
        survey.social_battery = data.social_battery or []
        survey.habits = data.habits or []
        survey.work_study = data.work_study or []
        survey.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(survey)

        return APIResponse(
            status="success",
            data={
                "survey_id": str(survey.id),
                "social_battery": survey.social_battery,
                "habits": survey.habits,
                "work_study": survey.work_study,
                "updated_at": survey.updated_at.isoformat()
            },
            message="Lifestyle tags saved successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ========== Dealbreaker Endpoints ==========

@router.post("/{survey_id}/dealbreakers", response_model=APIResponse)
def save_dealbreakers(survey_id: UUID, data: DealbreakerRequest, db: Session = Depends(get_db)):
    """Save dealbreaker badges"""
    survey = get_survey_or_404(survey_id, db)

    try:
        survey.pets = data.pets
        survey.smoking = data.smoking.value if data.smoking else None
        survey.dietary = data.dietary
        survey.gender = data.gender
        survey.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(survey)

        return APIResponse(
            status="success",
            data={
                "survey_id": str(survey.id),
                "pets": survey.pets,
                "smoking": survey.smoking,
                "dietary": survey.dietary,
                "gender": survey.gender,
                "updated_at": survey.updated_at.isoformat()
            },
            message="Dealbreakers saved successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ========== Deep Dive Endpoints ==========

@router.post("/{survey_id}/deep-dive", response_model=APIResponse)
def save_deep_dive(survey_id: UUID, data: DeepDiveRequest, db: Session = Depends(get_db)):
    """Save open-ended deep dive responses"""
    survey = get_survey_or_404(survey_id, db)

    try:
        survey.deep_dive_responses = data.responses
        survey.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(survey)

        return APIResponse(
            status="success",
            data={
                "survey_id": str(survey.id),
                "deep_dive_responses": survey.deep_dive_responses,
                "updated_at": survey.updated_at.isoformat()
            },
            message="Deep dive responses saved successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ========== Survey View Endpoints ==========

@router.get("/{survey_id}/preview", response_model=APIResponse)
def preview_survey(survey_id: UUID, db: Session = Depends(get_db)):
    """Get complete survey preview"""
    survey = get_survey_or_404(survey_id, db)

    preview = {
        "survey_id": str(survey.id),
        "user_id": str(survey.user_id),
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

    return APIResponse(
        status="success",
        data=preview,
        message="Survey preview retrieved successfully"
    )

@router.get("/{survey_id}/status", response_model=APIResponse)
def survey_status(survey_id: UUID, db: Session = Depends(get_db)):
    """Get survey completion status"""
    survey = get_survey_or_404(survey_id, db)

    completion = calculate_completion_percentage(survey)
    sections = {
        "mandatory": bool(
            (survey.budget_ranges or survey.budget_range) and survey.locations and
            survey.move_in_timeline and survey.occupancy_type
        ),
        "lifestyle": bool(survey.social_battery or survey.habits or survey.work_study),
        "dealbreakers": bool(survey.pets or survey.smoking or survey.dietary or survey.gender),
        "deep_dive": bool(survey.deep_dive_responses and len(survey.deep_dive_responses) > 0),
        "completed": bool(survey.user.survey_completed if survey.user else False)
    }

    return APIResponse(
        status="success",
        data={
            "survey_id": str(survey.id),
            "completion_percentage": round(completion, 2),
            "is_completed": completion == 100,
            "sections": sections
        },
        message="Survey status retrieved successfully"
    )

@router.post("/{survey_id}/submit", response_model=APIResponse)
def submit_survey(survey_id: UUID, db: Session = Depends(get_db)):
    """Mark survey as complete"""
    survey = get_survey_or_404(survey_id, db)
    user = survey.user

    try:
        user.survey_completed = True
        user.updated_at = datetime.utcnow()

        # Invalidate cached match scores so they're recomputed fresh
        db.query(MatchScore).filter(
            (MatchScore.user_a_id == user.id) | (MatchScore.user_b_id == user.id)
        ).delete(synchronize_session=False)

        db.commit()
        db.refresh(user)

        return APIResponse(
            status="success",
            data={
                "user_id": str(user.id),
                "survey_completed": True,
                "message": "Survey submitted successfully"
            },
            message="Survey marked as complete"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
