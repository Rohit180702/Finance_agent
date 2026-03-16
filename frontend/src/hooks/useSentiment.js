import { useState } from 'react';
import { analyzeSentiment } from '../services/sentimentApi';

export const useSentiment = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);

  const analyze = async ({ symbol }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeSentiment(symbol);
      const s    = data.sentiment || {};
      const raw  = data.raw || {};

      // Map backend response to the shape SentimentAnalysis.jsx expects
      setResult({
        symbol,
        verdict:        s.verdict,
        score:          s.score,
        news_sentiment: s.news_sentiment,
        drivers:        s.drivers || [],
        risks:          s.risks   || [],
        summary:        s.summary || '',
        // Legacy fields kept for SentimentAnalysis.jsx UI compatibility
        breakdown: {
          positive: Math.round((s.score || 50) * 0.8),
          negative: Math.round((100 - (s.score || 50)) * 0.5),
          neutral:  Math.round(20),
        },
        trend:     Array.from({ length: 8 }, (_, i) => Math.min(100, Math.max(0, (s.score || 50) + (i % 3 - 1) * 5))),
        headlines: [],
        analyst:    raw.analyst    || {},
        news_items: raw.news_items || [],
        timestamp:  new Date().toISOString(),
      });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Sentiment analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, result, analyze };
};
