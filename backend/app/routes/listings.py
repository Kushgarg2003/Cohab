from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Listing, ListingInquiry, InquiryMessage, ListingStatus, InquiryStatus, InquiryMessageSender
from app.auth import get_current_user_id
from app.schemas import APIResponse
from app.utils.contact_scan import scan_for_contact

router = APIRouter(prefix="/api/listings", tags=["listings"])


def _listing_public(listing: Listing) -> dict:
    """User-facing listing — NO broker phone/email/full_address."""
    return {
        "id": str(listing.id),
        "title": listing.title,
        "description": listing.description,
        "property_type": listing.property_type.value if listing.property_type else None,
        "furnishing": listing.furnishing.value if listing.furnishing else None,
        "city": listing.city,
        "locality": listing.locality,
        # full_address intentionally omitted
        "monthly_rent": listing.monthly_rent,
        "deposit": listing.deposit,
        "maintenance": listing.maintenance,
        "total_beds": listing.total_beds,
        "available_beds": listing.available_beds,
        "gender_preference": listing.gender_preference.value if listing.gender_preference else None,
        "amenities": listing.amenities or [],
        "rules": listing.rules or [],
        "photos": listing.photos or [],
        "available_from": listing.available_from.isoformat() if listing.available_from else None,
        "created_at": listing.created_at.isoformat(),
    }


@router.get("", response_model=APIResponse)
def browse_listings(
    city: str = Query(None),
    locality: str = Query(None),
    min_rent: int = Query(None),
    max_rent: int = Query(None),
    property_type: str = Query(None),
    gender_preference: str = Query(None),
    limit: int = Query(20, le=50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(Listing).filter(Listing.status == ListingStatus.LIVE)

    if city:
        q = q.filter(Listing.city.ilike(f"%{city}%"))
    if locality:
        q = q.filter(Listing.locality.ilike(f"%{locality}%"))
    if min_rent:
        q = q.filter(Listing.monthly_rent >= min_rent)
    if max_rent:
        q = q.filter(Listing.monthly_rent <= max_rent)
    if property_type:
        q = q.filter(Listing.property_type == property_type)
    if gender_preference:
        q = q.filter(Listing.gender_preference == gender_preference)

    total = q.count()
    listings = q.order_by(Listing.created_at.desc()).offset(offset).limit(limit).all()

    return APIResponse(
        status="success",
        data={"listings": [_listing_public(l) for l in listings], "total": total},
        message=f"{total} listings found",
    )


@router.get("/my-inquiries", response_model=APIResponse)
def my_inquiries(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    inquiries = db.query(ListingInquiry).filter(ListingInquiry.user_id == user_id).all()
    result = []
    for inq in inquiries:
        listing = db.query(Listing).filter(Listing.id == inq.listing_id).first()
        last_msg = (
            db.query(InquiryMessage)
            .filter(InquiryMessage.inquiry_id == inq.id)
            .order_by(InquiryMessage.created_at.desc())
            .first()
        )
        result.append({
            "id": str(inq.id),
            "listing_id": str(inq.listing_id),
            "listing_title": listing.title if listing else None,
            "listing_city": listing.city if listing else None,
            "listing_locality": listing.locality if listing else None,
            "status": inq.status.value,
            "created_at": inq.created_at.isoformat(),
            "last_message": {
                "content": last_msg.content,
                "sender_role": last_msg.sender_role.value,
                "created_at": last_msg.created_at.isoformat(),
            } if last_msg else None,
        })
    result.sort(key=lambda x: x["last_message"]["created_at"] if x["last_message"] else x["created_at"], reverse=True)
    return APIResponse(status="success", data={"inquiries": result}, message=f"{len(result)} inquiries")


@router.get("/{listing_id}", response_model=APIResponse)
def get_listing(listing_id: str, db: Session = Depends(get_db)):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.LIVE,
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return APIResponse(status="success", data=_listing_public(listing), message="OK")


@router.post("/{listing_id}/inquire", response_model=APIResponse)
def inquire(
    listing_id: str,
    payload: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.LIVE,
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    message_content = (payload.get("message") or "").strip()
    if not message_content:
        raise HTTPException(status_code=422, detail="message is required")
    if len(message_content) > 3000:
        raise HTTPException(status_code=422, detail="Message too long (max 3000 characters)")

    if scan_for_contact(message_content):
        raise HTTPException(
            status_code=422,
            detail="Messages must not contain phone numbers or email addresses. Use the platform to communicate."
        )

    # Find or create inquiry thread (one per user per listing)
    inq = db.query(ListingInquiry).filter(
        ListingInquiry.listing_id == listing_id,
        ListingInquiry.user_id == user_id,
    ).first()

    created_new = False
    if not inq:
        inq = ListingInquiry(listing_id=listing_id, user_id=user_id, status=InquiryStatus.OPEN)
        db.add(inq)
        db.flush()
        created_new = True
    elif inq.status == InquiryStatus.CLOSED:
        inq.status = InquiryStatus.OPEN

    msg = InquiryMessage(
        inquiry_id=inq.id,
        sender_role=InquiryMessageSender.USER,
        sender_id=user_id,
        content=message_content,
        flagged=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(inq)

    return APIResponse(
        status="success",
        data={"inquiry_id": str(inq.id), "created_new": created_new},
        message="Inquiry sent",
    )
