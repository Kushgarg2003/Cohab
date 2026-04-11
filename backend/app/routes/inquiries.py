from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ListingInquiry, InquiryMessage, InquiryStatus, InquiryMessageSender
from app.auth import get_current_user_id
from app.schemas import APIResponse
from app.utils.contact_scan import scan_for_contact

router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


def _msg_dict(msg: InquiryMessage) -> dict:
    return {
        "id": str(msg.id),
        "sender_role": msg.sender_role.value,
        "sender_id": str(msg.sender_id),
        "content": msg.content,
        "flagged": msg.flagged,
        "created_at": msg.created_at.isoformat(),
    }


@router.get("/{inquiry_id}/messages", response_model=APIResponse)
def get_messages(
    inquiry_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    inq = db.query(ListingInquiry).filter(
        ListingInquiry.id == inquiry_id,
        ListingInquiry.user_id == user_id,
    ).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    from app.models import Listing
    listing = db.query(Listing).filter(Listing.id == inq.listing_id).first()

    messages = db.query(InquiryMessage).filter(
        InquiryMessage.inquiry_id == inquiry_id
    ).order_by(InquiryMessage.created_at.asc()).all()

    return APIResponse(
        status="success",
        data={
            "inquiry_id": inquiry_id,
            "listing_title": listing.title if listing else None,
            "listing_locality": listing.locality if listing else None,
            "status": inq.status.value,
            "messages": [_msg_dict(m) for m in messages],
        },
        message=f"{len(messages)} messages",
    )


@router.post("/{inquiry_id}/messages", response_model=APIResponse)
def send_message(
    inquiry_id: str,
    payload: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    inq = db.query(ListingInquiry).filter(
        ListingInquiry.id == inquiry_id,
        ListingInquiry.user_id == user_id,
    ).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    if inq.status == InquiryStatus.CLOSED:
        raise HTTPException(status_code=400, detail="This inquiry thread is closed")

    content = (payload.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=422, detail="content is required")
    if len(content) > 3000:
        raise HTTPException(status_code=422, detail="Message too long (max 3000 characters)")

    if scan_for_contact(content):
        raise HTTPException(
            status_code=422,
            detail="Messages must not contain phone numbers or email addresses. Use the platform to communicate."
        )

    msg = InquiryMessage(
        inquiry_id=inquiry_id,
        sender_role=InquiryMessageSender.USER,
        sender_id=user_id,
        content=content,
        flagged=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return APIResponse(status="success", data=_msg_dict(msg), message="Message sent")
