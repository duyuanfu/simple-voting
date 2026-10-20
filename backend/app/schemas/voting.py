from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class VoteSubmitRequest(BaseModel):
    candidate_ids: List[int] = Field(..., min_length=1)
    visitor_id: str = Field(..., min_length=8, max_length=128)
    extra_info: Optional[Dict[str, Any]] = {}

class VoterStatusResponse(BaseModel):
    visitor_id: str
    max_votes: int
    voted_count: int
    remaining_votes: int
    voted_candidate_ids: List[int]
    saved_extra_info: Dict[str, Any] = {}

class VoteSubmitResponse(BaseModel):
    success: bool
    message: str
    remaining_votes: int
    voted_candidate_ids: List[int]
