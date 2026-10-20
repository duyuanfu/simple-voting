import React from 'react';
import { useVoting } from '../../../context/VotingContext';
import { Check, ArrowRight } from 'lucide-react';

export default function BatchVoteBar({ selectedIds, onTriggerSubmit, candidates = [] }) {
  const { remainingVotes } = useVoting();

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg animate-slide-up">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-500 block">您已勾选支持：</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-blue-600">
              {selectedIds.length} <span className="text-xs font-normal text-slate-500">项</span>
            </span>
            <span className="text-xs text-slate-400">
              (本次至多可投 {remainingVotes} 票)
            </span>
          </div>
        </div>

        <button
          onClick={onTriggerSubmit}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition active:scale-95"
        >
          <span>立即投票 ({selectedIds.length})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
