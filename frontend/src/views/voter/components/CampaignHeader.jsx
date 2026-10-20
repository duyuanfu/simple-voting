import React, { useState, useEffect } from 'react';
import { useVoting } from '../../../context/VotingContext';
import { Clock, ShieldCheck, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';

export default function CampaignHeader() {
  const { campaign, remainingVotes, votedCandidateIds } = useVoting();
  const [expanded, setExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!campaign?.end_time) return;

    const calculateTime = () => {
      const now = new Date().getTime();
      const end = new Date(campaign.end_time).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('活动已截止');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${days > 0 ? `${days}天 ` : ''}${hours}小时${minutes}分${seconds}秒`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [campaign?.end_time]);

  if (!campaign) return null;

  return (
    <div className="bg-white border-b border-slate-200/80 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {/* Banner if exists */}
        {campaign.banner_url && (
          <div className="mb-4 rounded-2xl overflow-hidden max-h-48 shadow-sm">
            <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="text-center sm:text-left">
          {campaign.subtitle && (
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-2">
              {campaign.subtitle}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {campaign.title}
          </h1>
        </div>

        {/* Rules & Quota Summary Capsules */}
        <div className="mt-4 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            <span>全周期限投: 每人 {campaign.max_votes_per_person} 票</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>已投 {votedCandidateIds.length} 票，还可投 {remainingVotes} 票</span>
          </div>

          {campaign.is_realname && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>组织实名登记</span>
            </div>
          )}

          {timeLeft && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>距离结束: {timeLeft}</span>
            </div>
          )}
        </div>

        {/* Description Accordion */}
        {campaign.description && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className={`text-xs sm:text-sm text-slate-600 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {campaign.description}
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-blue-600 font-medium inline-flex items-center gap-1 hover:text-blue-700"
            >
              {expanded ? (
                <>收起活动介绍 <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>展开完整活动介绍 <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
