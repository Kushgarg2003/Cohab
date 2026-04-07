from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from uuid import UUID
from app.database import get_db, settings
from app.models import (User, SurveyResponse, MatchScore, MutualMatch,
                        UserSwipe, SwipeAction, GroupMember, Group, Message,
                        KitItem, KitDebt, WishlistItem, WishlistVote, GroupInvitation,
                        UserGender, PetPreference, DietaryPreference, GenderPreference)
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
            "date_of_birth": user.date_of_birth.isoformat() if user.date_of_birth else None,
            "phone": user.phone,
            "gender": user.gender.value if user.gender else None,
            "survey_completed": user.survey_completed,
            "is_verified": user.is_verified or False,
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
                "smoking": survey.smoking if survey and survey.smoking else None,
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


@router.patch("/users/{user_id}/verify", response_model=APIResponse)
def toggle_verify_user(user_id: str, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Toggle verified status for a user."""
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid user_id")
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = not (user.is_verified or False)
    db.commit()
    return APIResponse(
        status="success",
        data={"user_id": user_id, "is_verified": user.is_verified},
        message=f"User {'verified' if user.is_verified else 'unverified'}"
    )


@router.patch("/users/{user_id}", response_model=APIResponse)
def edit_user(user_id: str, payload: dict, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Edit a user's basic info and survey data."""
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid user_id")
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Basic info
    if 'name' in payload:
        user.name = (payload['name'] or '').strip() or None
    if 'phone' in payload:
        user.phone = (payload['phone'] or '').strip() or None
    if 'date_of_birth' in payload:
        user.date_of_birth = payload['date_of_birth'] or None
    if 'gender' in payload:
        try:
            user.gender = UserGender(payload['gender']) if payload['gender'] else None
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid gender: must be male, female, or other")

    # Survey fields
    survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == user_uuid).first()
    if survey:
        for f in ('locations', 'budget_ranges', 'move_in_timelines', 'occupancy_types',
                  'social_battery', 'habits', 'work_study'):
            if f in payload:
                setattr(survey, f, payload[f])
        if 'smoking' in payload:
            survey.smoking = payload['smoking'] or None
        if 'pets' in payload:
            try:
                survey.pets = PetPreference(payload['pets']) if payload['pets'] else None
            except ValueError:
                raise HTTPException(status_code=422, detail="Invalid pets value: must be have, love, or no")
        if 'dietary' in payload:
            try:
                survey.dietary = DietaryPreference(payload['dietary']) if payload['dietary'] else None
            except ValueError:
                raise HTTPException(status_code=422, detail="Invalid dietary value: must be veg or non-veg")
        if 'gender_pref' in payload:
            try:
                survey.gender = GenderPreference(payload['gender_pref']) if payload['gender_pref'] else None
            except ValueError:
                raise HTTPException(status_code=422, detail="Invalid gender preference: must be male, female, or neutral")

    db.commit()
    return APIResponse(status="success", data={"user_id": user_id}, message="User updated")


