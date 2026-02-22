import { sendChatMessage } from './chatApi';

export const analyzeSentiment = async (symbol, range, source) => {
  const prompt = [
    `Provide a concise sentiment analysis for ${symbol}.`,
    `Time range: ${range}.`,
    `Data source preference: ${source}.`,
    'Include key risks, prevailing tone, and short-term bias in plain text.',
  ].join(' ');

  return sendChatMessage(prompt, []);
};
