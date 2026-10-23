import json
import secrets
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Tenant, Campaign, Candidate, VoterIdentity, VoteLog
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignOut
from app.schemas.candidate import CandidateCreate, CandidateUpdate, CandidateOut
from app.core.deps import get_current_tenant
from app.services.broadcaster import broadcaster

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

def generate_campaign_code(db: Session) -> str:
    chars = string.ascii_lowercase + string.digits
    for _ in range(10):
        code = "".join(secrets.choice(chars) for _ in range(8))
        if not db.query(Campaign).filter(Campaign.code == code).first():
            return code
    return secrets.token_hex(4)

def format_campaign_out(campaign: Campaign) -> dict:
    data = {
        "id": campaign.id,
        "tenant_id": campaign.tenant_id,
        "code": campaign.code,
        "title": campaign.title,
        "subtitle": campaign.subtitle,
        "description": campaign.description,
        "template_type": campaign.template_type,
        "banner_url": campaign.banner_url,
        "status": campaign.status,
        "start_time": campaign.start_time,
        "end_time": campaign.end_time,
        "max_votes_per_person": campaign.max_votes_per_person,
        "quota_type": getattr(campaign, 'quota_type', 'lifecycle') or 'lifecycle',
        "vote_mode": getattr(campaign, 'vote_mode', 'batch') or 'batch',
        "is_realname": campaign.is_realname,
        "voter_fields": json.loads(campaign.voter_fields_json or "[]"),
        "ip_daily_limit": campaign.ip_daily_limit,
        "created_at": campaign.created_at,
        "updated_at": campaign.updated_at,
        "candidates": [
            CandidateOut.model_validate(c) for c in campaign.candidates
        ]
    }
    return data

@router.get("", response_model=List[CampaignOut])
def list_tenant_campaigns(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    campaigns = db.query(Campaign).filter(Campaign.tenant_id == current_tenant.id).order_by(Campaign.created_at.desc()).all()
    return [format_campaign_out(c) for c in campaigns]

@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(
    data: CampaignCreate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    code = generate_campaign_code(db)
    campaign = Campaign(
        tenant_id=current_tenant.id,
        code=code,
        title=data.title,
        subtitle=data.subtitle,
        description=data.description,
        template_type=data.template_type,
        banner_url=data.banner_url,
        status=data.status,
        start_time=data.start_time,
        end_time=data.end_time,
        max_votes_per_person=data.max_votes_per_person,
        quota_type=data.quota_type,
        vote_mode=data.vote_mode,
        is_realname=data.is_realname,
        voter_fields_json=json.dumps([f.model_dump() for f in (data.voter_fields or [])], ensure_ascii=False),
        ip_daily_limit=data.ip_daily_limit,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return format_campaign_out(campaign)

@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(
    campaign_id: int,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.tenant_id == current_tenant.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="活动未找到")
    return format_campaign_out(campaign)

@router.put("/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.tenant_id == current_tenant.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="活动未找到")

    update_dict = data.model_dump(exclude_unset=True)
    if "voter_fields" in update_dict and update_dict["voter_fields"] is not None:
        campaign.voter_fields_json = json.dumps(
            [f.model_dump() if hasattr(f, 'model_dump') else f for f in update_dict.pop("voter_fields")],
            ensure_ascii=False
        )
    
    for key, value in update_dict.items():
        setattr(campaign, key, value)
        
    db.commit()
    db.refresh(campaign)
    return format_campaign_out(campaign)

@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.tenant_id == current_tenant.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="活动未找到")
        
    db.delete(campaign)
    db.commit()
    return None

@router.post("/{campaign_id}/reset-votes")
async def reset_campaign_votes_endpoint(
    campaign_id: int,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.tenant_id == current_tenant.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="活动未找到")

    deleted_logs = db.query(VoteLog).filter(VoteLog.campaign_id == campaign.id).delete()
    deleted_identities = db.query(VoterIdentity).filter(VoterIdentity.campaign_id == campaign.id).delete()
    
    candidates = db.query(Candidate).filter(Candidate.campaign_id == campaign.id).all()
    for cand in candidates:
        cand.vote_count = 0

    db.commit()

    # Broadcast reset event to live dashboard
    await broadcaster.broadcast(
        campaign.id,
        {
            "event": "votes_reset",
            "campaign_id": campaign.id,
            "tallies": {c.id: 0 for c in candidates},
            "total_votes": 0
        }
    )

    return {
        "success": True,
        "message": f"活动【{campaign.title}】的全部投票数据已成功重置清零",
        "deleted_logs": deleted_logs,
        "deleted_identities": deleted_identities,
        "reset_candidates": len(candidates)
    }

# Candidate Sub-endpoints
@router.post("/{campaign_id}/candidates", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def add_candidate(
    campaign_id: int,
    data: CandidateCreate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.tenant_id == current_tenant.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="活动未找到")

    candidate = Candidate(
        campaign_id=campaign.id,
        title=data.title,
        subtitle=data.subtitle,
        description=data.description,
        cover_url=data.cover_url,
        media_url=data.media_url,
        display_order=data.display_order,
        is_active=data.is_active,
        vote_count=0
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)

@router.put("/{campaign_id}/candidates/{candidate_id}", response_model=CandidateOut)
def update_candidate(
    campaign_id: int,
    candidate_id: int,
    data: CandidateUpdate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).join(Campaign).filter(
        Candidate.id == candidate_id,
        Campaign.id == campaign_id,
        Campaign.tenant_id == current_tenant.id
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="候选项目未找到")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(candidate, key, value)

    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)

@router.delete("/{campaign_id}/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate(
    campaign_id: int,
    candidate_id: int,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).join(Campaign).filter(
        Candidate.id == candidate_id,
        Campaign.id == campaign_id,
        Campaign.tenant_id == current_tenant.id
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="候选项目未找到")

    db.delete(candidate)
    db.commit()
    return None