@router.get("/email/campaign-preview", response_model=APIResponse)
def email_campaign_preview(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Return counts and user lists for each email campaign type (dry-run)."""
    # Incomplete survey
    incomplete_users = (
        db.query(User)
        .filter(User.survey_completed == False, User.email.isnot(None))
        .order_by(User.created_at.desc())
        .all()
    )

    # Users with incoming likes (completed survey, at least one LIKE swipe targeting them)
    liked_target_ids = (
        db.query(UserSwipe.target_id)
        .filter(UserSwipe.action == SwipeAction.LIKE)
        .distinct()
        .subquery()
    )
    liked_users = (
        db.query(User)
        .filter(
            User.survey_completed == True,
            User.email.isnot(None),
            User.id.in_(liked_target_ids),
        )
        .order_by(User.created_at.desc())
        .all()
    )

    # All users (for custom broadcast)
    all_users = db.query(User).filter(User.email.isnot(None)).all()

    def _preview(users):
        return {
            "count": len(users),
            "users": [{"user_id": str(u.id), "name": u.name, "email": u.email} for u in users],
        }

    return APIResponse(
        status="success",
        data={
            "incomplete_survey": _preview(incomplete_users),
            "has_likes": _preview(liked_users),
            "all_users": _preview(all_users),
        },
        message="Campaign preview ready",
    )


@router.post("/email/campaign", response_model=APIResponse)
def run_email_campaign(payload: dict, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """
    Run an email campaign.
    payload.type: 'incomplete_survey' | 'has_likes' | 'custom'
    For 'custom': payload.subject (str) and payload.body_html (str) are required.
    """
    from app.email_service import (
        send_complete_survey_email,
        send_you_have_likes_email,
        send_custom_broadcast_email,
    )

    campaign_type = payload.get("type")
    if campaign_type not in ("incomplete_survey", "has_likes", "custom"):
        raise HTTPException(status_code=422, detail="type must be 'incomplete_survey', 'has_likes', or 'custom'")

    # Test mode: send only to the provided test_to address
    test_to = payload.get("test_to", "").strip()
    if test_to:
        if campaign_type == "incomplete_survey":
            ok = send_complete_survey_email(test_to, "Admin")
        elif campaign_type == "has_likes":
            ok = send_you_have_likes_email(test_to, "Admin", 3)
        elif campaign_type == "custom":
            subject = payload.get("subject", "").strip()
            body_html = payload.get("body_html", "").strip()
            if not subject or not body_html:
                raise HTTPException(status_code=422, detail="subject and body_html are required for custom campaigns")
            ok = send_custom_broadcast_email(test_to, "Admin", subject, body_html)
        return APIResponse(
            status="success",
            data={"sent": 1 if ok else 0, "failed": 0 if ok else 1, "total": 1, "test": True},
            message=f"Test email {'sent' if ok else 'failed'} to {test_to}",
        )

    sent = 0
    failed = 0

    if campaign_type == "incomplete_survey":
        users = (
            db.query(User)
            .filter(User.survey_completed == False, User.email.isnot(None))
            .all()
        )
        for user in users:
            ok = send_complete_survey_email(user.email, user.name or "there")
            sent += 1 if ok else 0
            failed += 0 if ok else 1

    elif campaign_type == "has_likes":
        like_counts_sq = (
            db.query(UserSwipe.target_id, func.count(UserSwipe.id).label("like_count"))
            .filter(UserSwipe.action == SwipeAction.LIKE)
            .group_by(UserSwipe.target_id)
            .subquery()
        )
        rows = (
            db.query(User, like_counts_sq.c.like_count)
            .join(like_counts_sq, User.id == like_counts_sq.c.target_id)
            .filter(User.survey_completed == True, User.email.isnot(None))
            .all()
        )
        for user, like_count in rows:
            ok = send_you_have_likes_email(user.email, user.name or "there", like_count)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

    elif campaign_type == "custom":
        subject = payload.get("subject", "").strip()
        body_html = payload.get("body_html", "").strip()
        if not subject or not body_html:
            raise HTTPException(status_code=422, detail="subject and body_html are required for custom campaigns")
        users = db.query(User).filter(User.email.isnot(None)).all()
        for user in users:
            ok = send_custom_broadcast_email(user.email, user.name or "there", subject, body_html)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

    return APIResponse(
        status="success",
        data={"sent": sent, "failed": failed, "total": sent + failed},
        message=f"Campaign complete: {sent} sent, {failed} failed",
    )


@router.get("/stats", response_model=APIResponse)
def get_admin_stats(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Aggregated platform stats for the admin dashboard."""
    from collections import Counter
    from app.models import EmailLog, Message
    from datetime import datetime, timedelta

    # ── User counts ──────────────────────────────────────────────
    total_users = db.query(func.count(User.id)).scalar()
    survey_started = db.query(func.count(SurveyResponse.id)).scalar()
    survey_completed = db.query(func.count(User.id)).filter(User.survey_completed == True).scalar()
    verified_users = db.query(func.count(User.id)).filter(User.is_verified == True).scalar()

    # Active users: swiped in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    active_user_ids = {s.swiper_id for s in db.query(UserSwipe.swiper_id).filter(
        UserSwipe.created_at >= seven_days_ago).all()}
    active_users_7d = len(active_user_ids)

    # Dead accounts: completed survey, never swiped
    all_swipers = {s.swiper_id for s in db.query(UserSwipe.swiper_id).distinct().all()}
    completed_ids = {u.id for u in db.query(User).filter(User.survey_completed == True).all()}
    never_swiped = len(completed_ids - all_swipers)

    # ── Gender split ─────────────────────────────────────────────
    gender_rows = db.query(User.gender, func.count(User.id)).group_by(User.gender).all()
    gender_dist = {(g.value if g else "unknown"): cnt for g, cnt in gender_rows}

    # ── Age distribution ─────────────────────────────────────────
    users_with_dob = db.query(User).filter(User.date_of_birth.isnot(None)).all()
    age_counter = Counter()
    today = datetime.utcnow().date()
    for u in users_with_dob:
        age = (today - u.date_of_birth).days // 365
        bucket = "18-22" if age <= 22 else "23-26" if age <= 26 else "27-30" if age <= 30 else "31+"
        age_counter[bucket] += 1
    age_dist = dict(age_counter)

    # ── Location distributions ────────────────────────────────────
    surveys = db.query(SurveyResponse).filter(SurveyResponse.locations.isnot(None)).all()
    city_counter = Counter()
    area_counter = Counter()
    for s in surveys:
        for loc in (s.locations or []):
            loc = loc.strip()
            if ' - ' in loc:
                city, area = loc.split(' - ', 1)
                city_counter[city.strip()] += 1
                area_counter[loc] += 1   # full "City - Area"
            else:
                city_counter[loc] += 1
                area_counter[loc] += 1
    city_dist = dict(city_counter.most_common(20))
    area_dist = dict(area_counter.most_common(30))

    # ── Budget distribution ───────────────────────────────────────
    budget_counter = Counter()
    for s in surveys:
        for b in (s.budget_ranges or ([s.budget_range.value] if s.budget_range else [])):
            budget_counter[b] += 1
    budget_dist = dict(budget_counter.most_common())

    # ── Stay duration distribution ────────────────────────────────
    duration_rows = db.query(SurveyResponse.stay_duration, func.count(SurveyResponse.id))\
        .filter(SurveyResponse.stay_duration.isnot(None))\
        .group_by(SurveyResponse.stay_duration).all()
    duration_dist = {d: c for d, c in duration_rows}

    # ── Occupancy type distribution ───────────────────────────────
    occupancy_counter = Counter()
    for s in surveys:
        for o in (s.occupancy_types or ([s.occupancy_type.value] if s.occupancy_type else [])):
            occupancy_counter[o] += 1
    occupancy_dist = dict(occupancy_counter)

    # ── Dealbreaker distributions ─────────────────────────────────
    all_surveys = db.query(SurveyResponse).all()
    pets_counter = Counter()
    smoking_counter = Counter()
    dietary_counter = Counter()
    lifestyle_counter = Counter()
    for s in all_surveys:
        if s.pets: pets_counter[s.pets.value] += 1
        if s.smoking: smoking_counter[s.smoking] += 1
        if s.dietary: dietary_counter[s.dietary.value] += 1
        for tag in (s.social_battery or []) + (s.habits or []) + (s.work_study or []):
            lifestyle_counter[tag] += 1
    pets_dist = dict(pets_counter)
    smoking_dist = dict(smoking_counter)
    dietary_dist = dict(dietary_counter)
    lifestyle_dist = dict(lifestyle_counter.most_common(15))

    # ── Swipe stats ───────────────────────────────────────────────
    total_likes = db.query(func.count(UserSwipe.id)).filter(UserSwipe.action == SwipeAction.LIKE).scalar()
    total_passes = db.query(func.count(UserSwipe.id)).filter(UserSwipe.action == SwipeAction.PASS).scalar()
    total_matches = db.query(func.count(MutualMatch.id)).scalar()
    like_ratio = round(total_likes / (total_likes + total_passes) * 100, 1) if (total_likes + total_passes) else 0

    # Match reciprocity: mutual matches / total likes
    reciprocity = round(total_matches / total_likes * 100, 1) if total_likes else 0

    # Users with at least one mutual match
    matched_user_ids = set()
    for m in db.query(MutualMatch).all():
        matched_user_ids.add(str(m.user_a_id))
        matched_user_ids.add(str(m.user_b_id))
    users_with_matches = len(matched_user_ids)

    # ── All matched pairs ─────────────────────────────────────────
    all_matches = db.query(MutualMatch).order_by(MutualMatch.matched_at.desc()).all()
    matched_pairs = []
    msg_counts = {}
    if all_matches:
        group_ids = [m.group_id for m in all_matches if m.group_id]
        if group_ids:
            msg_rows = db.query(Message.group_id, func.count(Message.id).label('cnt'))\
                .filter(Message.group_id.in_(group_ids)).group_by(Message.group_id).all()
            msg_counts = {str(r.group_id): r.cnt for r in msg_rows}

    scores_map = {}
    for ms in db.query(MatchScore).all():
        scores_map[(str(ms.user_a_id), str(ms.user_b_id))] = ms.score

    for m in all_matches:
        ua = db.query(User).filter(User.id == m.user_a_id).first()
        ub = db.query(User).filter(User.id == m.user_b_id).first()
        a_id, b_id = sorted([str(m.user_a_id), str(m.user_b_id)])
        score = scores_map.get((a_id, b_id)) or scores_map.get((b_id, a_id))
        gid = str(m.group_id) if m.group_id else None
        matched_pairs.append({
            "match_id": str(m.id),
            "user_a": {"id": str(m.user_a_id), "name": ua.name if ua else None, "email": ua.email if ua else None, "gender": ua.gender.value if ua and ua.gender else None},
            "user_b": {"id": str(m.user_b_id), "name": ub.name if ub else None, "email": ub.email if ub else None, "gender": ub.gender.value if ub and ub.gender else None},
            "score": round(score, 1) if score else None,
            "group_id": gid,
            "messages": msg_counts.get(gid, 0),
            "matched_at": m.matched_at.strftime('%Y-%m-%d %H:%M') if m.matched_at else None,
        })

    # ── Match score distribution ──────────────────────────────────
    score_buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for ms in db.query(MatchScore).all():
        s = ms.score
        if s <= 20: score_buckets["0-20"] += 1
        elif s <= 40: score_buckets["21-40"] += 1
        elif s <= 60: score_buckets["41-60"] += 1
        elif s <= 80: score_buckets["61-80"] += 1
        else: score_buckets["81-100"] += 1

    # ── Top liked users (most likes received) ────────────────────
    top_liked_rows = db.query(UserSwipe.target_id, func.count(UserSwipe.id).label("likes"))\
        .filter(UserSwipe.action == SwipeAction.LIKE)\
        .group_by(UserSwipe.target_id)\
        .order_by(func.count(UserSwipe.id).desc())\
        .limit(10).all()
    top_liked = []
    for target_id, likes in top_liked_rows:
        u = db.query(User).filter(User.id == target_id).first()
        if u:
            top_liked.append({"user_id": str(u.id), "name": u.name, "email": u.email, "gender": u.gender.value if u.gender else None, "likes": likes})

    # ── Sign-ups over time (last 30 days) ────────────────────────
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    signups_raw = db.query(
        func.date_trunc('day', User.created_at).label('day'),
        func.count(User.id).label('count')
    ).filter(User.created_at >= thirty_days_ago).group_by('day').order_by('day').all()
    signups_trend = [{"date": r.day.strftime('%Y-%m-%d'), "count": r.count} for r in signups_raw]

    # ── Email stats ───────────────────────────────────────────────
    emails_sent_total = db.query(func.count(EmailLog.id)).scalar()
    unsubscribed = db.query(func.count(User.id)).filter(User.email_unsubscribed == True).scalar()
    email_type_rows = db.query(EmailLog.email_type, func.count(EmailLog.id))\
        .group_by(EmailLog.email_type).all()
    email_type_dist = {t: c for t, c in email_type_rows}

    return APIResponse(
        status="success",
        data={
            "overview": {
                "total_users": total_users,
                "survey_started": survey_started,
                "survey_completed": survey_completed,
                "verified_users": verified_users,
                "total_matches": total_matches,
                "users_with_matches": users_with_matches,
                "total_likes": total_likes,
                "total_passes": total_passes,
                "like_ratio": like_ratio,
                "reciprocity_rate": reciprocity,
                "active_users_7d": active_users_7d,
                "never_swiped": never_swiped,
                "emails_sent_total": emails_sent_total,
                "unsubscribed": unsubscribed,
            },
            "gender_dist": gender_dist,
            "age_dist": age_dist,
            "city_dist": city_dist,
            "area_dist": area_dist,
            "budget_dist": budget_dist,
            "duration_dist": duration_dist,
            "occupancy_dist": occupancy_dist,
            "pets_dist": pets_dist,
            "smoking_dist": smoking_dist,
            "dietary_dist": dietary_dist,
            "lifestyle_dist": lifestyle_dist,
            "score_dist": score_buckets,
            "email_type_dist": email_type_dist,
            "top_liked": top_liked,
            "matched_pairs": matched_pairs,
            "signups_trend": signups_trend,
        },
        message="Stats ready"
    )


