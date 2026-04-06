from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from uuid import UUID
from datetime import datetime
from app.models import (
    BudgetRange, MoveInTimeline, OccupancyType,
    PetPreference, SmokingPreference, DietaryPreference, GenderPreference
)

# ========== Base Schemas ==========

class LifestyleTagResponse(BaseModel):
    id: UUID
    category: str
    tag_key: str
    tag_label: str

class UserCreate(BaseModel):
    pass  # No fields for Phase 1 (no auth)

class UserResponse(BaseModel):
    id: UUID
    created_at: datetime
    survey_completed: bool

    class Config:
        from_attributes = True

# ========== Mandatory Survey Schemas ==========

class MandatoryDataRequest(BaseModel):
    budget_ranges: List[str] = Field(..., min_items=1)
    locations: List[str] = Field(..., min_items=1)
    move_in_timeline: Optional[MoveInTimeline] = None   # legacy
    move_in_timelines: List[str] = Field(default_factory=list)
    occupancy_type: Optional[OccupancyType] = None      # legacy
    occupancy_types: List[str] = Field(default_factory=list)
    stay_duration: Optional[str] = None  # "1-3 months", "3-6 months", "6-12 months", "1 year+"

class MandatoryDataResponse(BaseModel):
    survey_id: UUID
    budget_range: BudgetRange
    locations: List[str]
    move_in_timeline: MoveInTimeline
    occupancy_type: OccupancyType
    created_at: datetime

    class Config:
        from_attributes = True

# ========== Lifestyle Tags Schemas ==========

class LifestyleTagsRequest(BaseModel):
    social_battery: Optional[List[str]] = []
    habits: Optional[List[str]] = []
    work_study: Optional[List[str]] = []

class LifestyleTagsResponse(BaseModel):
    survey_id: UUID
    social_battery: List[str]
    habits: List[str]
    work_study: List[str]
    updated_at: datetime

    class Config:
        from_attributes = True

# ========== Dealbreaker Schemas ==========

class DealbreakerRequest(BaseModel):
    pets: Optional[PetPreference] = None
    smoking: Optional[SmokingPreference] = None
    dietary: Optional[DietaryPreference] = None
    gender: Optional[GenderPreference] = None

class DealbreakerResponse(BaseModel):
    survey_id: UUID
    pets: Optional[PetPreference]
    smoking: Optional[SmokingPreference]
    dietary: Optional[DietaryPreference]
    gender: Optional[GenderPreference]
    updated_at: datetime

    class Config:
        from_attributes = True

# ========== Deep Dive Schemas ==========

class DeepDiveRequest(BaseModel):
    """Open-ended responses as key-value pairs"""
    responses: Dict[str, str]

class DeepDiveResponse(BaseModel):
    survey_id: UUID
    deep_dive_responses: Dict[str, str]
    updated_at: datetime

    class Config:
        from_attributes = True

# ========== Survey Preview & Status ==========

class SurveyPreview(BaseModel):
    survey_id: UUID
    user_id: UUID
    budget_range: Optional[BudgetRange]
    locations: Optional[List[str]]
    move_in_timeline: Optional[MoveInTimeline]
    occupancy_type: Optional[OccupancyType]
    social_battery: List[str]
    habits: List[str]
    work_study: List[str]
    pets: Optional[PetPreference]
    smoking: Optional[SmokingPreference]
    dietary: Optional[DietaryPreference]
    gender: Optional[GenderPreference]
    deep_dive_responses: Dict[str, str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SurveyStatus(BaseModel):
    survey_id: UUID
    user_id: UUID
    completion_percentage: float
    is_completed: bool
    sections: Dict[str, bool]  # {"mandatory": true, "lifestyle": false, ...}

# ========== API Response Wrapper ==========

class APIResponse(BaseModel):
    status: str = Field(..., pattern="^(success|error)$")
    data: Optional[Dict] = None
    message: str = ""

    class Config:
        extra = "allow"
