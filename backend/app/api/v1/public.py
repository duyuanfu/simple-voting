import json
import hashlib
from datetime import datetime, date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.entities import Campaign, Candidate, VoterIdentity, VoteLog
from app.schemas.campaign import PublicCampaignOut, PublicCandidateOut
from app.schemas.voting import VoteSubmitRequest, VoteSubmitResponse, VoterStatusResponse
from app.core.deps import get_client_ip, check_ip_rate_limit
from app.core.security import decode_access_token
from app.services.broadcaster import broadcaster

router = APIRouter(prefix="/public", tags=["public"])

def compute_identity_key(campaign: Campaign, visitor_id: str, extra_info: Dict[str, Any] | None) -> str:
    extra = extra_info or {}
    if campaign.is_realname:
        # Combine real_name and other key attributes if provided
        real_name = str(extra.get("real_name", "")).strip()
        unit = str(extra.get("unit", "")).strip()
        phone = str(extra.get("phone", "")).strip()
        
        # If real_name exists, use it as primary anchor so same person can't cheat across devices
        if real_name:
            raw = f"{campaign.id}|{real_name}|{unit}|{phone}"
            return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
            
    # Default to device fingerprint
    raw = f"{campaign.id}|visitor|{visitor_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]

@router.get("/campaigns/{code}", response_model=PublicCampaignOut)
def get_public_campaign(code: str, request: Request, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.code == code).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="活动不存在或链接已失效")

    # Check if request has admin tenant token for preview
    auth_header = request.headers.get("Authorization", "")
    is_admin = False
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        payload = decode_access_token(token)
        if payload and str(payload.get("sub")) == str(campaign.tenant_id):
            is_admin = True

    # If draft and not admin: hide candidates to protect unpublished draft content
    if campaign.status == "draft" and not is_admin:
        return {
            "code": campaign.code,
            "title": campaign.title,
            "subtitle": campaign.subtitle,
            "description": "活动处于草稿筹备阶段，尚未对外正式发布，敬请期待！",
            "template_type": campaign.template_type,
            "banner_url": campaign.banner_url,
            "status": "draft",
            "start_time": campaign.start_time,
            "end_time": campaign.end_time,
            "max_votes_per_person": campaign.max_votes_per_person,
            "quota_type": getattr(campaign, 'quota_type', 'lifecycle') or 'lifecycle',
            "vote_mode": getattr(campaign, 'vote_mode', 'batch') or 'batch',
            "is_realname": campaign.is_realname,
            "voter_fields": [],
            "candidates": []
        }

    # Get active candidates ordered by display_order
    active_candidates = [
        c for c in campaign.candidates if c.is_active
    ]

    return {
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
        "candidates": [
            PublicCandidateOut.model_validate(c) for c in active_candidates
        ]
    }

@router.post("/campaigns/{code}/my-status", response_model=VoterStatusResponse)
def get_voter_status(
    code: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.code == code).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="活动未找到")

    visitor_id = str(payload.get("visitor_id", "")).strip()
    extra_info = payload.get("extra_info") or {}

    if not visitor_id:
        return VoterStatusResponse(
            visitor_id="",
            max_votes=campaign.max_votes_per_person,
            voted_count=0,
            remaining_votes=campaign.max_votes_per_person,
            voted_candidate_ids=[],
            saved_extra_info={}
        )

    identity_key = compute_identity_key(campaign, visitor_id, extra_info)
    identity = db.query(VoterIdentity).filter(
        VoterIdentity.campaign_id == campaign.id,
        VoterIdentity.identity_key == identity_key
    ).first()

    if not identity:
        return VoterStatusResponse(
            visitor_id=visitor_id,
            max_votes=campaign.max_votes_per_person,
            voted_count=0,
            remaining_votes=campaign.max_votes_per_person,
            voted_candidate_ids=[],
            saved_extra_info={}
        )

    # Find valid voted candidates (supporting both lifecycle and daily quota reset)
    is_daily = getattr(campaign, 'quota_type', 'lifecycle') == 'daily'
    valid_logs_query = db.query(VoteLog).filter(
        VoteLog.campaign_id == campaign.id,
        VoteLog.identity_id == identity.id,
        VoteLog.is_valid == 1
    )
    if is_daily:
        today_start = datetime.combine(date.today(), datetime.min.time())
        valid_logs_query = valid_logs_query.filter(VoteLog.created_at >= today_start)

    valid_logs = valid_logs_query.all()
    voted_ids = [l.candidate_id for l in valid_logs]
    saved_extra = json.loads(identity.voter_info_json or "{}")

    remaining = max(0, campaign.max_votes_per_person - len(voted_ids))

    return VoterStatusResponse(
        visitor_id=visitor_id,
        max_votes=campaign.max_votes_per_person,
        voted_count=len(voted_ids),
        remaining_votes=remaining,
        voted_candidate_ids=voted_ids,
        saved_extra_info=saved_extra
    )

