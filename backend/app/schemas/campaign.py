from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from app.schemas.candidate import CandidateOut

class VoterFieldSchema(BaseModel):
    key: str
    label: str
    type: str = "text"  # 'text' or 'select'
    options: Optional[List[str]] = None
    required: bool = True
    enable_analytics: bool = True

class CampaignBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    subtitle: Optional[str] = None
    description: Optional[str] = None
    template_type: str = Field("text", pattern="^(text|image|video)$")
    banner_url: Optional[str] = None
    status: str = Field("active", pattern="^(draft|active|paused|ended)$")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_votes_per_person: int = Field(1, ge=1)
    vote_mode: str = Field("batch", pattern="^(batch|instant)$")
    is_realname: bool = False
    voter_fields: Optional[List[VoterFieldSchema]] = []
    ip_daily_limit: int = Field(50, ge=1)

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    template_type: Optional[str] = None
    banner_url: Optional[str] = None
    status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_votes_per_person: Optional[int] = None
    vote_mode: Optional[str] = None
    is_realname: Optional[bool] = None
    voter_fields: Optional[List[VoterFieldSchema]] = None
    ip_daily_limit: Optional[int] = None

class CampaignOut(CampaignBase):
    id: int
    tenant_id: int
    code: str
    created_at: datetime
    updated_at: datetime
    candidates: List[CandidateOut] = []

    class Config:
        from_attributes = True

class PublicCandidateOut(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    media_url: Optional[str] = None
    vote_count: int
    display_order: int

    class Config:
        from_attributes = True

class PublicCampaignOut(BaseModel):
    code: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    template_type: str
    banner_url: Optional[str] = None
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_votes_per_person: int
    vote_mode: str = "batch"
    is_realname: bool
    voter_fields: List[VoterFieldSchema] = []
    candidates: List[PublicCandidateOut] = []

    class Config:
        from_attributes = True
