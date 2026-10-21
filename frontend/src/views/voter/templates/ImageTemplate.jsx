import React, { useState } from 'react';
import { useVoting } from '../../../context/VotingContext';
import { Check, ZoomIn, X, Sparkles } from 'lucide-react';
import BatchVoteBar from '../components/BatchVoteBar';
import IdentityModal from '../components/IdentityModal';

export default function ImageTemplate() {
  const { campaign, votedCandidateIds, remainingVotes, submitVote, isVotingOpen, votingStatus } = useVoting();
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  const candidates = campaign?.candidates || [];

  const handleToggleSelect = (candId) => {
    if (!isVotingOpen) {
      alert(votingStatus?.reason || '当前不在投票时间内');
      return;
    }
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
    if (!isVotingOpen) {
      alert(votingStatus?.reason || '当前不在投票时间内');
      return;
    }
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
      setToast('🎉 投票成功！感谢您的参与！');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || '投票失败');
    }
  };

  const selectedTitles = candidates
    .filter(c => selectedIds.includes(c.id))
    .map(c => c.title);

  return (
    <div className="space-y-6 pb-28">
      {toast && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4">
          <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {candidates.map((cand) => {
          const isVoted = votedCandidateIds.includes(cand.id);
          const isSelected = selectedIds.includes(cand.id);

          return (
            <div
              key={cand.id}
              onClick={() => handleToggleSelect(cand.id)}
              className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 shadow-md'
                  : isVoted
                  ? 'border-slate-200 opacity-70 cursor-not-allowed bg-slate-50'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Image Preview Container */}
              <div className="relative aspect-square bg-slate-100 overflow-hidden group">
                {cand.cover_url || cand.media_url ? (
                  <img
                    src={cand.cover_url || cand.media_url}
                    alt={cand.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                    暂无图片
                  </div>
                )}

                {/* Zoom preview button */}
                {(cand.media_url || cand.cover_url) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(cand.media_url || cand.cover_url);
                    }}
                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black transition"
                    title="查看大图"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Checkbox indicator */}
                <div className="absolute top-2 right-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : isVoted
                        ? 'bg-slate-400 text-white'
                        : 'bg-white/80 border border-slate-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>

                {isVoted && (
                  <div className="absolute top-2 left-2 bg-slate-800/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                    已支持
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-3">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{cand.title}</h3>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{cand.subtitle || '参赛作品'}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">票数:</span>
                  <span className="font-bold text-blue-600">{cand.vote_count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white p-2"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={previewImage} alt="预览大图" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
        </div>
      )}

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
