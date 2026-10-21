import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from app.db.session import engine, SessionLocal
from app.models.entities import Campaign, Candidate, VoterIdentity, VoteLog

def reset_campaign_votes(campaign_code: str = "video001"):
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(
            (Campaign.code == campaign_code) | 
            (Campaign.title.like(f"%{campaign_code}%"))
        ).first()

        if not campaign:
            print(f"[Error] 未找到标识或标题包含 '{campaign_code}' 的活动")
            return

        print(f"正在重置活动【{campaign.title}】(ID: {campaign.id}, Code: {campaign.code}) 的所有投票数据...")

        # 1. 删除所有投票审计日志流水
        deleted_logs = db.query(VoteLog).filter(VoteLog.campaign_id == campaign.id).delete()

        # 2. 删除所有投票人身份登记及已用额度记录 (恢复每人 N 票的全新状态)
        deleted_identities = db.query(VoterIdentity).filter(VoterIdentity.campaign_id == campaign.id).delete()

        # 3. 将所有候选作品的票数清零
        candidates = db.query(Candidate).filter(Candidate.campaign_id == campaign.id).all()
        for cand in candidates:
            cand.vote_count = 0

        db.commit()

        print("==================================================")
        print("🎉 重置完成！")
        print(f"  - 清空投票明细流水: {deleted_logs} 条")
        print(f"  - 重置投票人身份配额: {deleted_identities} 条")
        print(f"  - 清零候选作品得票: {len(candidates)} 个作品")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"[Error] 重置失败: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    code = sys.argv[1] if len(sys.argv) > 1 else "video001"
    reset_campaign_votes(code)
