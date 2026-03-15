from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models import Message, Group, GroupMember, User
from app.schemas import APIResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _assert_member(group_id: UUID, user_id: UUID, db: Session):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")


@router.get("/{group_id}/messages", response_model=APIResponse)
def get_messages(
    group_id: UUID,
    user_id: UUID = Query(...),
    limit: int = Query(default=50, le=100),
    before_id: str = Query(default=None),
    db: Session = Depends(get_db)
):
    """Fetch messages for a group (newest last). Supports cursor pagination via before_id."""
    if not db.query(Group).filter(Group.id == group_id).first():
        raise HTTPException(status_code=404, detail="Group not found")
    _assert_member(group_id, user_id, db)

    query = db.query(Message).filter(Message.group_id == group_id)

    if before_id:
        before_msg = db.query(Message).filter(Message.id == UUID(before_id)).first()
        if before_msg:
            query = query.filter(Message.created_at < before_msg.created_at)

    messages = query.order_by(Message.created_at.desc()).limit(limit).all()
    messages = list(reversed(messages))

    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append({
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "sender_name": sender.name if sender else "Anonymous",
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        })

    return APIResponse(
        status="success",
        data={"messages": result, "total": len(result)},
        message=f"{len(result)} messages"
    )


@router.post("/{group_id}/messages", response_model=APIResponse)
def send_message(
    group_id: UUID,
    payload: dict,
    db: Session = Depends(get_db)
):
    """Send a message to a group."""
    user_id = payload.get("user_id")
    content = (payload.get("content") or "").strip()

    if not user_id:
        raise HTTPException(status_code=422, detail="user_id is required")
    if not content:
        raise HTTPException(status_code=422, detail="content cannot be empty")
    if len(content) > 2000:
        raise HTTPException(status_code=422, detail="Message too long (max 2000 chars)")

    user_uuid = UUID(user_id)

    if not db.query(Group).filter(Group.id == group_id).first():
        raise HTTPException(status_code=404, detail="Group not found")
    _assert_member(group_id, user_uuid, db)

    msg = Message(group_id=group_id, sender_id=user_uuid, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == user_uuid).first()

    return APIResponse(
        status="success",
        data={
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "sender_name": sender.name if sender else "Anonymous",
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        },
        message="Message sent"
    )
