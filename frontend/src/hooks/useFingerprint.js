import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export function useFingerprint() {
  const [visitorId, setVisitorId] = useState(() => localStorage.getItem('voter_visitor_id') || '');
  const [loading, setLoading] = useState(!visitorId);

  useEffect(() => {
    let isMounted = true;
    async function loadFp() {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (isMounted) {
          const id = result.visitorId;
          setVisitorId(id);
          localStorage.setItem('voter_visitor_id', id);
        }
      } catch (err) {
        console.warn('FingerprintJS load failed, generating fallback visitorId', err);
        if (isMounted && !visitorId) {
          const fallback = 'fp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
          setVisitorId(fallback);
          localStorage.setItem('voter_visitor_id', fallback);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFp();
    return () => { isMounted = false; };
  }, []);

  return { visitorId, loading };
}
