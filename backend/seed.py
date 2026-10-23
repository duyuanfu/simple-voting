import os
import shutil
import json
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy import text
from app.db.session import engine, SessionLocal, Base
from app.models.entities import Tenant, Campaign, Candidate, VoterIdentity, VoteLog
from app.core.security import get_password_hash
from app.core.config import settings

def run_migrations():
    with engine.connect() as conn:
        for col_sql in [
            "ALTER TABLE campaigns ADD COLUMN vote_mode TEXT DEFAULT 'batch'",
            "ALTER TABLE campaigns ADD COLUMN quota_type TEXT DEFAULT 'lifecycle'"
        ]:
            try:
                conn.execute(text(col_sql))
                conn.commit()
            except Exception:
                pass

def seed():
    Base.metadata.create_all(bind=engine)
    run_migrations()
    db = SessionLocal()

    # Robust docs resolution (works locally and in Docker)
    docs_dir = Path(__file__).resolve().parent / "docs"
    if not docs_dir.exists():
        docs_dir = Path(__file__).resolve().parent.parent / "docs"
    if not docs_dir.exists():
        docs_dir = Path("/app/docs")

    try:
        # 1. Create or get demo tenant
        tenant = db.query(Tenant).filter(Tenant.username == "admin").first()
        if not tenant:
            tenant = Tenant(
                name="自贡农商银行总行",
                username="admin",
                password_hash=get_password_hash("dyf5970@"),
                is_active=True
            )
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print(f"[Seed] Created demo tenant: {tenant.username} (password: dyf5970@)")
        else:
            tenant.password_hash = get_password_hash("dyf5970@")
            db.commit()
            print(f"[Seed] Existing demo tenant found: {tenant.username}, password updated to dyf5970@")

        # Ensure upload dirs for tenant 1
        tenant_video_dir = settings.UPLOAD_DIR / f"tenant_{tenant.id}" / "videos"
        tenant_cover_dir = settings.UPLOAD_DIR / f"tenant_{tenant.id}" / "covers"
        tenant_video_dir.mkdir(parents=True, exist_ok=True)
        tenant_cover_dir.mkdir(parents=True, exist_ok=True)

        # Copy sample videos if available
        sample_videos = {}
        for i in range(1, 6):
            src_video = docs_dir / "videos" / f"{i}.mp4"
            if src_video.exists():
                dest_video = tenant_video_dir / f"sample_{i}.mp4"
                if not dest_video.exists():
                    shutil.copy2(src_video, dest_video)
                sample_videos[i] = f"/api/v1/media/stream/tenant_{tenant.id}/videos/sample_{i}.mp4"

        # Copy sample covers if available
        sample_covers = {}
        for i in range(1, 6):
            src_cover = docs_dir / "covers" / f"cover_{i:02d}.jpg"
            if src_cover.exists():
                dest_cover = tenant_cover_dir / f"sample_cover_{i}.jpg"
                if not dest_cover.exists():
                    shutil.copy2(src_cover, dest_cover)
                sample_covers[i] = f"/api/v1/media/stream/tenant_{tenant.id}/covers/sample_cover_{i}.jpg"

        # 2. Check or create Video Campaign
        video_campaign = db.query(Campaign).filter(
            Campaign.tenant_id == tenant.id,
            Campaign.code == "video001"
        ).first()

        units = ["荣县支行", "富顺支行", "自流井支行", "贡井支行", "大安支行", "沿滩支行", "高新支行", "市行机关"]

        if not video_campaign:
            voter_fields = [
                {"key": "real_name", "label": "投票人姓名", "type": "text", "required": True},
                {"key": "unit", "label": "所属支行/单位机构", "type": "select", "options": units, "required": True}
            ]

            video_campaign = Campaign(
                tenant_id=tenant.id,
                code="video001",
                title="自贡农商银行法治合规短视频竞赛活动",
                subtitle="尊法合规·金融为民",
                description="聚焦合规管理、风险管理、案件防控、员工行为管理等日常重点，以案为鉴，体现业务经营热点、难点，有效警醒和入脑入心。市行组织法治合规视频竞赛活动，快来为你最喜欢的优秀作品投票吧！",
                template_type="video",
                status="active",
                max_votes_per_person=1,
                is_realname=True,
                voter_fields_json=json.dumps(voter_fields, ensure_ascii=False),
                ip_daily_limit=50
            )
            db.add(video_campaign)
            db.commit()
            db.refresh(video_campaign)

            # Add 5 Candidates
            cands_info = [
                ("《“九五”普法宣传——远离非法助贷陷阱，守住自身财产安全》", "尊法合规·金融为民", "围绕反诈普法宣传，深度揭示非法助贷隐患，守住百姓财产安全。"),
                ("《网点合规微短剧》", "柜面风险防控与合规经办", "以网点日常柜面业务为切入点，规范员工合规操作行为，防范操作风险。"),
                ("《筑牢金融“铁围栏” 守住百姓“钱袋子”》", "荣县支行", "展现荣县支行践行合规经营理念，筑牢金融安全堤坝的务实作为。"),
                ("《防范非法集资与反诈宣传微短剧》", "守护银龄财产安全", "聚焦老年客户群体反诈宣传，普及防范非法集资知识。"),
                ("《合规无小事——保护客户信息，守住职业底线》", "市行合规案例剖析", "强化员工保密意识，筑牢个人金融信息防护网。")
            ]

            for idx, (title, subtitle, desc) in enumerate(cands_info, 1):
                cand = Candidate(
                    campaign_id=video_campaign.id,
                    title=title,
                    subtitle=subtitle,
                    description=desc,
                    cover_url=sample_covers.get(idx),
                    media_url=sample_videos.get(idx),
                    vote_count=0,
                    display_order=idx,
                    is_active=True
                )
                db.add(cand)

            db.commit()
            print(f"[Seed] Created Video Campaign: {video_campaign.title} (Code: {video_campaign.code})")
        else:
            # Repair existing candidates if their media_url was missing
            for idx, cand in enumerate(video_campaign.candidates, 1):
                if not cand.media_url and sample_videos.get(idx):
                    cand.media_url = sample_videos.get(idx)
                if not cand.cover_url and sample_covers.get(idx):
                    cand.cover_url = sample_covers.get(idx)
            db.commit()
            print(f"[Seed] Verified and repaired video campaign media URLs.")

        # 3. Create a Demo Image Campaign (一人多票：3票)
        image_campaign = db.query(Campaign).filter(
            Campaign.tenant_id == tenant.id,
            Campaign.code == "photo002"
        ).first()

        if not image_campaign:
            image_campaign = Campaign(
                tenant_id=tenant.id,
                code="photo002",
                title="“金融光影”职工摄影风采摄影大赛",
                subtitle="记录一线点滴，定格奋斗瞬间",
                description="用镜头捕捉农商人在普法宣传、深入田间地头、服务乡村振兴一线的最美身影。每人可投 3 票，不可重复支持同一作品。",
                template_type="image",
                status="active",
                max_votes_per_person=3,
                is_realname=False,
                ip_daily_limit=50
            )
            db.add(image_campaign)
            db.commit()
            db.refresh(image_campaign)

            for idx in range(1, 6):
                cand = Candidate(
                    campaign_id=image_campaign.id,
                    title=f"摄影作品 {idx} 号：《晨曦中的金融网点》",
                    subtitle=f"作者：农商摄影组 {idx}",
                    description=f"记录清晨网点开门迎客前的细致准备工作，光影柔和，展现敬业风貌。",
                    cover_url=sample_covers.get(idx),
                    media_url=sample_covers.get(idx),
                    vote_count=0,
                    display_order=idx,
                    is_active=True
                )
                db.add(cand)
            db.commit()
            print(f"[Seed] Created Image Campaign: {image_campaign.title} (Code: {image_campaign.code})")
        else:
            for idx, cand in enumerate(image_campaign.candidates, 1):
                if not cand.cover_url and sample_covers.get(idx):
                    cand.cover_url = sample_covers.get(idx)
                    cand.media_url = sample_covers.get(idx)
            db.commit()
            print(f"[Seed] Verified and repaired image campaign media URLs.")

        # 4. Create a Demo Text Campaign
        text_campaign = db.query(Campaign).filter(
            Campaign.tenant_id == tenant.id,
            Campaign.code == "hero003"
        ).first()

        if not text_campaign:
            text_campaign = Campaign(
                tenant_id=tenant.id,
                code="hero003",
                title="2026年度“合规服务标兵”先进个人评选",
                subtitle="学标兵·当先锋·立新功",
                description="评选恪守职业操守、风险防控成效显著的优秀员工。每人至多投 2 票。",
                template_type="text",
                status="active",
                max_votes_per_person=2,
                is_realname=True,
                voter_fields_json=json.dumps([{"key": "real_name", "label": "评选人姓名", "type": "text", "required": True}], ensure_ascii=False),
                ip_daily_limit=30
            )
            db.add(text_campaign)
            db.commit()
            db.refresh(text_campaign)

            text_candidates = [
                ("李建国（营业部业务主管）", "市行营业部", "从业12年来坚持合规经办无一笔差错，累计化解疑似电信诈骗汇款18起，为客户挽回直接损失超百万元。"),
                ("王晓梅（荣县支行客户经理）", "荣县支行", "深入乡镇网点走访，严把授信审查合规关口，所管辖信贷资产保持零逾期、零不良。"),
                ("张伟（科技信息部安全运维）", "信息科技部", "主导网络安全等保评测与终端行为合规监控，多次获评市行安全合规卫士标兵称号。")
            ]

            for idx, (title, sub, desc) in enumerate(text_candidates, 1):
                cand = Candidate(
                    campaign_id=text_campaign.id,
                    title=title,
                    subtitle=sub,
                    description=desc,
                    vote_count=0,
                    display_order=idx,
                    is_active=True
                )
                db.add(cand)
            db.commit()
            print(f"[Seed] Created Text Campaign: {text_campaign.title} (Code: {text_campaign.code})")

        # Seed initial votes for video_campaign to test analytics and Excel export
        existing_votes = db.query(VoteLog).filter(VoteLog.campaign_id == video_campaign.id).count()
        if existing_votes == 0:
            cands = video_campaign.candidates
            sample_voters = [
                ("张明", "荣县支行", 0),
                ("陈洁", "荣县支行", 0),
                ("刘强", "富顺支行", 1),
                ("周燕", "自流井支行", 2),
                ("赵敏", "市行机关", 4),
                ("孙浩", "高新支行", 3),
                ("黄婷", "贡井支行", 0),
            ]

            for idx, (vname, vunit, c_idx) in enumerate(sample_voters, 1):
                cand = cands[c_idx]
                identity_key = f"seed_{idx}_{vname}"
                identity = VoterIdentity(
                    campaign_id=video_campaign.id,
                    identity_key=identity_key,
                    voter_info_json=json.dumps({"real_name": vname, "unit": vunit}, ensure_ascii=False),
                    total_voted=1
                )
                db.add(identity)
                db.flush()

                cand.vote_count += 1
                log = VoteLog(
                    campaign_id=video_campaign.id,
                    candidate_id=cand.id,
                    identity_id=identity.id,
                    client_ip="192.168.1.100",
                    visitor_id=f"demo_visitor_{idx}",
                    user_agent="Mozilla/5.0 Demo Browser",
                    is_valid=1
                )
                db.add(log)

            db.commit()
            print(f"[Seed] Successfully seeded {len(sample_voters)} sample votes into video campaign!")

        print("\n=== [Seed Summary] ===")
        print("Tenant Admin Username: admin")
        print("Tenant Admin Password: dyf5970@")
        print(f"Video Campaign Link:  http://localhost:5173/v/{video_campaign.code}")
        print(f"Image Campaign Link:  http://localhost:5173/v/{image_campaign.code}")
        print(f"Text Campaign Link:   http://localhost:5173/v/{text_campaign.code}")
        print("Admin Dashboard URL:  http://localhost:5173/admin/campaigns")
        print("======================\n")

    finally:
        db.close()

if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        print(f"[Seed Warning] Error running seed (will continue starting server): {e}")
