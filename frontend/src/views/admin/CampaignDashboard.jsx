import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { 
  BarChart3, 
  Users, 
  Globe, 
  ExternalLink, 
  Copy, 
  Check, 
  Radio, 
  ArrowLeft,
  FileText,
  Sparkles,
  Trophy,
  Settings
} from 'lucide-react';

export default function CampaignDashboard() {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pulsingCandidateId, setPulsingCandidateId] = useState(null);

  // Fetch initial campaign & stats
  const fetchInitialData = async () => {
    try {
      const [campRes, statsRes] = await Promise.all([
        api.get(`/campaigns/${id}`),
        api.get(`/analytics/campaigns/${id}/stats`)
      ]);
      setCampaign(campRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  // Setup SSE connection
  useEffect(() => {
    const sseUrl = `/api/v1/analytics/campaigns/${id}/stream`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.tallies) {
          setStats((prev) => {
            if (!prev) return prev;
            const updatedRankings = prev.rankings.map((c) => {
              const newTally = data.tallies[c.id];
              return newTally !== undefined ? { ...c, vote_count: newTally } : c;
            }).sort((a, b) => b.vote_count - a.vote_count);

            return {
              ...prev,
              total_votes: data.total_votes,
              rankings: updatedRankings
            };
          });
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (err) {
        // Heartbeat or ping
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  const copyLink = () => {
    if (!campaign) return;
    const url = `${window.location.origin}/v/${campaign.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!stats || !campaign) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const maxVotes = stats.rankings[0]?.vote_count || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/campaigns" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              实时数据大屏
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`}></span>
              <span className="text-slate-500 font-medium">
                {connected ? 'SSE 实时长连接正常' : '重连中...'}
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{campaign.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/admin/campaigns/${campaign.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            编辑配置
          </Link>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '短链已复制' : '复制短链'}
          </button>
          <a
            href={`/v/${campaign.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            前台体验
          </a>
          <Link
            to={`/admin/campaigns/${campaign.id}/audit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <FileText className="w-3.5 h-3.5" />
            投票审计流水
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">累计有效得票</span>
            <div className="text-3xl font-black text-slate-900 tracking-tight transition-all duration-300">
              {stats.total_votes.toLocaleString()}
            </div>
            {lastUpdate && <span className="text-[10px] text-slate-400">最新更新: {lastUpdate}</span>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">独立参与人次</span>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.total_participants.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">设备指纹/实名唯一身份</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">独立访问来源 IP</span>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.unique_ips.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">出口公网 IP 地址覆盖</span>
          </div>
        </div>
      </div>

      {/* Live Ranking Board */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">动态排行榜 (Live Leaderboard)</h2>
          </div>
          <span className="text-xs text-slate-400">
            当有人在前端投票时，数据将自动无感翻牌跳动
          </span>
        </div>

        <div className="space-y-4">
          {stats.rankings.map((cand, idx) => {
            const percent = stats.total_votes > 0 ? (cand.vote_count / stats.total_votes) * 100 : 0;
            const barWidth = maxVotes > 0 ? (cand.vote_count / maxVotes) * 100 : 0;

            return (
              <div
                key={cand.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 shadow-sm'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-700/60 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  {cand.cover_url && (
                    <img
                      src={cand.cover_url}
                      alt={cand.title}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-slate-200"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{cand.title}</h3>
                    <p className="text-xs text-slate-500 truncate">{cand.subtitle || '无副标题'}</p>
                    {/* Visual Progress Bar */}
                    <div className="mt-2 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 self-end sm:self-center">
                  <div className="text-xl font-black text-blue-600">
                    {cand.vote_count} <span className="text-xs font-normal text-slate-500">票</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    得票占比 {percent.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
