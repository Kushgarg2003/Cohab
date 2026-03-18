from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import User, SurveyResponse, MatchScore
from app.matching import compute_match_score
from app.schemas import APIResponse

router = APIRouter(prefix="/api/matches", tags=["matching"])


def _get_or_compute_score(user_a_id: UUID, user_b_id: UUID, db: Session) -> MatchScore:
    """Fetch cached score or compute and store it. Always stores with smaller UUID first."""
    a_id, b_id = sorted([str(user_a_id), str(user_b_id)])
    a_uuid, b_uuid = UUID(a_id), UUID(b_id)

    existing = db.query(MatchScore).filter(
        MatchScore.user_a_id == a_uuid,
        MatchScore.user_b_id == b_uuid
    ).first()

    if existing:
        return existing

    survey_a = db.query(SurveyResponse).filter(SurveyResponse.user_id == a_uuid).first()
    survey_b = db.query(SurveyResponse).filter(SurveyResponse.user_id == b_uuid).first()

    if not survey_a or not survey_b:
        return None

    user_a = db.query(User).filter(User.id == a_uuid).first()
    user_b = db.query(User).filter(User.id == b_uuid).first()
    gender_a = user_a.gender.value if user_a and user_a.gender else None
    gender_b = user_b.gender.value if user_b and user_b.gender else None

    result = compute_match_score(survey_a, survey_b, gender_a, gender_b)

    match = MatchScore(
        user_a_id=a_uuid,
        user_b_id=b_uuid,
        score=result["score"],
        breakdown=result["breakdown"],
        computed_at=datetime.utcnow()
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.get("/{user_id}", response_model=APIResponse)
def get_matches(
    user_id: UUID,
    limit: int = Query(default=10, le=50),
    min_score: float = Query(default=0.0, ge=0.0, le=100.0),
    db: Session = Depends(get_db)
):
    """Get top matches for a user, sorted by compatibility score."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.survey_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must complete survey before viewing matches"
        )

    # Get all other users who have completed the survey
    other_users = db.query(User).filter(
        User.id != user_id,
        User.survey_completed == True
    ).all()

    if not other_users:
        return APIResponse(status="success", data={"matches": []}, message="No matches found yet")

    matches = []
    for other in other_users:
        match = _get_or_compute_score(user_id, other.id, db)
        if match and match.score >= min_score:
            other_id = other.id
            survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == other_id).first()
            matches.append({
                "user_id": str(other_id),
                "name": other.name or None,
                "score": match.score,
                "breakdown": match.breakdown,
                "survey_snapshot": {
                    "budget_range": survey.budget_range.value if survey.budget_range else None,
                    "locations": survey.locations or [],
                    "move_in_timeline": survey.move_in_timeline.value if survey.move_in_timeline else None,
                    "occupancy_type": survey.occupancy_type.value if survey.occupancy_type else None,
                    "social_battery": survey.social_battery or [],
                    "habits": survey.habits or [],
                    "work_study": survey.work_study or [],
                    "pets": survey.pets.value if survey.pets else None,
                    "smoking": survey.smoking.value if survey.smoking else None,
                    "dietary": survey.dietary.value if survey.dietary else None,
                    "gender": survey.gender.value if survey.gender else None,
                }
            })

    matches.sort(key=lambda x: x["score"], reverse=True)
    matches = matches[:limit]

    return APIResponse(
        status="success",
        data={"matches": matches, "total": len(matches)},
        message=f"Found {len(matches)} matches"
    )


@router.get("/{user_id}/{other_user_id}", response_model=APIResponse)
def get_pairwise_score(user_id: UUID, other_user_id: UUID, db: Session = Depends(get_db)):
    """Get compatibility score between two specific users."""
    for uid in [user_id, other_user_id]:
        if not db.query(User).filter(User.id == uid).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {uid} not found")

    match = _get_or_compute_score(user_id, other_user_id, db)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or both users have not completed the survey"
        )

    return APIResponse(
        status="success",
        data={
            "user_a": str(user_id),
            "user_b": str(other_user_id),
            "score": match.score,
            "breakdown": match.breakdown,
        },
        message="Compatibility score computed"
    )
