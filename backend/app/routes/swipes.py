from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models import User, SurveyResponse, UserSwipe, MutualMatch, MatchScore, SwipeAction, Group, GroupMember, GroupRole
from app.matching import compute_match_score
from app.schemas import APIResponse
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/swipes", tags=["swipes"])


def _get_or_compute_score(user_a_id, user_b_id, db):
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
    result = compute_match_score(survey_a, survey_b)
    match = MatchScore(user_a_id=a_uuid, user_b_id=b_uuid, score=result["score"],
                       breakdown=result["breakdown"], computed_at=datetime.utcnow())
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.get("/{user_id}/queue", response_model=APIResponse)
def get_swipe_queue(user_id: UUID, db: Session = Depends(get_db)):
    """
    Returns ordered list of users to swipe on.
    - First: users not yet swiped, sorted by score desc
    - If all swiped: return passed users (allow revisit)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.survey_completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete survey first")

    # Users already swiped on
    swiped_ids = {s.target_id for s in db.query(UserSwipe).filter(UserSwipe.swiper_id == user_id).all()}
    # Already mutually matched
    matched_ids = set()
    for m in db.query(MutualMatch).filter(
        (MutualMatch.user_a_id == user_id) | (MutualMatch.user_b_id == user_id)
    ).all():
        matched_ids.add(m.user_b_id if m.user_a_id == user_id else m.user_a_id)

    all_users = db.query(User).filter(
        User.id != user_id,
        User.survey_completed == True
    ).all()

    unswiped = [u for u in all_users if u.id not in swiped_ids and u.id not in matched_ids]
    revisit_passes = []

    if not unswiped:
        # All swiped — return passed users for revisit
        passed_ids = {s.target_id for s in db.query(UserSwipe).filter(
            UserSwipe.swiper_id == user_id,
            UserSwipe.action == SwipeAction.PASS
        ).all()}
        revisit_passes = [u for u in all_users if u.id in passed_ids and u.id not in matched_ids]

    candidates = unswiped if unswiped else revisit_passes

    queue = []
    for other in candidates:
        match = _get_or_compute_score(user_id, other.id, db)
        score = match.score if match else 0
        survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == other.id).first()
        queue.append({
            "user_id": str(other.id),
            "name": other.name,
            "picture": other.picture,
            "score": score,
            "breakdown": match.breakdown if match else {},
            "survey_snapshot": {
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

    queue.sort(key=lambda x: x["score"], reverse=True)

    return APIResponse(
        status="success",
        data={"queue": queue, "total": len(queue), "is_revisit": len(unswiped) == 0},
        message=f"{len(queue)} users in queue"
    )


@router.post("/{user_id}", response_model=APIResponse)
def record_swipe(user_id: UUID, payload: dict, db: Session = Depends(get_db)):
    """
    Record a like or pass. If mutual like, create a MutualMatch + auto-create group.
    payload: { "target_id": str, "action": "like" | "pass" }
    """
    target_id = UUID(payload.get("target_id"))
    action_str = payload.get("action")

    if action_str not in ("like", "pass"):
        raise HTTPException(status_code=422, detail="action must be 'like' or 'pass'")

    action = SwipeAction.LIKE if action_str == "like" else SwipeAction.PASS

    for uid in [user_id, target_id]:
        if not db.query(User).filter(User.id == uid).first():
            raise HTTPException(status_code=404, detail=f"User {uid} not found")

    # Upsert swipe (allow updating a previous pass to a like on revisit)
    existing = db.query(UserSwipe).filter(
        UserSwipe.swiper_id == user_id,
        UserSwipe.target_id == target_id
    ).first()
    if existing:
        existing.action = action
        existing.created_at = datetime.utcnow()
    else:
        swipe = UserSwipe(swiper_id=user_id, target_id=target_id, action=action)
        db.add(swipe)
    db.commit()

    # Check for mutual match only on like
    mutual = None
    group_id = None
    if action == SwipeAction.LIKE:
        other_liked = db.query(UserSwipe).filter(
            UserSwipe.swiper_id == target_id,
            UserSwipe.target_id == user_id,
            UserSwipe.action == SwipeAction.LIKE
        ).first()

        if other_liked:
            # Check not already matched
            a_id, b_id = sorted([str(user_id), str(target_id)])
            already = db.query(MutualMatch).filter(
                MutualMatch.user_a_id == UUID(a_id),
                MutualMatch.user_b_id == UUID(b_id)
            ).first()

            if not already:
                # Auto-create a group
                user_a = db.query(User).filter(User.id == user_id).first()
                user_b = db.query(User).filter(User.id == target_id).first()
                import random, string
                invite_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                group_name = f"{user_a.name or 'User'} & {user_b.name or 'User'}"
                from app.models import Group, GroupMember, GroupRole, GroupStatus
                new_group = Group(
                    name=group_name,
                    invite_code=invite_code,
                    created_by=user_id,
                    status=GroupStatus.FORMING
                )
                db.add(new_group)
                db.flush()

                db.add(GroupMember(group_id=new_group.id, user_id=user_id, role=GroupRole.ADMIN))
                db.add(GroupMember(group_id=new_group.id, user_id=target_id, role=GroupRole.MEMBER))

                match_record = MutualMatch(
                    user_a_id=UUID(a_id),
                    user_b_id=UUID(b_id),
                    group_id=new_group.id
                )
                db.add(match_record)
                db.commit()
                mutual = True
                group_id = str(new_group.id)

    return APIResponse(
        status="success",
        data={
            "action": action_str,
            "mutual_match": mutual or False,
            "group_id": group_id
        },
        message="It's a match!" if mutual else "Swipe recorded"
    )


@router.get("/{user_id}/matches", response_model=APIResponse)
def get_mutual_matches(user_id: UUID, db: Session = Depends(get_db)):
    """Get all mutual matches for a user."""
    matches = db.query(MutualMatch).filter(
        (MutualMatch.user_a_id == user_id) | (MutualMatch.user_b_id == user_id)
    ).all()

    result = []
    for m in matches:
        other_id = m.user_b_id if m.user_a_id == user_id else m.user_a_id
        other = db.query(User).filter(User.id == other_id).first()
        result.append({
            "match_id": str(m.id),
            "user_id": str(other_id),
            "name": other.name if other else None,
            "group_id": str(m.group_id) if m.group_id else None,
            "matched_at": m.matched_at.isoformat()
        })

    return APIResponse(
        status="success",
        data={"matches": result, "total": len(result)},
        message=f"{len(result)} mutual matches"
    )