@router.delete("/users/{user_id}", response_model=APIResponse)
def delete_user(user_id: str, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Delete a user and all their data. User can re-join with same Google account."""
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid user_id")

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Match scores
    db.query(MatchScore).filter(
        or_(MatchScore.user_a_id == user_uuid, MatchScore.user_b_id == user_uuid)
    ).delete(synchronize_session=False)

    # 2. Mutual matches
    db.query(MutualMatch).filter(
        or_(MutualMatch.user_a_id == user_uuid, MutualMatch.user_b_id == user_uuid)
    ).delete(synchronize_session=False)

    # 3. Swipes (both sides)
    db.query(UserSwipe).filter(
        or_(UserSwipe.swiper_id == user_uuid, UserSwipe.target_id == user_uuid)
    ).delete(synchronize_session=False)

    # 4. Kit debts where this user is debtor or creditor
    db.query(KitDebt).filter(
        or_(KitDebt.debtor_id == user_uuid, KitDebt.creditor_id == user_uuid)
    ).delete(synchronize_session=False)

    # 5. Nullify kit items assigned to this user (owned by others)
    db.query(KitItem).filter(KitItem.assigned_to == user_uuid).update(
        {"assigned_to": None}, synchronize_session=False)

    # 6. Delete kit items created by this user (debts already cleared in step 4)
    db.query(KitItem).filter(KitItem.created_by == user_uuid).delete(synchronize_session=False)

    # 7. Wishlist votes by this user
    db.query(WishlistVote).filter(WishlistVote.user_id == user_uuid).delete(synchronize_session=False)

    # 8. Votes on items added by this user, then the items themselves
    item_ids = [r.id for r in db.query(WishlistItem.id).filter(WishlistItem.added_by == user_uuid).all()]
    if item_ids:
        db.query(WishlistVote).filter(WishlistVote.wishlist_item_id.in_(item_ids)).delete(synchronize_session=False)
    db.query(WishlistItem).filter(WishlistItem.added_by == user_uuid).delete(synchronize_session=False)

    # 9. Group invitations (inviter or invitee)
    db.query(GroupInvitation).filter(
        or_(GroupInvitation.inviter_id == user_uuid, GroupInvitation.invitee_id == user_uuid)
    ).delete(synchronize_session=False)

    # 10. Messages sent by this user
    db.query(Message).filter(Message.sender_id == user_uuid).delete(synchronize_session=False)

    # 11. Group memberships
    db.query(GroupMember).filter(GroupMember.user_id == user_uuid).delete(synchronize_session=False)

    # 12. Groups created by this user — transfer or delete
    for group in db.query(Group).filter(Group.created_by == user_uuid).all():
        new_admin = db.query(GroupMember).filter(GroupMember.group_id == group.id).first()
        if new_admin:
            group.created_by = new_admin.user_id
        else:
            # No remaining members — clean up the group entirely
            gid = group.id
            kit_ids = [r.id for r in db.query(KitItem.id).filter(KitItem.group_id == gid).all()]
            if kit_ids:
                db.query(KitDebt).filter(KitDebt.kit_item_id.in_(kit_ids)).delete(synchronize_session=False)
            db.query(KitItem).filter(KitItem.group_id == gid).delete(synchronize_session=False)
            wl_ids = [r.id for r in db.query(WishlistItem.id).filter(WishlistItem.group_id == gid).all()]
            if wl_ids:
                db.query(WishlistVote).filter(WishlistVote.wishlist_item_id.in_(wl_ids)).delete(synchronize_session=False)
            db.query(WishlistItem).filter(WishlistItem.group_id == gid).delete(synchronize_session=False)
            db.query(Message).filter(Message.group_id == gid).delete(synchronize_session=False)
            db.delete(group)

    db.flush()

    # 13. Finally delete the user (SurveyResponse cascades via ORM)
    db.delete(user)
    db.commit()

    return APIResponse(
        status="success",
        data={},
        message=f"User {user_id} deleted. They can re-join with the same Google account."
    )
