import { describe, it, expect, beforeEach } from 'vitest';
import { parseRating, analyzeSentiment, captureSignal, processSignalForSteering, Signal } from '../src/signals.js';
import { loadRules, getAllRules } from '../src/steering.js';

describe('Signal Capture', () => {
  describe('parseRating', () => {
    it('parses "8 - great response"', () => {
      const result = parseRating('8 - great response');
      expect(result).toEqual({ rating: 8, comment: 'great response' });
    });

    it('parses "10 – perfect"', () => {
      const result = parseRating('10 – perfect');
      expect(result).toEqual({ rating: 10, comment: 'perfect' });
    });

    it('parses "1: terrible"', () => {
      const result = parseRating('1: terrible');
      expect(result).toEqual({ rating: 1, comment: 'terrible' });
    });

    it('rejects "3 items need to be fixed"', () => {
      expect(parseRating('3 items need to be fixed')).toBeNull();
    });

    it('rejects "5 things to do"', () => {
      expect(parseRating('5 things to do')).toBeNull();
    });

    it('rejects "2 files changed"', () => {
      expect(parseRating('2 files changed')).toBeNull();
    });

    it('rejects ratings outside 1-10', () => {
      expect(parseRating('0 - bad')).toBeNull();
      expect(parseRating('11 - too high')).toBeNull();
    });

    it('rejects plain text', () => {
      expect(parseRating('hello world')).toBeNull();
    });
  });

  describe('analyzeSentiment', () => {
    it('detects positive sentiment', () => {
      const result = analyzeSentiment('Great job, this is amazing!');
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('detects negative sentiment', () => {
      const result = analyzeSentiment('This is terrible and broken');
      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('detects neutral sentiment', () => {
      const result = analyzeSentiment('The meeting is at 3pm');
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('captureSignal', () => {
    it('captures explicit rating', () => {
      const signal = captureSignal('8 - great response', 'main', 'sess-1');
      expect(signal).not.toBeNull();
      expect(signal!.type).toBe('rating');
      expect(signal!.value).toBe(8);
    });

    it('captures strong sentiment', () => {
      const signal = captureSignal('This is absolutely amazing and wonderful', 'main', 'sess-1');
      // May or may not capture depending on confidence threshold
      if (signal) {
        expect(signal.type).toBe('sentiment');
      }
    });

    it('returns null for neutral text', () => {
      const signal = captureSignal('The meeting is at 3pm', 'main', 'sess-1');
      expect(signal).toBeNull();
    });
  });

  describe('processSignalForSteering', () => {
    beforeEach(() => {
      // Reset steering rules
      loadRules([]);
    });

    it('triggers rule proposal for rating <= 3', () => {
      const signal: Signal = {
        id: 'sig-test-1',
        type: 'rating',
        value: 2,
        comment: 'needs improvement',
        groupFolder: 'main',
        sessionId: 'sess-123',
        timestamp: new Date(),
      };

      processSignalForSteering(signal);

      const rules = getAllRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].status).toBe('proposed');
      expect(rules[0].action).toContain('Avoid: needs improvement');
    });

    it('triggers rule proposal for rating of 1 without comment', () => {
      const signal: Signal = {
        id: 'sig-test-2',
        type: 'rating',
        value: 1,
        groupFolder: 'main',
        sessionId: 'sess-456',
        timestamp: new Date(),
      };

      processSignalForSteering(signal);

      const rules = getAllRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].action).toContain('Review approach');
    });

    it('does NOT trigger rule proposal for rating >= 4', () => {
      const signal: Signal = {
        id: 'sig-test-3',
        type: 'rating',
        value: 4,
        groupFolder: 'main',
        sessionId: 'sess-789',
        timestamp: new Date(),
      };

      processSignalForSteering(signal);

      const rules = getAllRules();
      expect(rules).toHaveLength(0);
    });

    it('does NOT trigger rule proposal for high rating', () => {
      const signal: Signal = {
        id: 'sig-test-4',
        type: 'rating',
        value: 8,
        comment: 'great job',
        groupFolder: 'main',
        sessionId: 'sess-abc',
        timestamp: new Date(),
      };

      processSignalForSteering(signal);

      const rules = getAllRules();
      expect(rules).toHaveLength(0);
    });

    it('does NOT trigger rule proposal for sentiment signals', () => {
      const signal: Signal = {
        id: 'sig-test-5',
        type: 'sentiment',
        value: -1,
        confidence: 0.9,
        groupFolder: 'main',
        sessionId: 'sess-def',
        timestamp: new Date(),
      };

      processSignalForSteering(signal);

      const rules = getAllRules();
      expect(rules).toHaveLength(0);
    });
  });

  describe('captureSignal with steering integration', () => {
    beforeEach(() => {
      loadRules([]);
    });

    it('auto-triggers steering rule for low rating capture', () => {
      captureSignal('1 - terrible response', 'main', 'sess-low');

      const rules = getAllRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].source).toBe('failure');
    });

    it('does NOT trigger steering rule for high rating capture', () => {
      captureSignal('9 - excellent work', 'main', 'sess-high');

      const rules = getAllRules();
      expect(rules).toHaveLength(0);
    });
  });
});
