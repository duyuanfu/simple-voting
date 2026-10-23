import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { 
  Plus, 
  ExternalLink, 
  BarChart3, 
  FileText, 
  Trash2, 
  Copy, 
  Check, 
  Video, 
  Image as ImageIcon, 
  FileEdit,
  Users,
  ShieldCheck,
  Pencil
} from 'lucide-react';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`确定要删除活动【${title}】吗？删除后所有候选作品与投票数据将一并清除！`)) {
      return;
    }
    try {
      await api.delete(`/campaigns/${id}`);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || '删除失败');
    }
  };

  const copyPublicLink = (code) => {
    const fullUrl = `${window.location.origin}/v/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const templateBadges = {
    text: { label: '文字评选', icon: FileEdit, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    image: { label: '图文评选', icon: ImageIcon, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    video: { label: '视频竞赛', icon: Video, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  const statusBadges = {
    active: { label: '进行中', color: 'bg-green-500' },
    draft: { label: '草稿', color: 'bg-amber-500' },
    paused: { label: '已暂停', color: 'bg-orange-500' },
    ended: { label: '已结束', color: 'bg-slate-400' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">活动管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理您创建的所有投票活动，监控实时数据与下载审计报表</p>
        </div>
        <Link
          to="/admin/campaigns/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          创建新投票活动
        </Link>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">暂无投票活动</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            您可以点击下方按钮，使用文字、图片或视频模板创建第一个投票活动。
          </p>
          <Link
            to="/admin/campaigns/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition text-sm"
          >
            <Plus className="w-4 h-4" />
            立即创建活动
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c) => {
            const template = templateBadges[c.template_type] || templateBadges.text;
            const TemplateIcon = template.icon;
            const status = statusBadges[c.status] || statusBadges.active;
            const totalVotes = c.candidates.reduce((sum, item) => sum + item.vote_count, 0);

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${template.color}`}>
                      <TemplateIcon className="w-3.5 h-3.5" />
                      {template.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
                      {status.label}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1">{c.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                    {c.subtitle || c.description || '暂无副标题描述'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-xs text-slate-400">候选项目</span>
                      <span className="font-semibold text-slate-800 text-sm">{c.candidates.length} 项</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-xs text-slate-400">累计总票</span>
                      <span className="font-semibold text-blue-600 text-sm">{totalVotes}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-xs text-slate-400">票制额度</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {c.quota_type === 'daily' ? `每日${c.max_votes_per_person}票` : `每人${c.max_votes_per_person}票`}
                      </span>
                    </div>
                  </div>

                  {c.is_realname && (
                    <div className="mt-3 flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>开启实名/机构扩展信息登记</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/admin/campaigns/${c.id}/edit`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 hover:border-blue-200 transition font-medium"
                      title="编辑修改活动配置"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      编辑
                    </Link>
                    <Link
                      to={`/admin/campaigns/${c.id}/dashboard`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 hover:border-blue-200 transition font-medium"
                      title="实时数据大屏看板"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                      大屏
                    </Link>
                    <Link
                      to={`/admin/campaigns/${c.id}/audit`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 hover:border-blue-200 transition font-medium"
                      title="投票审计与Excel导出"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      审计
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyPublicLink(c.code)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 transition"
                      title="复制公众投票链接"
                    >
                      {copiedCode === c.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>短链</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`/v/${c.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition"
                      title="新窗口打开投票页"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(c.id, c.title)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="删除活动"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
