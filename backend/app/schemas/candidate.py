from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class CandidateBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    subtitle: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    media_url: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    media_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class CandidateOut(CandidateBase):
    id: int
    campaign_id: int
    vote_count: int
    created_at: datetime

    class Config:
        from_attributes = True
