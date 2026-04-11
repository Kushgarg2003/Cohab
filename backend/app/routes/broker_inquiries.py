from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Listing, ListingInquiry, InquiryMessage, InquiryStatus, InquiryMessageSender
from app.auth import verify_approved_broker
from app.schemas import APIResponse
from app.utils.contact_scan import scan_for_contact

router = APIRouter(prefix="/api/broker/inquiries", tags=["broker-inquiries"])


def _msg_dict(msg: InquiryMessage) -> dict:
    return {
        "id": str(msg.id),
        "sender_role": msg.sender_role.value,
        "sender_id": str(msg.sender_id),
        "content": msg.content,
        "flagged": msg.flagged,
        "created_at": msg.created_at.isoformat(),
    }


@router.get("", response_model=APIResponse)
def get_all_inquiries(
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    """All inquiry threads across broker's listings."""
    listings = db.query(Listing).filter(Listing.broker_id == broker_id).all()
    listing_ids = [l.id for l in listings]
    listing_map = {l.id: l for l in listings}

    inquiries = db.query(ListingInquiry).filter(ListingInquiry.listing_id.in_(listing_ids)).all()

    result = []
    for inq in inquiries:
        last_msg = (
            db.query(InquiryMessage)
            .filter(InquiryMessage.inquiry_id == inq.id)
            .order_by(InquiryMessage.created_at.desc())
            .first()
        )
        listing = listing_map.get(inq.listing_id)
        result.append({
            "id": str(inq.id),
            "listing_id": str(inq.listing_id),
            "listing_title": listing.title if listing else None,
            "user_id": str(inq.user_id),
            "status": inq.status.value,
            "created_at": inq.created_at.isoformat(),
            "last_message": _msg_dict(last_msg) if last_msg else None,
        })

    result.sort(key=lambda x: x["last_message"]["created_at"] if x["last_message"] else x["created_at"], reverse=True)
    return APIResponse(status="success", data={"inquiries": result}, message=f"{len(result)} threads")


@router.get("/{inquiry_id}/messages", response_model=APIResponse)
def get_messages(
    inquiry_id: str,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    inq = db.query(ListingInquiry).filter(ListingInquiry.id == inquiry_id).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    # Verify this inquiry belongs to one of broker's listings
    listing = db.query(Listing).filter(Listing.id == inq.listing_id, Listing.broker_id == broker_id).first()
    if not listing:
        raise HTTPException(status_code=403, detail="Access denied")

    messages = db.query(InquiryMessage).filter(
        InquiryMessage.inquiry_id == inquiry_id
    ).order_by(InquiryMessage.created_at.asc()).all()

    return APIResponse(
        status="success",
        data={
            "inquiry_id": inquiry_id,
            "listing_title": listing.title,
            "status": inq.status.value,
            "messages": [_msg_dict(m) for m in messages],
        },
        message=f"{len(messages)} messages",
    )


@router.post("/{inquiry_id}/messages", response_model=APIResponse)
def send_message(
    inquiry_id: str,
    payload: dict,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    inq = db.query(ListingInquiry).filter(ListingInquiry.id == inquiry_id).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    if inq.status == InquiryStatus.CLOSED:
        raise HTTPException(status_code=400, detail="This inquiry thread is closed")

    listing = db.query(Listing).filter(Listing.id == inq.listing_id, Listing.broker_id == broker_id).first()
    if not listing:
        raise HTTPException(status_code=403, detail="Access denied")

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
        sender_role=InquiryMessageSender.BROKER,
        sender_id=broker_id,
        content=content,
        flagged=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return APIResponse(status="success", data=_msg_dict(msg), message="Message sent")


@router.patch("/{inquiry_id}", response_model=APIResponse)
def close_inquiry(
    inquiry_id: str,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    inq = db.query(ListingInquiry).filter(ListingInquiry.id == inquiry_id).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    listing = db.query(Listing).filter(Listing.id == inq.listing_id, Listing.broker_id == broker_id).first()
    if not listing:
        raise HTTPException(status_code=403, detail="Access denied")

    inq.status = InquiryStatus.CLOSED
    db.commit()
    return APIResponse(status="success", data={"status": "closed"}, message="Inquiry closed")
