import React, { useState, useEffect } from 'react';
import { useVoting } from '../../../context/VotingContext';
import { ShieldCheck, X, ArrowRight } from 'lucide-react';

export default function IdentityModal({ isOpen, onClose, onConfirm, candidateTitles = [] }) {
  const { campaign, savedExtraInfo } = useVoting();
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(savedExtraInfo || {});
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !campaign) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    for (const field of campaign.voter_fields || []) {
      if (field.required) {
        const val = formData[field.key];
        if (!val || !String(val).trim()) {
          setError(`请填写必填项：${field.label}`);
          return;
        }
      }
    }

    onConfirm(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">登记投票人信息</h3>
            <p className="text-xs text-slate-500">本活动要求登记身份信息，确保评选公平公正</p>
          </div>
        </div>

        {candidateTitles.length > 0 && (
          <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <span className="text-slate-400 block mb-1">您当前选择支持的作品：</span>
            <span className="font-semibold text-slate-800 line-clamp-2">
              {candidateTitles.join('、')}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(campaign.voter_fields || []).map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择{field.label}...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={`请输入${field.label}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition"
            >
              <span>确认信息并提交投票</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
