import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVoting } from '../../../context/VotingContext';
import { Play, Check, X, ThumbsUp, Sparkles, CheckSquare, Square } from 'lucide-react';
import BatchVoteBar from '../components/BatchVoteBar';
import IdentityModal from '../components/IdentityModal';

export default function VideoTemplate() {
  const { campaign, votedCandidateIds, remainingVotes, submitVote } = useVoting();
  const [activeVideo, setActiveVideo] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [votingCandidate, setVotingCandidate] = useState(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const isBatchMode = campaign?.vote_mode === 'batch';
  const candidates = campaign?.candidates || [];

  // Lock body scroll when video player modal is open to prevent top/bottom leakage
  useEffect(() => {
    if (activeVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeVideo]);

  const handleOpenPlayer = (cand) => {
    setActiveVideo(cand);
  };

  const handleClosePlayer = () => {
    setActiveVideo(null);
  };

  // Toggle selection for batch mode
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

  // Instant single vote initiation
  const handleInitiateVote = (cand) => {
    if (votedCandidateIds.includes(cand.id)) {
      alert('您已支持过该作品，不可重复投票');
      return;
    }
    if (remainingVotes <= 0) {
      alert('您的投票额度已全部用完');
      return;
    }

    setVotingCandidate(cand);

    if (campaign.is_realname) {
      setIsIdentityModalOpen(true);
    } else {
      executeVote([cand.id], {});
    }
  };

  // Batch vote initiation
  const handleTriggerBatchSubmit = () => {
    if (selectedIds.length === 0) return;
    if (campaign.is_realname) {
      setIsIdentityModalOpen(true);
    } else {
      executeVote(selectedIds, {});
    }
  };

  // Execute vote submission
  const executeVote = async (candIds, extraInfo) => {
    setSubmitting(true);
    try {
      await submitVote(candIds, extraInfo);
      setIsIdentityModalOpen(false);
      setVotingCandidate(null);
      setSelectedIds([]);
      setToast('🎉 投票成功！感谢您的宝贵支持！');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || '投票失败');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTitles = isBatchMode
    ? candidates.filter(c => selectedIds.includes(c.id)).map(c => c.title)
    : votingCandidate ? [votingCandidate.title] : [];

  return (
    <div className={`space-y-6 ${isBatchMode ? 'pb-28' : 'pb-20'}`}>
      {toast && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4">
          <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((cand) => {
          const isVoted = votedCandidateIds.includes(cand.id);
          const isSelected = selectedIds.includes(cand.id);

          return (
            <div
              key={cand.id}
              className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col justify-between transition ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/10'
                  : 'border-slate-200/80 hover:shadow-md'
              }`}
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => handleOpenPlayer(cand)}
                className="relative aspect-video bg-slate-900 cursor-pointer group overflow-hidden"
              >
                {cand.cover_url ? (
                  <img
                    src={cand.cover_url}
                    alt={cand.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <span>暂无封面</span>
                  </div>
                )}

                {/* Play Overlay */}
                <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/40 flex items-center justify-center transition">
                  <div className="w-12 h-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>

                {/* Selection Checkbox (Batch Mode) */}
                {isBatchMode && !isVoted && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(cand.id);
                    }}
                    className="absolute top-2.5 right-2.5 z-10 p-1 rounded-full cursor-pointer transition hover:scale-110"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-md transition ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/90 text-slate-400 hover:text-slate-600 border border-slate-300'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>
                )}

                {isVoted && (
                  <div className="absolute top-2.5 left-2.5 bg-slate-800/90 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                    <Check className="w-3 h-3" /> 已投
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1">{cand.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {cand.subtitle || cand.description || '暂无描述'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">当前票数: </span>
                    <span className="font-bold text-blue-600 text-sm">{cand.vote_count}</span>
                  </div>

                  {isBatchMode ? (
                    <button
                      disabled={isVoted || (remainingVotes <= 0 && !isSelected)}
                      onClick={() => handleToggleSelect(cand.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                        isVoted
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isVoted ? (
                        <>已支持</>
                      ) : isSelected ? (
                        <>
                          <Check className="w-3 h-3" />
                          已勾选
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          勾选
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled={isVoted || remainingVotes <= 0 || submitting}
                      onClick={() => handleInitiateVote(cand)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                        isVoted
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : remainingVotes <= 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      {isVoted ? (
                        <>
                          <Check className="w-3 h-3" />
                          已支持
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="w-3 h-3" />
                          投 Ta 一票
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Modal Player - Rendered via React Portal at body root to eliminate any top gaps */}
      {activeVideo && createPortal(
        <div
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
          style={{ margin: 0 }}
        >
          <div className="bg-white rounded-none sm:rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative border-0 sm:border border-slate-700/50 my-auto">
            {/* Close Button */}
            <button
              onClick={handleClosePlayer}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-slate-900/80 text-white hover:bg-black flex items-center justify-center transition shadow-lg"
              title="关闭播放器"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video Player - Full width on mobile */}
            <div className="aspect-video bg-black relative w-full">
              {activeVideo.media_url ? (
                <video
                  src={activeVideo.media_url}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain"
                >
                  您的浏览器暂不支持 HTML5 视频播放
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  暂无视频源文件
                </div>
              )}
            </div>

            {/* Video Details & Action */}
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{activeVideo.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{activeVideo.subtitle || '参赛选送作品'}</p>
                </div>

                {isBatchMode ? (
                  <button
                    disabled={votedCandidateIds.includes(activeVideo.id)}
                    onClick={() => handleToggleSelect(activeVideo.id)}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition flex-shrink-0 ${
                      votedCandidateIds.includes(activeVideo.id)
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : selectedIds.includes(activeVideo.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {votedCandidateIds.includes(activeVideo.id)
                        ? '已投'
                        : selectedIds.includes(activeVideo.id)
                        ? '已勾选'
                        : '勾选'}
                    </span>
                  </button>
                ) : (
                  <button
                    disabled={votedCandidateIds.includes(activeVideo.id) || remainingVotes <= 0 || submitting}
                    onClick={() => handleInitiateVote(activeVideo)}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition flex-shrink-0 ${
                      votedCandidateIds.includes(activeVideo.id)
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : remainingVotes <= 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>
                      {votedCandidateIds.includes(activeVideo.id)
                        ? '已投'
                        : `投 Ta (余 ${remainingVotes})`}
                    </span>
                  </button>
                )}
              </div>

              {activeVideo.description && (
                <p className="text-xs text-slate-600 mt-2 p-3 bg-slate-50 rounded-xl leading-relaxed max-h-32 overflow-y-auto">
                  {activeVideo.description}
                </p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Bottom Bar for Batch Mode */}
      {isBatchMode && (
        <BatchVoteBar
          selectedIds={selectedIds}
          onTriggerSubmit={handleTriggerBatchSubmit}
          candidates={candidates}
        />
      )}

      {/* Identity Registration Modal */}
      <IdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => {
          setIsIdentityModalOpen(false);
          setVotingCandidate(null);
        }}
        candidateTitles={selectedTitles}
        onConfirm={(extraInfo) => {
          if (isBatchMode) {
            executeVote(selectedIds, extraInfo);
          } else if (votingCandidate) {
            executeVote([votingCandidate.id], extraInfo);
          }
        }}
      />
    </div>
  );
}

function Plus(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
