from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models import KitItem, KitDebt, KitStatus, SplitType, Group, GroupMember, User
from app.schemas import APIResponse

router = APIRouter(prefix="/api/kit", tags=["kit"])

BUNDLES = [
    {
        "bundle": "Kitchen Starter",
        "emoji": "🍳",
        "items": [
            {"item_name": "Induction Cooktop", "category": "Kitchen", "estimated_cost": 2500},
            {"item_name": "Microwave", "category": "Kitchen", "estimated_cost": 6000},
            {"item_name": "Toaster", "category": "Kitchen", "estimated_cost": 1200},
            {"item_name": "Electric Kettle", "category": "Kitchen", "estimated_cost": 800},
            {"item_name": "Mixer Grinder", "category": "Kitchen", "estimated_cost": 3000},
        ]
    },
    {
        "bundle": "Living Room",
        "emoji": "🛋️",
        "items": [
            {"item_name": "TV (32 inch)", "category": "Living Room", "estimated_cost": 18000},
            {"item_name": "Sofa (2-seater)", "category": "Living Room", "estimated_cost": 12000},
            {"item_name": "Coffee Table", "category": "Living Room", "estimated_cost": 3500},
            {"item_name": "Ceiling Fan", "category": "Living Room", "estimated_cost": 2000},
        ]
    },
    {
        "bundle": "Bedroom Basics",
        "emoji": "🛏️",
        "items": [
            {"item_name": "Mattress", "category": "Bedroom", "estimated_cost": 8000},
            {"item_name": "Bed Frame", "category": "Bedroom", "estimated_cost": 6000},
            {"item_name": "Wardrobe", "category": "Bedroom", "estimated_cost": 10000},
            {"item_name": "Study Table", "category": "Bedroom", "estimated_cost": 4000},
        ]
    },
    {
        "bundle": "Cleaning & Utilities",
        "emoji": "🧹",
        "items": [
            {"item_name": "Vacuum Cleaner", "category": "Cleaning", "estimated_cost": 4000},
            {"item_name": "Mop & Bucket", "category": "Cleaning", "estimated_cost": 500},
            {"item_name": "Washing Machine", "category": "Cleaning", "estimated_cost": 15000},
            {"item_name": "Iron & Board", "category": "Cleaning", "estimated_cost": 1500},
        ]
    },
    {
        "bundle": "Services",
        "emoji": "🔧",
        "items": [
            {"item_name": "Deep Cleaning (move-in)", "category": "Service", "estimated_cost": 2500},
            {"item_name": "Packers & Movers", "category": "Service", "estimated_cost": 8000},
            {"item_name": "Internet Setup", "category": "Service", "estimated_cost": 1000},
            {"item_name": "Electrician Visit", "category": "Service", "estimated_cost": 500},
        ]
    },
]


def _assert_member(group_id: UUID, user_id: UUID, db: Session):
    if not db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == user_id
    ).first():
        raise HTTPException(status_code=403, detail="Not a member of this group")


def _item_to_dict(item: KitItem, db: Session):
    debts = [d for d in item.debts if not d.settled]
    return {
        "id": str(item.id),
        "item_name": item.item_name,
        "category": item.category,
        "estimated_cost": item.estimated_cost,
        "purchase_price": item.purchase_price,
        "split_type": item.split_type.value,
        "assigned_to": str(item.assigned_to) if item.assigned_to else None,
        "assigned_name": item.owner.name if item.owner else None,
        "status": item.status.value,
        "created_by": str(item.created_by),
        "creator_name": item.creator.name if item.creator else None,
        "pending_debts": [{"debtor_id": str(d.debtor_id), "creditor_id": str(d.creditor_id), "amount": d.amount} for d in debts],
        "created_at": item.created_at.isoformat(),
    }


@router.get("/bundles", response_model=APIResponse)
def get_bundles():
    """Return pre-populated essential bundles."""
    return APIResponse(status="success", data={"bundles": BUNDLES}, message="Bundles loaded")


@router.get("/{group_id}", response_model=APIResponse)
def get_kit(group_id: UUID, user_id: UUID = Query(...), db: Session = Depends(get_db)):
    if not db.query(Group).filter(Group.id == group_id).first():
        raise HTTPException(status_code=404, detail="Group not found")
    _assert_member(group_id, user_id, db)

    items = db.query(KitItem).filter(KitItem.group_id == group_id).order_by(KitItem.created_at).all()
    result = [_item_to_dict(i, db) for i in items]

    total_estimated = sum(i.estimated_cost or 0 for i in items)
    shared_cost = sum(i.estimated_cost or 0 for i in items if i.split_type == SplitType.SHARED)

    return APIResponse(
        status="success",
        data={"items": result, "total": len(result), "total_estimated": total_estimated, "shared_cost": shared_cost},
        message=f"{len(result)} kit items"
    )


