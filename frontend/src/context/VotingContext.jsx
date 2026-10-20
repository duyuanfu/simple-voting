import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useFingerprint } from '../hooks/useFingerprint';

const VotingContext = createContext(null);

export const VotingProvider = ({ code, children }) => {
  const { visitorId, loading: fpLoading } = useFingerprint();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [votedCandidateIds, setVotedCandidateIds] = useState([]);
  const [remainingVotes, setRemainingVotes] = useState(1);
  const [savedExtraInfo, setSavedExtraInfo] = useState(() => {
    try {
      const saved = localStorage.getItem(`voter_extra_${code}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Guard against repeated status fetches
  const statusFetchedKeyRef = useRef('');

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/campaigns/${code}`);
      setCampaign(res.data);
      setRemainingVotes(res.data.max_votes_per_person);
    } catch (err) {
      setError(err.response?.data?.detail || '无法加载活动数据');
    } finally {
      setLoading(false);
    }
  }, [code]);

  const fetchVoterStatus = useCallback(async (currentVisitorId, extraInfo) => {
    if (!currentVisitorId) return;
    try {
      const infoToSend = extraInfo || (() => {
        try {
          const s = localStorage.getItem(`voter_extra_${code}`);
          return s ? JSON.parse(s) : {};
        } catch {
          return {};
        }
      })();

      const res = await api.post(`/public/campaigns/${code}/my-status`, {
        visitor_id: currentVisitorId,
        extra_info: infoToSend
      });

      setVotedCandidateIds(res.data.voted_candidate_ids || []);
      setRemainingVotes(res.data.remaining_votes);

      if (res.data.saved_extra_info && Object.keys(res.data.saved_extra_info).length > 0) {
        setSavedExtraInfo(prev => {
          const isSame = JSON.stringify(prev) === JSON.stringify(res.data.saved_extra_info);
          return isSame ? prev : res.data.saved_extra_info;
        });
        localStorage.setItem(`voter_extra_${code}`, JSON.stringify(res.data.saved_extra_info));
      }
    } catch (err) {
      console.warn('Failed to fetch voter status', err);
    }
  }, [code]);

  // Initial Campaign Load (once per code)
  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Initial Status Load (strictly ONCE per visitorId + campaign code)
  useEffect(() => {
    if (campaign && visitorId && !fpLoading) {
      const key = `${code}_${visitorId}`;
      if (statusFetchedKeyRef.current !== key) {
        statusFetchedKeyRef.current = key;
        fetchVoterStatus(visitorId);
      }
    }
  }, [code, campaign, visitorId, fpLoading, fetchVoterStatus]);

  const submitVote = async (candidateIds, extraInfo = {}) => {
    if (!visitorId) throw new Error('设备指纹生成中，请稍候重试');

    const mergedExtra = { ...savedExtraInfo, ...extraInfo };
    const payload = {
      candidate_ids: candidateIds,
      visitor_id: visitorId,
      extra_info: mergedExtra
    };

    const res = await api.post(`/public/campaigns/${code}/vote`, payload);

    // Authoritative update from /vote response - no need to call /my-status again!
    setVotedCandidateIds(res.data.voted_candidate_ids);
    setRemainingVotes(res.data.remaining_votes);
    setSavedExtraInfo(mergedExtra);
    localStorage.setItem(`voter_extra_${code}`, JSON.stringify(mergedExtra));

    // Update campaign candidate vote counts locally without triggering refetch
    if (campaign) {
      setCampaign(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          candidates: prev.candidates.map(c => {
            if (candidateIds.includes(c.id)) {
              return { ...c, vote_count: c.vote_count + 1 };
            }
            return c;
          })
        };
      });
    }

    return res.data;
  };

  return (
    <VotingContext.Provider
      value={{
        code,
        campaign,
        loading: loading || fpLoading,
        error,
        visitorId,
        votedCandidateIds,
        remainingVotes,
        savedExtraInfo,
        submitVote,
        fetchCampaign,
        fetchVoterStatus
      }}
    >
      {children}
    </VotingContext.Provider>
  );
};

export const useVoting = () => useContext(VotingContext);
