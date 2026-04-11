from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Listing, ListingInquiry, ListingStatus, PropertyType, FurnishingType, GenderPreference
from app.auth import verify_approved_broker
from app.schemas import APIResponse
from app.utils.contact_scan import scan_for_contact

router = APIRouter(prefix="/api/broker/listings", tags=["broker-listings"])


def _scan_fields(payload: dict):
    """Raise 422 if any text field contains contact info."""
    for field in ("title", "description"):
        val = payload.get(field) or ""
        if scan_for_contact(val):
            raise HTTPException(
                status_code=422,
                detail=f"'{field}' must not contain phone numbers or email addresses"
            )
    for item in (payload.get("amenities") or []) + (payload.get("rules") or []):
        if scan_for_contact(str(item)):
            raise HTTPException(
                status_code=422,
                detail="Amenities/rules must not contain phone numbers or email addresses"
            )


def _listing_dict(listing: Listing, inquiry_count: int = 0) -> dict:
    return {
        "id": str(listing.id),
        "title": listing.title,
        "description": listing.description,
        "property_type": listing.property_type.value if listing.property_type else None,
        "furnishing": listing.furnishing.value if listing.furnishing else None,
        "city": listing.city,
        "locality": listing.locality,
        "monthly_rent": listing.monthly_rent,
        "deposit": listing.deposit,
        "maintenance": listing.maintenance,
        "total_beds": listing.total_beds,
        "available_beds": listing.available_beds,
        "gender_preference": listing.gender_preference.value if listing.gender_preference else None,
        "amenities": listing.amenities or [],
        "rules": listing.rules or [],
        "photos": listing.photos or [],
        "status": listing.status.value,
        "admin_note": listing.admin_note,
        "available_from": listing.available_from.isoformat() if listing.available_from else None,
        "created_at": listing.created_at.isoformat(),
        "updated_at": listing.updated_at.isoformat(),
        "inquiry_count": inquiry_count,
    }


@router.post("", response_model=APIResponse)
def create_listing(
    payload: dict,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    _scan_fields(payload)

    title = (payload.get("title") or "").strip()
    city = (payload.get("city") or "").strip()
    locality = (payload.get("locality") or "").strip()
    monthly_rent = payload.get("monthly_rent")
    property_type_raw = payload.get("property_type")

    if not title or not city or not locality or not monthly_rent or not property_type_raw:
        raise HTTPException(status_code=422, detail="title, city, locality, monthly_rent, property_type are required")

    try:
        prop_type = PropertyType(property_type_raw)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid property_type: {property_type_raw}")

    furnishing = None
    if payload.get("furnishing"):
        try:
            furnishing = FurnishingType(payload["furnishing"])
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid furnishing: {payload['furnishing']}")

    gender_pref = None
    if payload.get("gender_preference"):
        try:
            gender_pref = GenderPreference(payload["gender_preference"])
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid gender_preference: {payload['gender_preference']}")

    from datetime import date
    available_from = None
    if payload.get("available_from"):
        try:
            available_from = date.fromisoformat(payload["available_from"])
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid available_from date format (use YYYY-MM-DD)")

    listing = Listing(
        broker_id=broker_id,
        title=title,
        description=(payload.get("description") or "").strip() or None,
        property_type=prop_type,
        furnishing=furnishing,
        city=city,
        locality=locality,
        full_address=(payload.get("full_address") or "").strip() or None,
        monthly_rent=int(monthly_rent),
        deposit=int(payload["deposit"]) if payload.get("deposit") else None,
        maintenance=int(payload["maintenance"]) if payload.get("maintenance") else None,
        total_beds=int(payload["total_beds"]) if payload.get("total_beds") else None,
        available_beds=int(payload["available_beds"]) if payload.get("available_beds") else None,
        gender_preference=gender_pref,
        amenities=payload.get("amenities") or [],
        rules=payload.get("rules") or [],
        photos=payload.get("photos") or [],
        available_from=available_from,
        status=ListingStatus.DRAFT,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return APIResponse(status="success", data=_listing_dict(listing), message="Listing created as draft")


@router.get("", response_model=APIResponse)
def get_my_listings(
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    listings = db.query(Listing).filter(Listing.broker_id == broker_id).order_by(Listing.created_at.desc()).all()
    result = []
    for l in listings:
        count = db.query(ListingInquiry).filter(ListingInquiry.listing_id == l.id).count()
        result.append(_listing_dict(l, count))
    return APIResponse(status="success", data={"listings": result}, message=f"{len(result)} listings")


@router.get("/{listing_id}", response_model=APIResponse)
def get_listing(
    listing_id: str,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.broker_id == broker_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    count = db.query(ListingInquiry).filter(ListingInquiry.listing_id == listing.id).count()
    return APIResponse(status="success", data=_listing_dict(listing, count), message="OK")


@router.patch("/{listing_id}", response_model=APIResponse)
def update_listing(
    listing_id: str,
    payload: dict,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.broker_id == broker_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status == ListingStatus.ARCHIVED:
        raise HTTPException(status_code=400, detail="Cannot edit an archived listing")

    _scan_fields(payload)

    updatable = ["title", "description", "city", "locality", "full_address", "monthly_rent",
                 "deposit", "maintenance", "total_beds", "available_beds", "amenities", "rules", "photos"]
    for field in updatable:
        if field in payload:
            setattr(listing, field, payload[field])

    if "property_type" in payload:
        try:
            listing.property_type = PropertyType(payload["property_type"])
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid property_type")

    if "furnishing" in payload:
        try:
            listing.furnishing = FurnishingType(payload["furnishing"]) if payload["furnishing"] else None
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid furnishing")

    if "gender_preference" in payload:
        try:
            listing.gender_preference = GenderPreference(payload["gender_preference"]) if payload["gender_preference"] else None
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid gender_preference")

    if "available_from" in payload:
        from datetime import date
        try:
            listing.available_from = date.fromisoformat(payload["available_from"]) if payload["available_from"] else None
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid available_from date format")

    # If listing was LIVE, move back to PENDING_REVIEW after edit
    if listing.status == ListingStatus.LIVE:
        listing.status = ListingStatus.PENDING_REVIEW

    db.commit()
    db.refresh(listing)
    return APIResponse(status="success", data=_listing_dict(listing), message="Listing updated")


@router.post("/{listing_id}/submit", response_model=APIResponse)
def submit_listing(
    listing_id: str,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.broker_id == broker_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status not in (ListingStatus.DRAFT, ListingStatus.PAUSED):
        raise HTTPException(status_code=400, detail=f"Cannot submit a listing with status '{listing.status.value}'")

    listing.status = ListingStatus.PENDING_REVIEW
    db.commit()
    return APIResponse(status="success", data={"status": "pending_review"}, message="Listing submitted for review")


@router.post("/{listing_id}/pause", response_model=APIResponse)
def pause_listing(
    listing_id: str,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.broker_id == broker_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status != ListingStatus.LIVE:
        raise HTTPException(status_code=400, detail="Only live listings can be paused")

    listing.status = ListingStatus.PAUSED
    db.commit()
    return APIResponse(status="success", data={"status": "paused"}, message="Listing paused")


@router.delete("/{listing_id}", response_model=APIResponse)
def delete_listing(
    listing_id: str,
    broker_id: str = Depends(verify_approved_broker),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.broker_id == broker_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing.status = ListingStatus.ARCHIVED
    db.commit()
    return APIResponse(status="success", data={}, message="Listing archived")
