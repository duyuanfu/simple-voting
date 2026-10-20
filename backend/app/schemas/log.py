from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

class VoteLogOut(BaseModel):
    id: int
    campaign_id: int
    candidate_id: int
    candidate_title: Optional[str] = None
    identity_id: int
    client_ip: str
    visitor_id: str
    user_agent: Optional[str] = None
    is_valid: int
    voter_info: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True

class VoteInvalidateRequest(BaseModel):
    log_id: int
    reason: Optional[str] = "Admin manual invalidation"