@router.post("/{group_id}", response_model=APIResponse)
def add_kit_item(group_id: UUID, payload: dict, db: Session = Depends(get_db)):
    user_id = UUID(payload.get("user_id"))
    if not db.query(Group).filter(Group.id == group_id).first():
        raise HTTPException(status_code=404, detail="Group not found")
    _assert_member(group_id, user_id, db)

    item_name = (payload.get("item_name") or "").strip()
    if not item_name:
        raise HTTPException(status_code=422, detail="item_name is required")

    split_type = SplitType(payload.get("split_type", "shared"))
    assigned_to = UUID(payload["assigned_to"]) if payload.get("assigned_to") else None

    item = KitItem(
        group_id=group_id,
        created_by=user_id,
        item_name=item_name,
        category=payload.get("category"),
        estimated_cost=payload.get("estimated_cost"),
        split_type=split_type,
        assigned_to=assigned_to,
    )
    db.add(item)
    db.flush()

    # Auto-create debt if shared and we know the cost
    if split_type == SplitType.SHARED and payload.get("estimated_cost"):
        members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
        member_ids = [m.user_id for m in members if m.user_id != user_id]
        half = payload["estimated_cost"] / 2
        for mid in member_ids:
            db.add(KitDebt(kit_item_id=item.id, group_id=group_id, debtor_id=mid, creditor_id=user_id, amount=half))

    db.commit()
    db.refresh(item)
    return APIResponse(status="success", data=_item_to_dict(item, db), message="Item added")


@router.patch("/{group_id}/{item_id}", response_model=APIResponse)
def update_kit_item(group_id: UUID, item_id: UUID, payload: dict, db: Session = Depends(get_db)):
    user_id = UUID(payload.get("user_id"))
    _assert_member(group_id, user_id, db)

    item = db.query(KitItem).filter(KitItem.id == item_id, KitItem.group_id == group_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if "status" in payload:
        item.status = KitStatus(payload["status"])
    if "purchase_price" in payload:
        item.purchase_price = payload["purchase_price"]
        # Update debts if price changed and shared
        if item.split_type == SplitType.SHARED:
            for d in item.debts:
                if not d.settled:
                    d.amount = payload["purchase_price"] / 2
    if "assigned_to" in payload:
        item.assigned_to = UUID(payload["assigned_to"]) if payload["assigned_to"] else None
    if "split_type" in payload:
        item.split_type = SplitType(payload["split_type"])

    db.commit()
    db.refresh(item)
    return APIResponse(status="success", data=_item_to_dict(item, db), message="Item updated")


@router.delete("/{group_id}/{item_id}", response_model=APIResponse)
def delete_kit_item(group_id: UUID, item_id: UUID, user_id: UUID = Query(...), db: Session = Depends(get_db)):
    _assert_member(group_id, user_id, db)
    item = db.query(KitItem).filter(KitItem.id == item_id, KitItem.group_id == group_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return APIResponse(status="success", data={}, message="Item removed")


@router.get("/{group_id}/debts/summary", response_model=APIResponse)
def get_debt_summary(group_id: UUID, user_id: UUID = Query(...), db: Session = Depends(get_db)):
    _assert_member(group_id, user_id, db)

    debts = db.query(KitDebt).filter(KitDebt.group_id == group_id, KitDebt.settled == False).all()
    result = []
    for d in debts:
        debtor = db.query(User).filter(User.id == d.debtor_id).first()
        creditor = db.query(User).filter(User.id == d.creditor_id).first()
        item = db.query(KitItem).filter(KitItem.id == d.kit_item_id).first()
        result.append({
            "debt_id": str(d.id),
            "item_name": item.item_name if item else "Unknown",
            "debtor_id": str(d.debtor_id),
            "debtor_name": debtor.name if debtor else "Unknown",
            "creditor_id": str(d.creditor_id),
            "creditor_name": creditor.name if creditor else "Unknown",
            "amount": d.amount,
        })

    return APIResponse(status="success", data={"debts": result, "total": len(result)}, message=f"{len(result)} pending debts")


@router.post("/{group_id}/debts/{debt_id}/settle", response_model=APIResponse)
def settle_debt(group_id: UUID, debt_id: UUID, payload: dict, db: Session = Depends(get_db)):
    user_id = UUID(payload.get("user_id"))
    _assert_member(group_id, user_id, db)

    debt = db.query(KitDebt).filter(KitDebt.id == debt_id, KitDebt.group_id == group_id).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    debt.settled = True
    db.commit()
    return APIResponse(status="success", data={"debt_id": str(debt_id)}, message="Debt settled")
