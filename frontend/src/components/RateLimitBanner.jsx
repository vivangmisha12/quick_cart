import React, { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';
import '../styles/RateLimitBanner.css';

const RateLimitBanner = () => {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const handleRateLimited = (event) => {
      const detail = event?.detail || {};
      const seconds = Math.max(1, Number(detail.retryAfterSeconds) || 15);
      setNotice({
        message: detail.message || 'Too many requests right now.',
        remainingSeconds: seconds,
      });
    };

    window.addEventListener('apiRateLimited', handleRateLimited);
    return () => window.removeEventListener('apiRateLimited', handleRateLimited);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;

    if (notice.remainingSeconds <= 0) {
      setNotice(null);
      return undefined;
    }

    const timer = setTimeout(() => {
      setNotice((prev) =>
        prev
          ? {
              ...prev,
              remainingSeconds: Math.max(0, prev.remainingSeconds - 1),
            }
          : null
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  return (
    <div className="rate-limit-toast" role="alert" aria-live="polite">
      <div className="rate-limit-toast-icon">
        <Clock size={16} />
      </div>
      <div className="rate-limit-toast-body">
        <p className="rate-limit-toast-msg">{notice.message}</p>
        <span className="rate-limit-toast-countdown">
          Auto-retry available in {notice.remainingSeconds}s
        </span>
      </div>
      <button
        type="button"
        className="rate-limit-toast-close"
        onClick={() => setNotice(null)}
        aria-label="Dismiss rate limit notice"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default RateLimitBanner;

