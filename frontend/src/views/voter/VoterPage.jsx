import React from 'react';
import { useParams } from 'react-router-dom';
import { VotingProvider, useVoting } from '../../context/VotingContext';
import CampaignHeader from './components/CampaignHeader';
import VideoTemplate from './templates/VideoTemplate';
import ImageTemplate from './templates/ImageTemplate';
import TextTemplate from './templates/TextTemplate';
import { AlertCircle, Vote } from 'lucide-react';

function VoterContent() {
  const { campaign, loading, error } = useVoting();

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <div>
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
