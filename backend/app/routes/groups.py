import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import (
    User, Group, GroupMember, GroupRole, GroupStatus,
    WishlistItem, WishlistVote, WishlistStatus, VoteChoice, SurveyResponse,
    GroupInvitation, MutualMatch
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


# ========== Group Invitations ==========

@router.post("/{group_id}/invite", response_model=APIResponse)
def invite_to_group(group_id: UUID, inviter_id: UUID, invitee_id: UUID, db: Session = Depends(get_db)):
    """Invite a mutual match to join a group."""
    # Must be a member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == inviter_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="You must be in the group to invite others")

    # Must be a mutual match
    from uuid import UUID as _UUID
    a_id, b_id = sorted([str(inviter_id), str(invitee_id)])
    is_match = db.query(MutualMatch).filter(
        MutualMatch.user_a_id == _UUID(a_id), MutualMatch.user_b_id == _UUID(b_id)
    ).first()
    if not is_match:
        raise HTTPException(status_code=403, detail="You can only invite mutual matches")

    # Upsert invitation (allow re-invite if previously rejected)
    existing = db.query(GroupInvitation).filter(
        GroupInvitation.group_id == group_id, GroupInvitation.invitee_id == invitee_id
    ).first()
    if existing:
        if existing.status == "pending":
            return APIResponse(status="success", data={"invitation_id": str(existing.id)}, message="Invitation already sent")
        existing.status = "pending"
        existing.inviter_id = inviter_id
        existing.created_at = datetime.utcnow()
    else:
        inv = GroupInvitation(group_id=group_id, inviter_id=inviter_id, invitee_id=invitee_id)
        db.add(inv)
    db.commit()
    return APIResponse(status="success", data={}, message="Invitation sent")


@router.post("/invitations/{inv_id}/respond", response_model=APIResponse)
def respond_to_invitation(inv_id: UUID, user_id: UUID, action: str, db: Session = Depends(get_db)):
    """Accept or reject a group invitation. action = 'accept' | 'reject'"""
    if action not in ("accept", "reject"):
        raise HTTPException(status_code=422, detail="action must be 'accept' or 'reject'")

    inv = db.query(GroupInvitation).filter(
        GroupInvitation.id == inv_id, GroupInvitation.invitee_id == user_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    inv.status = "accepted" if action == "accept" else "rejected"

    if action == "accept":
        # Join the group if not already a member
        already = db.query(GroupMember).filter(
            GroupMember.group_id == inv.group_id, GroupMember.user_id == user_id
        ).first()
        if not already:
            db.add(GroupMember(group_id=inv.group_id, user_id=user_id, role=GroupRole.MEMBER))

    db.commit()
    group_id = str(inv.group_id) if action == "accept" else None
    return APIResponse(status="success", data={"group_id": group_id}, message=f"Invitation {inv.status}")


# ========== Notifications ==========

@router.get("/notifications/{user_id}", response_model=APIResponse)
def get_notifications(user_id: UUID, db: Session = Depends(get_db)):
    """
    Returns pending group invitations + recent mutual matches for the user.
    """
    # Pending invitations
    invitations = db.query(GroupInvitation).filter(
        GroupInvitation.invitee_id == user_id,
        GroupInvitation.status == "pending"
    ).order_by(GroupInvitation.created_at.desc()).all()

    inv_list = []
    for inv in invitations:
        inviter = db.query(User).filter(User.id == inv.inviter_id).first()
        group = db.query(Group).filter(Group.id == inv.group_id).first()
        inv_list.append({
            "id": str(inv.id),
            "type": "group_invite",
            "group_id": str(inv.group_id),
            "group_name": group.name if group else "Unknown group",
            "inviter_name": inviter.name if inviter else "Someone",
            "inviter_picture": inviter.picture if inviter else None,
            "created_at": inv.created_at.isoformat(),
        })

    # Recent mutual matches (last 30 days)
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=30)
    matches = db.query(MutualMatch).filter(
        (MutualMatch.user_a_id == user_id) | (MutualMatch.user_b_id == user_id),
        MutualMatch.matched_at >= cutoff
    ).order_by(MutualMatch.matched_at.desc()).all()

    match_list = []
    for m in matches:
        other_id = m.user_b_id if m.user_a_id == user_id else m.user_a_id
        other = db.query(User).filter(User.id == other_id).first()
        match_list.append({
            "id": str(m.id),
            "type": "new_match",
            "user_id": str(other_id),
            "name": other.name if other else "Anonymous",
            "picture": other.picture if other else None,
            "group_id": str(m.group_id) if m.group_id else None,
            "matched_at": m.matched_at.isoformat(),
        })

    total_unread = len(inv_list)  # invitations are the actionable unread items
    return APIResponse(
        status="success",
        data={"invitations": inv_list, "matches": match_list, "unread_count": total_unread},
        message=f"{total_unread} unread notifications"
    )


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
