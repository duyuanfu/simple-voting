import React, { useState } from 'react';
import { useVoting } from '../../../context/VotingContext';
import { Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import BatchVoteBar from '../components/BatchVoteBar';
import IdentityModal from '../components/IdentityModal';

export default function TextTemplate() {
  const { campaign, votedCandidateIds, remainingVotes, submitVote } = useVoting();
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  const candidates = campaign?.candidates || [];

  const handleToggleSelect = (candId) => {
    if (votedCandidateIds.includes(candId)) return;

    if (selectedIds.includes(candId)) {
      setSelectedIds(selectedIds.filter(id => id !== candId));
    } else {
      if (selectedIds.length >= remainingVotes) {
        alert(`您最多还能选择 ${remainingVotes} 项`);
        return;
      }
      setSelectedIds([...selectedIds, candId]);
    }
  };

  const handleTriggerSubmit = () => {
    if (selectedIds.length === 0) return;
    if (campaign.is_realname) {
      setIsIdentityModalOpen(true);
    } else {
      executeBatchVote({});
    }
  };

  const executeBatchVote = async (extraInfo) => {
    try {
      await submitVote(selectedIds, extraInfo);
      setSelectedIds([]);
      setIsIdentityModalOpen(false);
      setToast('🎉 投票成功！感谢您的宝贵一票！');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || '投票失败');
    }
  };

  const selectedTitles = candidates
    .filter(c => selectedIds.includes(c.id))
    .map(c => c.title);

  return (
    <div className="space-y-4 pb-28">
      {toast && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4">
          <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Candidate Text Cards */}
      <div className="space-y-3">
        {candidates.map((cand, idx) => {
          const isVoted = votedCandidateIds.includes(cand.id);
          const isSelected = selectedIds.includes(cand.id);
          const isExpanded = expandedId === cand.id;

          return (
            <div
              key={cand.id}
              onClick={() => handleToggleSelect(cand.id)}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-md'
                  : isVoted
                  ? 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">{cand.title}</h3>
                      {cand.subtitle && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium">
                          {cand.subtitle}
                        </span>
                      )}
                    </div>

                    {cand.description && (
                      <p className={`text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {cand.description}
                      </p>
                    )}

                    {cand.description && cand.description.length > 80 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : cand.id);
                        }}
                        className="mt-1 text-xs text-slate-400 hover:text-blue-600 inline-flex items-center gap-0.5 font-medium"
                      >
                        {isExpanded ? (
                          <>收起详细事迹 <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>展开全文 <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Selection Circle */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : isVoted
                        ? 'bg-slate-400 text-white'
                        : 'border border-slate-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  {isVoted && <span className="text-[10px] text-slate-400">已支持</span>}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>累计得票数：<strong className="text-blue-600 text-sm font-bold">{cand.vote_count}</strong> 票</span>
                <span className="text-[11px] text-slate-400">点击卡片即可勾选</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Bar */}
      <BatchVoteBar
        selectedIds={selectedIds}
        onTriggerSubmit={handleTriggerSubmit}
        candidates={candidates}
      />

      {/* Identity Registration Modal */}
      <IdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        candidateTitles={selectedTitles}
        onConfirm={executeBatchVote}
      />
    </div>
  );
}
