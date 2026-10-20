from datetime import datetime
import json
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    campaigns = relationship("Campaign", back_populates="tenant", cascade="all, delete-orphan")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(16), unique=True, index=True, nullable=False)
    title = Column(String(256), nullable=False)
    subtitle = Column(String(256), nullable=True)
    description = Column(Text, nullable=True)
    template_type = Column(String(32), default="text")  # 'text', 'image', 'video'
    banner_url = Column(String(512), nullable=True)
    status = Column(String(32), default="active")       # 'draft', 'active', 'paused', 'ended'
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    
    # Rules
    max_votes_per_person = Column(Integer, default=1)   # N votes per person
    vote_mode = Column(String(32), default="batch")     # 'batch' (多选统一提交) or 'instant' (逐项即时投)
    is_realname = Column(Boolean, default=False)
    voter_fields_json = Column(Text, default="[]")       # JSON array of field definitions
    ip_daily_limit = Column(Integer, default=50)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    tenant = relationship("Tenant", back_populates="campaigns")
    candidates = relationship("Candidate", back_populates="campaign", cascade="all, delete-orphan", order_by="Candidate.display_order")
    voter_identities = relationship("VoterIdentity", back_populates="campaign", cascade="all, delete-orphan")
    vote_logs = relationship("VoteLog", back_populates="campaign", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(256), nullable=False)
    subtitle = Column(String(256), nullable=True)
    description = Column(Text, nullable=True)
    cover_url = Column(String(512), nullable=True)
    media_url = Column(String(512), nullable=True)       # Video path or high-res image
    vote_count = Column(Integer, default=0, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    campaign = relationship("Campaign", back_populates="candidates")
    vote_logs = relationship("VoteLog", back_populates="candidate", cascade="all, delete-orphan")


class VoterIdentity(Base):
    __tablename__ = "voter_identities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    identity_key = Column(String(128), nullable=False, index=True)
    voter_info_json = Column(Text, default="{}")         # Stored dynamic submitted fields
    total_voted = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    campaign = relationship("Campaign", back_populates="voter_identities")
    vote_logs = relationship("VoteLog", back_populates="voter_identity", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("campaign_id", "identity_key", name="uq_campaign_identity"),
    )


class VoteLog(Base):
    __tablename__ = "vote_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    identity_id = Column(Integer, ForeignKey("voter_identities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    client_ip = Column(String(64), nullable=False, index=True)
    visitor_id = Column(String(128), nullable=False, index=True)
    user_agent = Column(String(512), nullable=True)
    is_valid = Column(Integer, default=1)                # 1 = Valid, 0 = Revoked
    created_at = Column(DateTime, default=datetime.now)

    campaign = relationship("Campaign", back_populates="vote_logs")
    candidate = relationship("Candidate", back_populates="vote_logs")
    voter_identity = relationship("VoterIdentity", back_populates="vote_logs")

    __table_args__ = (
        Index("idx_campaign_candidate_valid", "campaign_id", "candidate_id", "is_valid"),
        Index("idx_campaign_ip_created", "campaign_id", "client_ip", "created_at"),
    )
