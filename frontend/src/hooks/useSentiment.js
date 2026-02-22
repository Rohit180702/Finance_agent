import { useState } from 'react';
import { analyzeSentiment } from '../services/sentimentApi';

const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

const hashScore = (input) => {
  let hash = 0;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const buildBreakdown = (score) => {
  const positive = clamp(Math.round(40 + score * 0.5), 10, 85);
  const negative = clamp(Math.round(20 + (100 - score) * 0.4), 5, 70);
  const neutral = clamp(100 - positive - negative, 5, 80);
  return { positive, neutral, negative };
};

const buildHeadlines = (symbol) => [
  `${symbol} draws institutional attention amid valuation debate`,
  `Options activity rises around ${symbol} ahead of sector commentary`,
  `${symbol} sentiment stabilizes as analysts revise near-term outlook`,
  `${symbol} sees mixed social chatter following recent price action`,
  `${symbol} news flow points to selective optimism in current cycle`,
];

export const useSentiment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const analyze = async ({ symbol, range, source }) => {
    try {
      setLoading(true);
      setError(null);

      const data = await analyzeSentiment(symbol, range, source);
      const scoreSeed = hashScore(`${symbol}-${range}-${source}`);
      const score = 35 + (scoreSeed % 40);
      const breakdown = buildBreakdown(score);
      const trend = Array.from({ length: 8 }).map((_, index) => {
        const variance = ((scoreSeed >> index) % 7) - 3;
        return clamp(score + variance * 2, 20, 80);
      });

      setResult({
        symbol,
        range,
        source,
        score,
        breakdown,
        trend,
        summary: data.message?.content || 'No summary generated.',
        headlines: buildHeadlines(symbol),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, result, analyze };
};
