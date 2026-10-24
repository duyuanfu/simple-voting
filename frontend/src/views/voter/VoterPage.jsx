import React from 'react';
import { useParams } from 'react-router-dom';
import { VotingProvider, useVoting } from '../../context/VotingContext';
import CampaignHeader from './components/CampaignHeader';
import VideoTemplate from './templates/VideoTemplate';
import ImageTemplate from './templates/ImageTemplate';
import TextTemplate from './templates/TextTemplate';
import { AlertCircle, Vote, FileEdit, ShieldAlert } from 'lucide-react';

function VoterContent() {
  const { campaign, loading, error } = useVoting();
  const isPreview = Boolean(localStorage.getItem('tenant_token'));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-slate-500 font-medium tracking-wide">正在加载活动与安全环境...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-lg">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">无法打开投票页面</h2>
          <p className="text-xs text-slate-500 mb-4">{error || '该活动不存在或访问链接已失效'}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            返回首页
          </a>
        </div>
      </div>
    );
  }

  // If campaign is in draft and visitor is NOT the authenticated admin
  if (campaign.status === 'draft' && !isPreview) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xl">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileEdit className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">活动筹备中，尚未正式发布</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            【{campaign.title}】当前处于<strong>草稿编辑阶段</strong>，组织方尚未正式对外公开发布，请耐心等待！
          </p>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4">
            若您是活动管理员，请登录管理后台将活动状态切换为【进行中】
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <div>
        {/* Admin Preview Mode Banner for Drafts */}
        {campaign.status === 'draft' && isPreview && (
          <div className="bg-amber-500 text-white text-xs font-bold py-2 px-4 text-center sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md">
            <FileEdit className="w-4 h-4" />
            <span>【管理员预览模式】当前活动处于草稿中，外部公众访客无法查阅作品，仅您可预览效果</span>
          </div>
        )}

        <CampaignHeader />

        <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          {campaign.template_type === 'video' && <VideoTemplate />}
          {campaign.template_type === 'image' && <ImageTemplate />}
          {campaign.template_type === 'text' && <TextTemplate />}
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-500">
          <Vote className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-700">Universal Voting Platform</span>
        </div>
        <p>多场景通用投票引擎 · 严格保障评选公平公正</p>
      </footer>
    </div>
  );
}

export default function VoterPage() {
  const { code } = useParams();

  return (
    <VotingProvider code={code}>
      <VoterContent />
    </VotingProvider>
  );
}
