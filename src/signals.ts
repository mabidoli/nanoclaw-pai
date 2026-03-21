import { logger } from './logger.js';
import { proposeRule } from './steering.js';

export interface Signal {
  id: string;
  type: 'rating' | 'sentiment';
  value: number;
  comment?: string;
  confidence?: number;
  groupFolder: string;
  sessionId: string;
  timestamp: Date;
}

// Rating pattern: starts with a number 1-10, optionally followed by separator and comment
// Must NOT match patterns like "3 items", "5 things", "2 files"
const RATING_PATTERN = /^(\d{1,2})\s*[-:–—]\s*(.*)$/;
const FALSE_POSITIVE_PATTERN = /^\d+\s+(items?|things?|files?|tasks?|bugs?|errors?|issues?|steps?|people?|times?|days?|hours?|minutes?|ways?|points?|pages?|lines?|commits?|PRs?|tests?)/i;

export function parseRating(text: string): { rating: number; comment: string } | null {
  const trimmed = text.trim();

  // Check for false positives first
  if (FALSE_POSITIVE_PATTERN.test(trimmed)) {
    return null;
  }

  const match = trimmed.match(RATING_PATTERN);
  if (!match) return null;

  const rating = parseInt(match[1], 10);
  if (rating < 1 || rating > 10) return null;

  return { rating, comment: match[2].trim() };
}

// Simple sentiment analysis using keyword matching
const POSITIVE_WORDS = new Set([
  'great', 'good', 'excellent', 'amazing', 'awesome', 'perfect', 'love',
  'fantastic', 'wonderful', 'brilliant', 'helpful', 'thanks', 'thank',
  'nice', 'well', 'impressive', 'outstanding',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'wrong', 'terrible', 'awful', 'horrible', 'hate', 'useless',
  'broken', 'fail', 'failed', 'error', 'bug', 'worst', 'poor',
  'disappointing', 'frustrated', 'annoying', 'confused',
]);

export function analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; confidence: number } {
  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (POSITIVE_WORDS.has(clean)) positiveCount++;
    if (NEGATIVE_WORDS.has(clean)) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) return { sentiment: 'neutral', confidence: 0.5 };

  if (positiveCount > negativeCount) {
    return { sentiment: 'positive', confidence: Math.min(0.5 + (positiveCount / (total * 2)), 1.0) };
  }
  if (negativeCount > positiveCount) {
    return { sentiment: 'negative', confidence: Math.min(0.5 + (negativeCount / (total * 2)), 1.0) };
  }

  return { sentiment: 'neutral', confidence: 0.5 };
}

export function processSignalForSteering(signal: Signal): void {
  if (signal.type === 'rating' && signal.value <= 3) {
    const condition = `Similar context to session ${signal.sessionId}`;
    const action = signal.comment
      ? `Avoid: ${signal.comment}`
      : 'Review approach — low rating received';
    proposeRule(condition, action, 'failure');
    logger.info({ signalId: signal.id, rating: signal.value }, 'Low rating triggered steering rule proposal');
  }
}

export function captureSignal(
  text: string,
  groupFolder: string,
  sessionId: string,
): Signal | null {
  const rating = parseRating(text);
  if (rating) {
    const signal: Signal = {
      id: `sig-${Date.now()}`,
      type: 'rating',
      value: rating.rating,
      comment: rating.comment || undefined,
      groupFolder,
      sessionId,
      timestamp: new Date(),
    };
    processSignalForSteering(signal);
    return signal;
  }

  const sentiment = analyzeSentiment(text);
  if (sentiment.sentiment !== 'neutral' && sentiment.confidence > 0.7) {
    return {
      id: `sig-${Date.now()}`,
      type: 'sentiment',
      value: sentiment.sentiment === 'positive' ? 1 : -1,
      confidence: sentiment.confidence,
      groupFolder,
      sessionId,
      timestamp: new Date(),
    };
  }

  return null;
}
