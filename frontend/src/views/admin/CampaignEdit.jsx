import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { 
  ArrowLeft, 
  Save, 
  Check, 
  Plus, 
  Trash2, 
  Upload, 
  Video, 
  Image as ImageIcon, 
  FileText,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Settings,
  Users,
  Eye,
  RotateCcw
} from 'lucide-react';

export default function CampaignEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Campaign State
  const [code, setCode] = useState('');
  const [templateType, setTemplateType] = useState('video');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [status, setStatus] = useState('active');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Rules State
  const [maxVotes, setMaxVotes] = useState(1);
  const [voteMode, setVoteMode] = useState('batch');
  const [ipDailyLimit, setIpDailyLimit] = useState(50);
  const [isRealname, setIsRealname] = useState(true);
  const [voterFields, setVoterFields] = useState([]);

  // Candidates State
  const [candidates, setCandidates] = useState([]);
  
  // New Candidate Drawer/Form
  const [showAddCand, setShowAddCand] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Fetch campaign details
  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/campaigns/${id}`);
      const data = res.data;
      setCode(data.code);
      setTemplateType(data.template_type);
      setTitle(data.title);
      setSubtitle(data.subtitle || '');
      setDescription(data.description || '');
      setBannerUrl(data.banner_url || '');
      setStatus(data.status);
      setStartTime(data.start_time ? data.start_time.replace(' ', 'T').substring(0, 16) : '');
      setEndTime(data.end_time ? data.end_time.replace(' ', 'T').substring(0, 16) : '');
      setMaxVotes(data.max_votes_per_person || 1);
      setVoteMode(data.vote_mode || 'batch');
      setIpDailyLimit(data.ip_daily_limit || 50);
      setIsRealname(data.is_realname);
      setVoterFields(data.voter_fields || []);
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err.response?.data?.detail || '无法获取活动详情');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  // Dynamic field helpers
  const addField = () => {
    setVoterFields([
      ...voterFields,
      { key: `custom_${Date.now()}`, label: '新字段', type: 'text', required: false }
    ]);
  };

  const removeField = (index) => {
    setVoterFields(voterFields.filter((_, i) => i !== index));
  };

  const updateField = (index, updates) => {
    const updated = [...voterFields];
    updated[index] = { ...updated[index], ...updates };
    setVoterFields(updated);
  };

  // Upload helpers
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingCover(true);
    try {
      const res = await api.post('/media/upload/image', formData);
      setNewCoverUrl(res.data.url);
    } catch (err) {
      alert(err.response?.data?.detail || '封面上传失败');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = templateType === 'video';
    const endpoint = isVideo ? '/media/upload/video' : '/media/upload/image';
    const formData = new FormData();
    formData.append('file', file);
    setUploadingMedia(true);
    try {
      const res = await api.post(endpoint, formData);
      setNewMediaUrl(res.data.url);
    } catch (err) {
      alert(err.response?.data?.detail || '媒体文件上传失败');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Add Candidate via API
  const handleCreateCandidate = async () => {
    if (!newTitle.trim()) {
      alert('请填写候选项目名称');
      return;
    }
    try {
      const payload = {
        title: newTitle.trim(),
        subtitle: newSubtitle.trim() || null,
        description: newDesc.trim() || null,
        cover_url: newCoverUrl || null,
        media_url: newMediaUrl || null,
        display_order: candidates.length + 1,
        is_active: true
      };
      const res = await api.post(`/campaigns/${id}/candidates`, payload);
      setCandidates([...candidates, res.data]);
      setNewTitle('');
      setNewSubtitle('');
      setNewDesc('');
      setNewCoverUrl('');
      setNewMediaUrl('');
      setShowAddCand(false);
    } catch (err) {
      alert(err.response?.data?.detail || '添加候选项目失败');
    }
  };

  // Delete Candidate via API
  const handleDeleteCandidate = async (candId, candTitle) => {
    if (!window.confirm(`确定要移除候选项目【${candTitle}】吗？`)) return;
    try {
      await api.delete(`/campaigns/${id}/candidates/${candId}`);
      setCandidates(candidates.filter(c => c.id !== candId));
    } catch (err) {
      alert(err.response?.data?.detail || '删除失败');
    }
  };

  // Save Campaign updates
  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title,
        subtitle: subtitle || null,
        description: description || null,
        template_type: templateType,
        banner_url: bannerUrl || null,
        status,
        start_time: startTime ? startTime.replace('T', ' ') + (startTime.length === 16 ? ':00' : '') : null,
        end_time: endTime ? endTime.replace('T', ' ') + (endTime.length === 16 ? ':00' : '') : null,
        max_votes_per_person: parseInt(maxVotes, 10),
        vote_mode: voteMode,
        is_realname: isRealname,
        voter_fields: isRealname ? voterFields : [],
        ip_daily_limit: parseInt(ipDailyLimit, 10)
      };

      await api.put(`/campaigns/${id}`, payload);
      setToast('🎉 活动配置已成功更新！');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败，请检查填写内容');
    } finally {
      setSaving(false);
    }
  };

  const handleResetVotes = async () => {
    const confirmed = window.confirm(
      `⚠️ 高危操作确认：\n\n确定要清空并重置活动【${title}】的所有投票记录吗？\n\n此操作将清空所有投票流水日志、清零各作品累计得票，并让所有人重新获得投票资格！\n活动配置与视频文件完好保留。\n确定继续吗？`
    );
    if (!confirmed) return;
    try {
      const res = await api.post(`/campaigns/${id}/reset-votes`);
      alert(res.data.message || '重置成功！所有投票数据已清零。');
      fetchCampaign();
    } catch (err) {
      alert(err.response?.data?.detail || '重置失败');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {toast && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4">
          <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/campaigns" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              修改活动与模板配置
            </span>
            <span className="text-xs font-mono text-slate-400">短码: {code}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">编辑投票活动</h1>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/v/${code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Eye className="w-3.5 h-3.5" />
            前台预览
          </a>
          <button
            onClick={handleSaveCampaign}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSaveCampaign} className="space-y-6">
        {/* Section 1: Template and Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            活动状态与模板类型
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">活动当前状态 *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="active">🟢 进行中 (正常开放投票)</option>
                <option value="paused">🟠 已暂停 (前台提示已暂停)</option>
                <option value="draft">⚪ 草稿 (暂未开放)</option>
                <option value="ended">🔴 已结束 (截止投票)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">展现模板类型 *</label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="video">🎬 短视频竞赛模板</option>
                <option value="image">🖼️ 图文展示模板</option>
                <option value="text">📝 纯文字评选模板</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">活动标题 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">副标题 / 选送标语</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">活动详细规则与介绍</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">开始时间（选填）</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">截止时间（选填）</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Voting Rules and Modes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            投票规则与交互方式
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">每人最多总票数 (N 票) *</label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxVotes}
                onChange={(e) => setMaxVotes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">单作品限投 1 票</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">投票交互方式 *</label>
              <select
                value={voteMode}
                onChange={(e) => setVoteMode(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-600"
              >
                <option value="batch">勾选多选后统一提交 (购物车模式)</option>
                <option value="instant">即时逐项投票 (边看边投)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {voteMode === 'batch' ? '支持卡片复选，底部悬浮条统一提交' : '点击按钮即时单次投出'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">同 IP 每日防刷上限 *</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={ipDailyLimit}
                onChange={(e) => setIpDailyLimit(parseInt(e.target.value) || 50)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">单日出口 IP 票数保护</span>
            </div>
          </div>

          {/* Realname and dynamic fields */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-bold text-slate-800">投票人实名与机构登记</span>
                <p className="text-[11px] text-slate-500">是否在投票时收集姓名、所属部门等字段</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRealname(!isRealname)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isRealname ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isRealname ? '已开启实名登记' : '完全匿名投票'}
              </button>
            </div>

            {isRealname && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">登记字段列表</span>
                  <button
                    type="button"
                    onClick={addField}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加新字段
                  </button>
                </div>

                {voterFields.map((f, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        placeholder="字段标题"
                        className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => updateField(idx, { type: e.target.value })}
                        className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="text">单行文本</option>
                        <option value="select">下拉单选菜单</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) => updateField(idx, { required: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        必填项
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-blue-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.enable_analytics !== false}
                          onChange={(e) => updateField(idx, { enable_analytics: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        纳入大屏与报表统计汇总
                      </label>
                    </div>

                    {f.type === 'select' && (
                      <input
                        type="text"
                        value={Array.isArray(f.options) ? f.options.join('，') : f.options || ''}
                        onChange={(e) => updateField(idx, { options: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) })}
                        placeholder="逗号或中文逗号分隔选项，如：荣县支行，富顺支行"
                        className="w-full sm:w-64 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Candidates List & Management */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">候选项目管理 ({candidates.length} 项)</h2>
              <p className="text-xs text-slate-500">添加、修改或删除参赛选手与作品</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCand(!showAddCand)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs transition"
            >
              <Plus className="w-4 h-4" />
              {showAddCand ? '取消新增' : '新增候选项目'}
            </button>
          </div>

          {/* Add Candidate Sub-form */}
          {showAddCand && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-3">
              <h3 className="text-xs font-bold text-blue-900">录入新候选项目</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="作品/候选人名称 *"
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="选送单位/副标题"
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="详细介绍内容..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>{uploadingCover ? '上传中...' : '上传封面图'}</span>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </label>
                {newCoverUrl && <span className="text-xs text-emerald-600">✓ 封面已上传</span>}

                {templateType === 'video' && (
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <Video className="w-3.5 h-3.5 text-purple-600" />
                    <span>{uploadingMedia ? '视频上传中...' : '上传视频 (≤100MB)'}</span>
                    <input type="file" accept="video/mp4,video/webm" onChange={handleMediaUpload} className="hidden" />
                  </label>
                )}
                {newMediaUrl && <span className="text-xs text-purple-600">✓ 视频已上传</span>}

                <button
                  type="button"
                  onClick={handleCreateCandidate}
                  className="ml-auto px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  确认添加
                </button>
              </div>
            </div>
          )}

          {/* Existing Candidates List */}
          <div className="space-y-2">
            {candidates.map((cand, idx) => (
              <div
                key={cand.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  {cand.cover_url && (
                    <img src={cand.cover_url} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 truncate">{cand.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{cand.subtitle || '无副标题'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">{cand.vote_count} 票</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCandidate(cand.id, cand.title)}
                    className="text-slate-400 hover:text-red-600 p-1 transition"
                    title="删除该候选项目"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存活动全部修改'}
          </button>
        </div>

        {/* Danger Zone: Reset Campaign Votes */}
        <div className="mt-8 bg-red-50/60 rounded-2xl border border-red-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-red-600" />
              清空并重置投票数据 (重新开始)
            </h3>
            <p className="text-xs text-red-700/80 mt-1 leading-relaxed">
              清空本活动全部投票明细流水，清零所有作品得票数，重置所有人的投票额度资格。活动配置与视频文件完好保留。
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetVotes}
            className="px-4 py-2.5 bg-white border border-red-300 text-red-700 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition shadow-sm flex-shrink-0"
          >
            重置本活动全部投票
          </button>
        </div>
      </form>
    </div>
  );
}
