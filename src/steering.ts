import { logger } from './logger.js';

export interface SteeringRule {
  id: string;
  condition: string;
  action: string;
  source: 'failure' | 'manual';
  status: 'proposed' | 'approved' | 'rejected' | 'active';
  createdAt: Date;
  approvedAt?: Date;
}

// In-memory store (persisted via db.ts)
let rules: SteeringRule[] = [];

export function loadRules(dbRules: SteeringRule[]): void {
  rules = dbRules;
  logger.info({ ruleCount: rules.length }, 'Steering rules loaded');
}

export function proposeRule(condition: string, action: string, source: 'failure' | 'manual' = 'failure'): SteeringRule {
  const rule: SteeringRule = {
    id: `rule-${Date.now()}`,
    condition,
    action,
    source,
    status: 'proposed',
    createdAt: new Date(),
  };
  rules.push(rule);
  logger.info({ ruleId: rule.id }, 'Steering rule proposed');
  return rule;
}

export function approveRule(ruleId: string): SteeringRule | undefined {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return undefined;
  rule.status = 'active';
  rule.approvedAt = new Date();
  logger.info({ ruleId }, 'Steering rule approved');
  return rule;
}

export function rejectRule(ruleId: string): SteeringRule | undefined {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return undefined;
  rule.status = 'rejected';
  logger.info({ ruleId }, 'Steering rule rejected');
  return rule;
}

export function getActiveRules(): SteeringRule[] {
  return rules.filter((r) => r.status === 'active');
}

export function getAllRules(): SteeringRule[] {
  return [...rules];
}

export function formatRulesForContext(): string {
  const active = getActiveRules();
  if (active.length === 0) return '';

  const formatted = active.map((r) =>
    `- **When:** ${r.condition}\n  **Do:** ${r.action}`
  ).join('\n\n');

  return `# AI Steering Rules\n\n${formatted}`;
}
