import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadRules,
  proposeRule,
  approveRule,
  rejectRule,
  getActiveRules,
  formatRulesForContext,
  SteeringRule,
} from '../src/steering.js';

describe('Steering Rules', () => {
  beforeEach(() => {
    // Reset rules by loading empty array
    loadRules([]);
  });

  describe('loadRules', () => {
    it('populates the rules store from database rules', () => {
      const dbRules: SteeringRule[] = [
        {
          id: 'rule-1',
          condition: 'When user is confused',
          action: 'Clarify with examples',
          source: 'manual',
          status: 'active',
          createdAt: new Date('2024-01-01'),
          approvedAt: new Date('2024-01-02'),
        },
        {
          id: 'rule-2',
          condition: 'When error occurs',
          action: 'Check logs first',
          source: 'failure',
          status: 'active',
          createdAt: new Date('2024-01-03'),
          approvedAt: new Date('2024-01-04'),
        },
      ];

      loadRules(dbRules);

      const active = getActiveRules();
      expect(active).toHaveLength(2);
      expect(active[0].id).toBe('rule-1');
      expect(active[1].id).toBe('rule-2');
    });

    it('returns loaded rules via getActiveRules', () => {
      loadRules([
        {
          id: 'rule-active',
          condition: 'test',
          action: 'action',
          source: 'manual',
          status: 'active',
          createdAt: new Date(),
        },
        {
          id: 'rule-proposed',
          condition: 'test2',
          action: 'action2',
          source: 'failure',
          status: 'proposed',
          createdAt: new Date(),
        },
      ]);

      const active = getActiveRules();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('rule-active');
    });
  });

  describe('proposeRule', () => {
    it('creates a proposed rule', () => {
      const rule = proposeRule('When X happens', 'Do Y');
      expect(rule.status).toBe('proposed');
      expect(rule.condition).toBe('When X happens');
      expect(rule.action).toBe('Do Y');
      expect(rule.source).toBe('failure');
    });

    it('uses manual source when specified', () => {
      const rule = proposeRule('condition', 'action', 'manual');
      expect(rule.source).toBe('manual');
    });
  });

  describe('approveRule', () => {
    it('activates a proposed rule', () => {
      const rule = proposeRule('condition', 'action');
      const approved = approveRule(rule.id);
      expect(approved).toBeDefined();
      expect(approved!.status).toBe('active');
      expect(approved!.approvedAt).toBeDefined();
    });

    it('returns undefined for non-existent rule', () => {
      const result = approveRule('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('rejectRule', () => {
    it('rejects a proposed rule', () => {
      const rule = proposeRule('condition', 'action');
      const rejected = rejectRule(rule.id);
      expect(rejected).toBeDefined();
      expect(rejected!.status).toBe('rejected');
    });
  });

  describe('formatRulesForContext', () => {
    it('returns empty string when no active rules', () => {
      expect(formatRulesForContext()).toBe('');
    });

    it('formats active rules for context', () => {
      const rule = proposeRule('When confused', 'Clarify');
      approveRule(rule.id);

      const formatted = formatRulesForContext();
      expect(formatted).toContain('AI Steering Rules');
      expect(formatted).toContain('When confused');
      expect(formatted).toContain('Clarify');
    });
  });
});
