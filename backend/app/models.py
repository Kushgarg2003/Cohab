from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, JSON, ForeignKey, Enum as SQLEnum, UniqueConstraint, or_
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.database import Base

class BudgetRange(str, enum.Enum):
    RANGE_10_25K = "10k-25k"
    RANGE_25_50K = "25k-50k"
    RANGE_50_1L = "50k-1L"
    RANGE_1L_PLUS = "1L+"

class MoveInTimeline(str, enum.Enum):
    ASAP = "ASAP"
    ONE_MONTH = "1-month"
    TWO_THREE_MONTHS = "2-3-months"

class OccupancyType(str, enum.Enum):
    PRIVATE = "private"
    TWIN_SHARING = "twin-sharing"

class PetPreference(str, enum.Enum):
    HAVE = "have"
    LOVE = "love"
    NO = "no"

class SmokingPreference(str, enum.Enum):
    SMOKER = "smoker"
    NON_SMOKER = "non-smoker"
    OUTSIDE_ONLY = "outside-only"

class DietaryPreference(str, enum.Enum):
    VEG = "veg"
    NON_VEG = "non-veg"

class GenderPreference(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"

class UserGender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class LifestyleCategory(str, enum.Enum):
    SOCIAL_BATTERY = "social_battery"
    HABITS = "habits"
    WORK_STUDY = "work_study"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    survey_completed = Column(Boolean, default=False)
    name = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    phone = Column(String(15), nullable=True)
    gender = Column(SQLEnum(UserGender), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    picture = Column(String(500), nullable=True)

    # Relationships
    survey_response = relationship("SurveyResponse", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, survey_completed={self.survey_completed})>"

class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    # Hard constraints (mandatory)
    budget_range = Column(SQLEnum(BudgetRange), nullable=True)
    locations = Column(JSON, nullable=True)  # List of location hubs
    move_in_timeline = Column(SQLEnum(MoveInTimeline), nullable=True)
    occupancy_type = Column(SQLEnum(OccupancyType), nullable=True)

    # Lifestyle tags (list of tag keys)
    social_battery = Column(JSON, nullable=True, default=list)  # ["extrovert", "ghost"]
    habits = Column(JSON, nullable=True, default=list)  # ["clean_freak", "chef"]
    work_study = Column(JSON, nullable=True, default=list)  # ["wfh_warrior", "office_goer"]

    # Dealbreaker badges
    pets = Column(SQLEnum(PetPreference), nullable=True)
    smoking = Column(SQLEnum(SmokingPreference), nullable=True)
    dietary = Column(SQLEnum(DietaryPreference), nullable=True)
    gender = Column(SQLEnum(GenderPreference), nullable=True)

    # Deep dive open-ended responses
    deep_dive_responses = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="survey_response")

    def __repr__(self):
        return f"<SurveyResponse(user_id={self.user_id}, budget={self.budget_range})>"

class LifestyleTag(Base):
    """Reference table for all available lifestyle tags"""
    __tablename__ = "lifestyle_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(SQLEnum(LifestyleCategory), nullable=False, index=True)
    tag_key = Column(String(100), nullable=False, unique=True)  # "extrovert", "ghost", etc.
    tag_label = Column(String(255), nullable=False)  # "I love hosting weekend dinners"

    def __repr__(self):
        return f"<LifestyleTag(category={self.category}, tag_key={self.tag_key})>"


class MatchScore(Base):
    __tablename__ = "match_scores"
    __table_args__ = (
        UniqueConstraint("user_a_id", "user_b_id", name="uq_match_pair"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_a_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    user_b_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    score = Column(Float, nullable=False)
    breakdown = Column(JSON, nullable=False)  # {"hard_constraints": 40, "dealbreakers": 25, "lifestyle": 35}
    computed_at = Column(DateTime, default=datetime.utcnow)

    user_a = relationship("User", foreign_keys=[user_a_id])
    user_b = relationship("User", foreign_keys=[user_b_id])

    def __repr__(self):
        return f"<MatchScore(user_a={self.user_a_id}, user_b={self.user_b_id}, score={self.score})>"


# ========== Swipes & Mutual Matches ==========

class SwipeAction(str, enum.Enum):
    LIKE = "like"
    PASS = "pass"


class UserSwipe(Base):
    __tablename__ = "user_swipes"
    __table_args__ = (UniqueConstraint("swiper_id", "target_id", name="uq_swipe_pair"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    swiper_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    target_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(SQLEnum(SwipeAction), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    swiper = relationship("User", foreign_keys=[swiper_id])
    target = relationship("User", foreign_keys=[target_id])


class MutualMatch(Base):
    __tablename__ = "mutual_matches"
    __table_args__ = (UniqueConstraint("user_a_id", "user_b_id", name="uq_mutual_pair"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_a_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    user_b_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    matched_at = Column(DateTime, default=datetime.utcnow)

    user_a = relationship("User", foreign_keys=[user_a_id])
    user_b = relationship("User", foreign_keys=[user_b_id])


# ========== The Kit ==========

class SplitType(str, enum.Enum):
    SHARED = "shared"          # 50/50, creates debt
    INDIVIDUAL = "individual"  # one person owns it

class KitStatus(str, enum.Enum):
    TO_BUY = "to_buy"
    ORDERED = "ordered"
    DELIVERED = "delivered"

class KitItem(Base):
    __tablename__ = "kit_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    item_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    estimated_cost = Column(Float, nullable=True)
    purchase_price = Column(Float, nullable=True)       # actual price paid
    split_type = Column(SQLEnum(SplitType), nullable=False, default=SplitType.SHARED)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # for individual
    status = Column(SQLEnum(KitStatus), nullable=False, default=KitStatus.TO_BUY)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by])
    owner = relationship("User", foreign_keys=[assigned_to])
    debts = relationship("KitDebt", back_populates="item", cascade="all, delete-orphan")


class KitDebt(Base):
    __tablename__ = "kit_debts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kit_item_id = Column(UUID(as_uuid=True), ForeignKey("kit_items.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    debtor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)   # owes money
    creditor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False) # paid money
    amount = Column(Float, nullable=False)
    settled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("KitItem", back_populates="debts")
    debtor = relationship("User", foreign_keys=[debtor_id])
    creditor = relationship("User", foreign_keys=[creditor_id])


# ========== Chat ==========

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(String(2000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id])


# ========== Phase 2: Groups ==========

class GroupStatus(str, enum.Enum):
    FORMING = "forming"
    SEARCHING = "searching"
    CLOSED = "closed"

class GroupRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"

class VoteChoice(str, enum.Enum):
    YES = "yes"
    NO = "no"
    MAYBE = "maybe"

class WishlistStatus(str, enum.Enum):
    PENDING = "pending"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"


class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    invite_code = Column(String(8), nullable=False, unique=True)
    status = Column(SQLEnum(GroupStatus), nullable=False, default=GroupStatus.FORMING)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_user"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(GroupRole), nullable=False, default=GroupRole.MEMBER)
    joined_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="members")
    user = relationship("User")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    url = Column(String(500), nullable=True)
    rent = Column(Integer, nullable=True)
    location = Column(String(255), nullable=True)
    notes = Column(String(1000), nullable=True)
    status = Column(SQLEnum(WishlistStatus), nullable=False, default=WishlistStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="wishlist_items")
    votes = relationship("WishlistVote", back_populates="item", cascade="all, delete-orphan")


class WishlistVote(Base):
    __tablename__ = "wishlist_votes"
    __table_args__ = (UniqueConstraint("wishlist_item_id", "user_id", name="uq_item_vote"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wishlist_item_id = Column(UUID(as_uuid=True), ForeignKey("wishlist_items.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    vote = Column(SQLEnum(VoteChoice), nullable=False)
    voted_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("WishlistItem", back_populates="votes")