@router.post("/campaigns/{code}/vote", response_model=VoteSubmitResponse)
async def submit_vote(
    code: str,
    vote_data: VoteSubmitRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    # 1. Anti-brushing Layer: Sliding Window IP Burst Limit
    check_ip_rate_limit(request, burst_limit=10, window_seconds=10)
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")

    campaign = db.query(Campaign).filter(Campaign.code == code).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="活动未找到")

    # 2. Activity Status and Time Window Checks
    if campaign.status != "active":
        status_text = {
            "draft": "活动筹备中，尚未开放投票",
            "paused": "活动已暂停投票",
            "ended": "活动已结束"
        }.get(campaign.status, "活动未开放投票")
        raise HTTPException(status_code=400, detail=status_text)

    now = datetime.now()
    if campaign.start_time:
        start_dt = campaign.start_time if isinstance(campaign.start_time, datetime) else datetime.fromisoformat(str(campaign.start_time))
        if now < start_dt:
            raise HTTPException(status_code=400, detail=f"活动投票尚未开始（开放时间: {start_dt.strftime('%Y-%m-%d %H:%M:%S')}）")

    if campaign.end_time:
        end_dt = campaign.end_time if isinstance(campaign.end_time, datetime) else datetime.fromisoformat(str(campaign.end_time))
        if now > end_dt:
            raise HTTPException(status_code=400, detail=f"活动投票已截止（截止时间: {end_dt.strftime('%Y-%m-%d %H:%M:%S')}）")

    # 3. Anti-brushing Layer: Daily IP Quota
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_ip_votes = db.query(func.count(VoteLog.id)).filter(
        VoteLog.campaign_id == campaign.id,
        VoteLog.client_ip == client_ip,
        VoteLog.created_at >= today_start,
        VoteLog.is_valid == 1
    ).scalar() or 0

    if today_ip_votes >= campaign.ip_daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"当前网络环境今日投票人次较多，已达到同IP保护上限，请更换网络（如切换手机蜂窝流量）后再试"
        )

    # 4. Candidate Validation & Duplicate Prevention in Request
    candidate_ids = list(dict.fromkeys(vote_data.candidate_ids))  # preserve uniqueness
    if not candidate_ids:
        raise HTTPException(status_code=400, detail="请至少选择一个候选项目")

    # Check candidates exist and belong to campaign
    candidates = db.query(Candidate).filter(
        Candidate.id.in_(candidate_ids),
        Candidate.campaign_id == campaign.id,
        Candidate.is_active == True
    ).all()

    if len(candidates) != len(candidate_ids):
        raise HTTPException(status_code=400, detail="所选候选项目中存在无效或已下架项")

    # 5. Schema Validation for Required Dynamic Fields
    if campaign.is_realname:
        fields_schema = json.loads(campaign.voter_fields_json or "[]")
        for field in fields_schema:
            if field.get("required"):
                val = (vote_data.extra_info or {}).get(field.get("key"))
                if not val or not str(val).strip():
                    raise HTTPException(
                        status_code=400,
                        detail=f"请填写必填项: {field.get('label')}"
                    )

    # 6. Identity & Quota Check
    identity_key = compute_identity_key(campaign, vote_data.visitor_id, vote_data.extra_info)
    identity = db.query(VoterIdentity).filter(
        VoterIdentity.campaign_id == campaign.id,
        VoterIdentity.identity_key == identity_key
    ).first()

    is_daily = getattr(campaign, 'quota_type', 'lifecycle') == 'daily'
    already_voted_candidates = set()
    if identity:
        valid_logs_query = db.query(VoteLog).filter(
            VoteLog.campaign_id == campaign.id,
            VoteLog.identity_id == identity.id,
            VoteLog.is_valid == 1
        )
        if is_daily:
            today_start = datetime.combine(date.today(), datetime.min.time())
            valid_logs_query = valid_logs_query.filter(VoteLog.created_at >= today_start)

        valid_logs = valid_logs_query.all()
        already_voted_candidates = {l.candidate_id for l in valid_logs}

    # Rule 4.A: Cannot vote for the same candidate twice within the quota period!
    for cid in candidate_ids:
        if cid in already_voted_candidates:
            cand = next((c for c in candidates if c.id == cid), None)
            name = cand.title if cand else "候选项目"
            msg = f"您今日已为【{name}】投过票，请明日再来支持！" if is_daily else f"您已为【{name}】投过票，不可重复支持同一项目"
            raise HTTPException(status_code=400, detail=msg)

    # Quota check
    if len(already_voted_candidates) + len(candidate_ids) > campaign.max_votes_per_person:
        remaining = max(0, campaign.max_votes_per_person - len(already_voted_candidates))
        quota_desc = "今日" if is_daily else ""
        raise HTTPException(
            status_code=400,
            detail=f"投票超出{quota_desc}额度限制！您{quota_desc}最多还能投 {remaining} 票，本次选择了 {len(candidate_ids)} 项"
        )

    # 7. Atomic Write Transaction
    if not identity:
        identity = VoterIdentity(
            campaign_id=campaign.id,
            identity_key=identity_key,
            voter_info_json=json.dumps(vote_data.extra_info or {}, ensure_ascii=False),
            total_voted=0
        )
        db.add(identity)
        db.flush()
    else:
        # Merge updated extra_info
        existing_info = json.loads(identity.voter_info_json or "{}")
        existing_info.update(vote_data.extra_info or {})
        identity.voter_info_json = json.dumps(existing_info, ensure_ascii=False)

    for cand in candidates:
        cand.vote_count += 1
        log = VoteLog(
            campaign_id=campaign.id,
            candidate_id=cand.id,
            identity_id=identity.id,
            client_ip=client_ip,
            visitor_id=vote_data.visitor_id,
            user_agent=user_agent[:500] if user_agent else None,
            is_valid=1
        )
        db.add(log)

    identity.total_voted = len(already_voted_candidates) + len(candidate_ids)
    db.commit()

    # 8. Broadcast Realtime SSE Event
    all_voted_ids = list(already_voted_candidates.union(set(candidate_ids)))
    remaining_votes = max(0, campaign.max_votes_per_person - len(all_voted_ids))

    # Async broadcast (push updated candidate vote counts)
    candidate_tallies = {c.id: c.vote_count for c in campaign.candidates}
    await broadcaster.broadcast(
        campaign.id,
        {
            "event": "vote_cast",
            "campaign_id": campaign.id,
            "tallies": candidate_tallies,
            "total_votes": sum(candidate_tallies.values())
        }
    )

    return VoteSubmitResponse(
        success=True,
        message="投票成功！感谢您的参与！",
        remaining_votes=remaining_votes,
        voted_candidate_ids=all_voted_ids
    )
