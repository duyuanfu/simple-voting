import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Upload, 
  AlertCircle,
  Settings,
  ListPlus,
  Sparkles,
  Link as LinkIcon,
  Copy
} from 'lucide-react';

export default function CampaignWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Base & Template
  const [templateType, setTemplateType] = useState('video');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Step 2: Rules & Dynamic Fields
  const [maxVotes, setMaxVotes] = useState(1);
  const [quotaType, setQuotaType] = useState('lifecycle');
  const [voteMode, setVoteMode] = useState('batch');
  const [ipDailyLimit, setIpDailyLimit] = useState(50);
  const [isRealname, setIsRealname] = useState(true);
  const [voterFields, setVoterFields] = useState([
    { key: 'real_name', label: '投票人姓名', type: 'text', required: true },
    { 
      key: 'unit', 
      label: '所属支行/单位机构', 
      type: 'select', 
      options: ['市行机关', '荣县支行', '富顺支行', '自流井支行', '贡井支行', '大安支行', '沿滩支行', '高新支行'], 
      required: true 
    }
  ]);

  // Step 3: Candidates
  const [candidates, setCandidates] = useState([]);
  const [candTitle, setCandTitle] = useState('');
  const [candSubtitle, setCandSubtitle] = useState('');
  const [candDesc, setCandDesc] = useState('');
  const [candCoverUrl, setCandCoverUrl] = useState('');
  const [candMediaUrl, setCandMediaUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Step 4: Complete State
  const [createdCampaign, setCreatedCampaign] = useState(null);
  const [copied, setCopied] = useState(false);

  // Dynamic field actions
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
      setCandCoverUrl(res.data.url);
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
      setCandMediaUrl(res.data.url);
    } catch (err) {
      alert(err.response?.data?.detail || '媒体文件上传失败');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Add Candidate to list
  const handleAddCandidate = () => {
    if (!candTitle.trim()) {
      alert('请填写候选项目名称');
      return;
    }
    setCandidates([
      ...candidates,
      {
        title: candTitle.trim(),
        subtitle: candSubtitle.trim(),
        description: candDesc.trim(),
        cover_url: candCoverUrl,
        media_url: candMediaUrl,
        display_order: candidates.length + 1,
        is_active: true
      }
    ]);
    // Reset inputs
    setCandTitle('');
    setCandSubtitle('');
    setCandDesc('');
    setCandCoverUrl('');
    setCandMediaUrl('');
  };

  const removeCandidate = (idx) => {
    setCandidates(candidates.filter((_, i) => i !== idx));
  };

  // Submit complete campaign
  const handleCreateCampaign = async () => {
    setError('');
    setSubmitting(true);
    try {
      // 1. Create Campaign
      const payload = {
        title,
        subtitle: subtitle || null,
        description: description || null,
        template_type: templateType,
        banner_url: bannerUrl || null,
        status: 'active',
        start_time: startTime ? startTime.replace('T', ' ') + (startTime.length === 16 ? ':00' : '') : null,
        end_time: endTime ? endTime.replace('T', ' ') + (endTime.length === 16 ? ':00' : '') : null,
        max_votes_per_person: parseInt(maxVotes, 10),
        quota_type: quotaType,
        vote_mode: voteMode,
        is_realname: isRealname,
        voter_fields: isRealname ? voterFields : [],
        ip_daily_limit: parseInt(ipDailyLimit, 10)
      };

      const res = await api.post('/campaigns', payload);
      const newCamp = res.data;

      // 2. Add Candidates
      for (const cand of candidates) {
        await api.post(`/campaigns/${newCamp.id}/candidates`, cand);
      }

      setCreatedCampaign(newCamp);
      setCurrentStep(4);
    } catch (err) {
      setError(err.response?.data?.detail || '创建活动失败，请检查填写内容');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!createdCampaign) return;
    const url = `${window.location.origin}/v/${createdCampaign.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full -z-10"></div>
          {[
            { num: 1, title: '选择模板与主题' },
            { num: 2, title: '规则与动态字段' },
            { num: 3, title: '录入候选项目' },
            { num: 4, title: '生成并发布' },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center bg-slate-100 px-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition ${
                  currentStep === s.num
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : currentStep > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-400 border border-slate-300'
                }`}
              >
                {currentStep > s.num ? <Check className="w-5 h-5" /> : s.num}
              </div>
              <span className={`text-xs mt-2 font-medium ${currentStep === s.num ? 'text-blue-600' : 'text-slate-500'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Template and Basic Info */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">第 1 步：选择模板与基本信息</h2>
            <p className="text-sm text-slate-500 mt-1">请选择最契合您评选形式的展现模板</p>
          </div>

          {/* Template Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              {
                id: 'video',
                title: '短视频竞赛模板',
                desc: '适合微电影、普法短视频、演讲视频。支持模态快播与边看边投。',
                icon: Video,
                tag: '推荐',
                color: 'purple'
              },
              {
                id: 'image',
                title: '图文展示模板',
                desc: '适合摄影展、创意海报、绘画评选。支持高清大图与瀑布流。',
                icon: ImageIcon,
                tag: '常用',
                color: 'indigo'
              },
              {
                id: 'text',
                title: '文字评选模板',
                desc: '适合优秀标兵、文章心得、事迹榜样。排版紧凑优雅，阅读感佳。',
                icon: FileText,
                tag: '经典',
                color: 'emerald'
              },
            ].map((tpl) => {
              const Icon = tpl.icon;
              const isSelected = templateType === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setTemplateType(tpl.id)}
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{tpl.title}</h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tpl.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100/80">
                    <span className="text-[11px] font-medium text-slate-400">标签：{tpl.tag}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700">活动标题 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：自贡农商银行法治合规短视频竞赛活动"
                className="mt-1 block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">副标题 / 选送标语</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="例如：尊法合规·金融为民"
                className="mt-1 block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">活动规则与详细介绍</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述活动背景、评选意义和投票规则说明..."
                className="mt-1 block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">开始时间（选填）</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">截止时间（选填）</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => {
                if (!title.trim()) {
                  alert('请填写活动标题');
                  return;
                }
                setCurrentStep(2);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20 transition text-sm"
            >
              下一步：配置投票规则
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Rules and Dynamic Fields */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">第 2 步：投票规则与身份扩展字段</h2>
            <p className="text-sm text-slate-500 mt-1">配置每人可投总票数、单IP保护阈值，以及投票人所需填报的信息</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/60">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">投票周期规则 *</label>
              <select
                value={quotaType}
                onChange={(e) => setQuotaType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="lifecycle">全周期固定额度 (仅投一轮)</option>
                <option value="daily">每日重置额度 (每天可投)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {quotaType === 'daily' ? '用户每天可投 N 票，次日 00:00 自动刷新' : '用户在整个活动期间总共最多投 N 票'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {quotaType === 'daily' ? '每人每天投票额度 (N 票) *' : '每人最多总票数 (N 票) *'}
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxVotes}
                onChange={(e) => setMaxVotes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {quotaType === 'daily' ? `每天最多选 ${maxVotes} 个作品 (当日不可重投)` : `全周期最多选 ${maxVotes} 个作品`}
              </p>
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
              <p className="text-[11px] text-slate-400 mt-1">
                {voteMode === 'batch' ? '支持卡片复选，底部悬浮条统一提交' : '点击按钮即时单次投出'}
              </p>
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
              <p className="text-[11px] text-slate-400 mt-1">
                同一出口 IP 每天累计最大有效票数
              </p>
            </div>
          </div>

          {/* Real-name and Dynamic fields */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">投票人身份登记模式</h3>
                <p className="text-xs text-slate-500 mt-0.5">选择完全匿名投票，还是收集姓名、所属机构等扩展信息</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsRealname(!isRealname)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    isRealname ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      isRealname ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {isRealname ? '已开启登记' : '完全匿名'}
                </span>
              </div>
            </div>

            {isRealname && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    登记字段列表 (动态表单)
                  </span>
                  <button
                    type="button"
                    onClick={addField}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加新字段
                  </button>
                </div>

                <div className="space-y-3">
                  {voterFields.map((f, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
                        <input
                          type="text"
                          value={f.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                          placeholder="字段名称，如：所属分行"
                          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                        />
                        <select
                          value={f.type}
                          onChange={(e) => updateField(idx, { type: e.target.value })}
                          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <option value="text">单行文本输入</option>
                          <option value="select">下拉单选菜单</option>
                        </select>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={f.required}
                              onChange={(e) => updateField(idx, { required: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            必填
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-blue-700 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={f.enable_analytics !== false}
                              onChange={(e) => updateField(idx, { enable_analytics: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            纳入大屏与报表统计汇总
                          </label>
                        </div>
                      </div>

                      {f.type === 'select' && (
                        <div className="w-full sm:w-auto flex-1">
                          <input
                            type="text"
                            value={Array.isArray(f.options) ? f.options.join('，') : f.options || ''}
                            onChange={(e) => updateField(idx, { options: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) })}
                            placeholder="逗号或中文逗号分隔选项，如：荣县支行，富顺支行"
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                          />
                        </div>
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
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              上一步
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20 transition text-sm"
            >
              下一步：录入候选项目
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Candidates Form Editor */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">第 3 步：录入候选项目与媒体资源</h2>
            <p className="text-sm text-slate-500 mt-1">
              当前为【{templateType === 'video' ? '短视频竞赛' : templateType === 'image' ? '图文评选' : '纯文字评选'}】模板，请添加候选人/参赛作品
            </p>
          </div>

          {/* Add Candidate Form Card */}
          <div className="bg-blue-50/40 rounded-2xl border border-blue-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              添加候选项目
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">作品/候选人名称 *</label>
                <input
                  type="text"
                  value={candTitle}
                  onChange={(e) => setCandTitle(e.target.value)}
                  placeholder="例如：《“九五”普法宣传短剧》"
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">副标题 / 选送单位</label>
                <input
                  type="text"
                  value={candSubtitle}
                  onChange={(e) => setCandSubtitle(e.target.value)}
                  placeholder="例如：荣县支行 / 张三团队"
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">详细介绍内容</label>
              <textarea
                rows={2}
                value={candDesc}
                onChange={(e) => setCandDesc(e.target.value)}
                placeholder="该作品或候选人的背景介绍、事迹梗概..."
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>

            {/* Uploads (Image / Video) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">封面图片上传</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>{uploadingCover ? '上传中...' : '选择图片 (≤10MB)'}</span>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  </label>
                  {candCoverUrl && <span className="text-xs text-emerald-600 font-medium">✓ 已就绪</span>}
                </div>
              </div>

              {templateType === 'video' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">视频 MP4 文件上传 (≤100MB)</label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                      <Video className="w-3.5 h-3.5 text-purple-600" />
                      <span>{uploadingMedia ? '视频上传中...' : '选择视频 MP4'}</span>
                      <input type="file" accept="video/mp4,video/webm" onChange={handleMediaUpload} className="hidden" />
                    </label>
                    {candMediaUrl && <span className="text-xs text-purple-600 font-medium">✓ 视频已就绪</span>}
                  </div>
                </div>
              )}

              {templateType === 'image' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">高清原图大图上传 (选填)</label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{uploadingMedia ? '上传中...' : '选择高清大图'}</span>
                      <input type="file" accept="image/*" onChange={handleMediaUpload} className="hidden" />
                    </label>
                    {candMediaUrl && <span className="text-xs text-indigo-600 font-medium">✓ 大图已就绪</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleAddCandidate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                确认添加到列表
              </button>
            </div>
          </div>

          {/* Candidates List preview */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              已录入候选项目 ({candidates.length} 项)
            </h3>
            {candidates.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-xl">
                暂未添加任何候选项目，请在上方表单中录入至少 1 项
              </p>
            ) : (
              <div className="space-y-2">
                {candidates.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{c.title}</div>
                        <div className="text-xs text-slate-500">{c.subtitle || '无选送单位'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.cover_url && <span className="text-[11px] text-blue-600 font-medium">有封面</span>}
                      {c.media_url && <span className="text-[11px] text-purple-600 font-medium">有媒体</span>}
                      <button
                        type="button"
                        onClick={() => removeCandidate(i)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              上一步
            </button>
            <button
              type="button"
              disabled={submitting || candidates.length === 0}
              onClick={handleCreateCampaign}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-500/20 transition text-sm disabled:opacity-50"
            >
              {submitting ? '发布中...' : '完成并立即发布活动'}
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Success & Public Link */}
      {currentStep === 4 && createdCampaign && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Check className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">恭喜！投票活动已成功发布</h2>
            <p className="text-sm text-slate-500 mt-1">
              活动短链及专属访问通道已生成，任何人均可通过此链接在网页或手机端参与投票
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-lg mx-auto flex items-center justify-between gap-3">
            <span className="text-sm font-mono text-slate-700 truncate">
              {window.location.origin}/v/{createdCampaign.code}
            </span>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制短链'}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href={`/v/${createdCampaign.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium shadow-sm transition"
            >
              <LinkIcon className="w-4 h-4" />
              打开前台体验
            </a>
            <button
              onClick={() => navigate(`/admin/campaigns/${createdCampaign.id}/dashboard`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow-sm transition"
            >
              进入实时数据大屏
            </button>
            <button
              onClick={() => navigate('/admin/campaigns')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition"
            >
              返回活动列表
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
