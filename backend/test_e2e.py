import sys
sys.stdout.reconfigure(encoding='utf-8')
import asyncio
from fastapi.testclient import TestClient
from main import app

def run_e2e_tests():
    client = TestClient(app)

    print("\n================== [RUNNING END-TO-END TESTS] ==================")

    # 1. Tenant Registration
    print("[1/9] Testing Tenant Self-Service Registration...")
    reg_res = client.post("/api/v1/auth/register", json={
        "name": "测试企业机构",
        "username": f"test_corp_{hash('corp') % 10000}",
        "password": "testpassword123"
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("  ✓ Tenant registered and JWT token acquired")

    # 2. Tenant Login
    print("[2/9] Testing Tenant Authentication & Profile...")
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    print(f"  ✓ Logged in as: {me_res.json()['name']}")

    # 3. Create a Campaign (Video Template with Rules & Fields)
    print("[3/9] Testing Campaign Creation with Custom Rules & Dynamic Fields...")
    camp_res = client.post("/api/v1/campaigns", headers=headers, json={
        "title": "2026年度业务技能大比拼投票",
        "subtitle": "卓越技能·勇攀高峰",
        "description": "展示各分部业务标兵视频风采",
        "template_type": "video",
        "status": "active",
        "max_votes_per_person": 2,
        "is_realname": True,
        "voter_fields": [
            {"key": "real_name", "label": "投票人姓名", "type": "text", "required": True},
            {"key": "unit", "label": "所属部门", "type": "select", "options": ["市场部", "研发部"], "required": True}
        ],
        "ip_daily_limit": 50
    })
    assert camp_res.status_code == 201, f"Create campaign failed: {camp_res.text}"
    camp_data = camp_res.json()
    campaign_id = camp_data["id"]
    campaign_code = camp_data["code"]
    print(f"  ✓ Campaign created! ID: {campaign_id}, Code: {campaign_code}")

    # 4. Add Candidates
    print("[4/9] Testing Candidate Creation...")
    cand1 = client.post(f"/api/v1/campaigns/{campaign_id}/candidates", headers=headers, json={
        "title": "作品一：高效客户沟通微视频",
        "subtitle": "市场部选送",
        "description": "生动演示沟通技巧",
        "display_order": 1
    }).json()

    cand2 = client.post(f"/api/v1/campaigns/{campaign_id}/candidates", headers=headers, json={
        "title": "作品二：核心架构演进解读",
        "subtitle": "研发部选送",
        "description": "深入浅出解析微服务架构",
        "display_order": 2
    }).json()
    print(f"  ✓ Added 2 candidates (ID: {cand1['id']}, {cand2['id']})")

    # 5. Public Campaign Retrieval
    print("[5/9] Testing Public API (Unauthenticated Access via Short Code)...")
    pub_res = client.get(f"/api/v1/public/campaigns/{campaign_code}")
    assert pub_res.status_code == 200
    assert len(pub_res.json()["candidates"]) == 2
    print(f"  ✓ Public campaign retrieved successfully. Found {len(pub_res.json()['candidates'])} candidates")

    # 6. Public Voting
    print("[6/9] Testing Public Voting Submission...")
    vote_res = client.post(f"/api/v1/public/campaigns/{campaign_code}/vote", json={
        "candidate_ids": [cand1["id"]],
        "visitor_id": "test_fp_visitor_001",
        "extra_info": {
            "real_name": "张测试",
            "unit": "市场部"
        }
    })
    assert vote_res.status_code == 200, f"Vote failed: {vote_res.text}"
    assert vote_res.json()["remaining_votes"] == 1
    print("  ✓ Vote cast successfully! Remaining votes: 1")

    # 7. Anti-Brushing Tests
    print("[7/9] Testing Anti-Brushing & Constraint Enforcement...")
    # (a) Duplicate vote for the same candidate by same person
    dup_res = client.post(f"/api/v1/public/campaigns/{campaign_code}/vote", json={
        "candidate_ids": [cand1["id"]],
        "visitor_id": "test_fp_visitor_001",
        "extra_info": {
            "real_name": "张测试",
            "unit": "市场部"
        }
    })
    assert dup_res.status_code == 400, "Duplicate vote should be rejected"
    print(f"  ✓ Anti-brushing check passed: Duplicate vote rejected ({dup_res.json()['detail']})")

    # (b) Vote for second candidate (valid, completes quota)
    vote2_res = client.post(f"/api/v1/public/campaigns/{campaign_code}/vote", json={
        "candidate_ids": [cand2["id"]],
        "visitor_id": "test_fp_visitor_001",
        "extra_info": {
            "real_name": "张测试",
            "unit": "市场部"
        }
    })
    assert vote2_res.status_code == 200
    assert vote2_res.json()["remaining_votes"] == 0
    print("  ✓ Second vote cast. Quota reached 0")

    # (c) Attempting 3rd vote when max_votes_per_person = 2
    over_res = client.post(f"/api/v1/public/campaigns/{campaign_code}/vote", json={
        "candidate_ids": [cand1["id"]],
        "visitor_id": "test_fp_visitor_001",
        "extra_info": {
            "real_name": "张测试",
            "unit": "市场部"
        }
    })
    assert over_res.status_code == 400
    print("  ✓ Anti-brushing check passed: Exceeding quota rejected")

    # 8. Check Stats & Fraud Invalidation
    print("[8/9] Testing Audit Logs & One-Click Vote Invalidation...")
    logs_res = client.get(f"/api/v1/analytics/campaigns/{campaign_id}/logs", headers=headers)
    assert logs_res.status_code == 200
    log_item = logs_res.json()["items"][0]
    log_id = log_item["id"]

    inv_res = client.post(f"/api/v1/analytics/campaigns/{campaign_id}/logs/{log_id}/invalidate", headers=headers)
    assert inv_res.status_code == 200
    print(f"  ✓ Fraud vote #{log_id} invalidated successfully")

    # 9. Excel Export
    print("[9/9] Testing Multi-Sheet Excel Export...")
    export_res = client.get(f"/api/v1/analytics/campaigns/{campaign_id}/export", headers=headers)
    assert export_res.status_code == 200
    assert len(export_res.content) > 1000
    assert "spreadsheetml.sheet" in export_res.headers.get("content-type", "")
    print(f"  ✓ Excel workbook generated ({len(export_res.content)} bytes)")

    print("\n🎉 ALL 9 END-TO-END TESTS PASSED WITH 100% SUCCESS!\n")

if __name__ == "__main__":
    run_e2e_tests()
