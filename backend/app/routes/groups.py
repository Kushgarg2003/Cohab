import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import (
    User, Group, GroupMember, GroupRole, GroupStatus,
    WishlistItem, WishlistVote, WishlistStatus, VoteChoice, SurveyResponse
)
from app.schemas import APIResponse

router = APIRouter(prefix="/api/groups", tags=["groups"])


def _generate_invite_code(db: Session) -> str:
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not db.query(Group).filter(Group.invite_code == code).first():
            return code


def _group_detail(group: Group, db: Session) -> dict:
    members = []
    for m in group.members:
        survey = db.query(SurveyResponse).filter(SurveyResponse.user_id == m.user_id).first()
        member_user = db.query(User).filter(User.id == m.user_id).first()
        members.append({
            "user_id": str(m.user_id),
            "name": member_user.name if member_user else None,
            "role": m.role.value,
            "joined_at": m.joined_at.isoformat(),
            "survey": {
                "budget_range": survey.budget_range.value if survey and survey.budget_range else None,
                "locations": survey.locations or [] if survey else [],
                "lifestyle": (survey.social_battery or []) + (survey.habits or []) if survey else [],
            } if survey else None
        })
    return {
        "group_id": str(group.id),
        "name": group.name,
        "invite_code": group.invite_code,
        "status": group.status.value,
        "created_by": str(group.created_by),
        "created_at": group.created_at.isoformat(),
        "member_count": len(group.members),
        "members": members,
    }


# ========== Group Management ==========

@router.post("", response_model=APIResponse)
def create_group(name: str, user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.survey_completed:
        raise HTTPException(status_code=400, detail="Complete your survey before forming a group")

    invite_code = _generate_invite_code(db)
    group = Group(name=name, invite_code=invite_code, created_by=user_id)
    db.add(group)
    db.flush()

    admin = GroupMember(group_id=group.id, user_id=user_id, role=GroupRole.ADMIN)
    db.add(admin)
    db.commit()
    db.refresh(group)

    return APIResponse(
        status="success",
        data={"group_id": str(group.id), "invite_code": group.invite_code, "name": group.name},
        message="Group created successfully"
    )


@router.post("/join", response_model=APIResponse)
def join_group(invite_code: str, user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.survey_completed:
        raise HTTPException(status_code=400, detail="Complete your survey before joining a group")

    group = db.query(Group).filter(Group.invite_code == invite_code.upper()).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.user_id == user_id
    ).first()
    if existing:
        return APIResponse(status="success", data=_group_detail(group, db), message="Already a member")

    member = GroupMember(group_id=group.id, user_id=user_id, role=GroupRole.MEMBER)
    db.add(member)
    db.commit()
    db.refresh(group)

    return APIResponse(status="success", data=_group_detail(group, db), message="Joined group successfully")


@router.get("/my", response_model=APIResponse)
def get_my_groups(user_id: UUID, db: Session = Depends(get_db)):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == user_id).all()
    groups = []
    for m in memberships:
        g = db.query(Group).filter(Group.id == m.group_id).first()
        if g:
            groups.append({
                "group_id": str(g.id),
                "name": g.name,
                "invite_code": g.invite_code,
                "role": m.role.value,
                "member_count": len(g.members),
                "status": g.status.value,
            })
    return APIResponse(status="success", data={"groups": groups}, message=f"{len(groups)} groups found")


@router.get("/{group_id}", response_model=APIResponse)
def get_group(group_id: UUID, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return APIResponse(status="success", data=_group_detail(group, db), message="Group retrieved")


# ========== Wishlist ==========

@router.post("/{group_id}/wishlist", response_model=APIResponse)
def add_wishlist_item(
    group_id: UUID, user_id: UUID,
    title: str, url: str = None, rent: int = None,
    location: str = None, notes: str = None,
    db: Session = Depends(get_db)
):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    item = WishlistItem(
        group_id=group_id, added_by=user_id,
        title=title, url=url, rent=rent, location=location, notes=notes
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return APIResponse(
        status="success",
        data={"item_id": str(item.id), "title": item.title},
        message="Property added to wishlist"
    )


@router.get("/{group_id}/wishlist", response_model=APIResponse)
def get_wishlist(group_id: UUID, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member_count = len(group.members)
    items = []
    for item in group.wishlist_items:
        tally = {"yes": 0, "no": 0, "maybe": 0}
        user_votes = {}
        for v in item.votes:
            tally[v.vote.value] += 1
            user_votes[str(v.user_id)] = v.vote.value

        items.append({
            "item_id": str(item.id),
            "title": item.title,
            "url": item.url,
            "rent": item.rent,
            "location": item.location,
            "notes": item.notes,
            "status": item.status.value,
            "added_by": str(item.added_by),
            "created_at": item.created_at.isoformat(),
            "tally": tally,
            "votes": user_votes,
            "member_count": member_count,
        })

    return APIResponse(status="success", data={"items": items}, message=f"{len(items)} items")


@router.post("/{group_id}/wishlist/{item_id}/vote", response_model=APIResponse)
def cast_vote(group_id: UUID, item_id: UUID, user_id: UUID, vote: VoteChoice, db: Session = Depends(get_db)):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    item = db.query(WishlistItem).filter(WishlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    existing_vote = db.query(WishlistVote).filter(
        WishlistVote.wishlist_item_id == item_id,
        WishlistVote.user_id == user_id
    ).first()

    if existing_vote:
        existing_vote.vote = vote
        existing_vote.voted_at = datetime.utcnow()
    else:
        db.add(WishlistVote(wishlist_item_id=item_id, user_id=user_id, vote=vote))

    # Auto-update status based on votes
    db.flush()
    db.refresh(item)
    group = db.query(Group).filter(Group.id == group_id).first()
    total_members = len(group.members)
    tally = {"yes": 0, "no": 0, "maybe": 0}
    for v in item.votes:
        tally[v.vote.value] += 1

    if tally["yes"] == total_members:
        item.status = WishlistStatus.SHORTLISTED
    elif tally["no"] > total_members / 2:
        item.status = WishlistStatus.REJECTED

    db.commit()
    db.refresh(item)

    return APIResponse(
        status="success",
        data={"item_id": str(item_id), "vote": vote.value, "status": item.status.value},
        message="Vote recorded"
    )


@router.delete("/{group_id}/wishlist/{item_id}", response_model=APIResponse)
def delete_wishlist_item(group_id: UUID, item_id: UUID, user_id: UUID, db: Session = Depends(get_db)):
    item = db.query(WishlistItem).filter(WishlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == user_id
    ).first()
    is_admin = member and member.role == GroupRole.ADMIN
    is_owner = item.added_by == user_id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=403, detail="Only the item owner or group admin can delete")

    db.delete(item)
    db.commit()
    return APIResponse(status="success", data={}, message="Item removed from wishlist")
