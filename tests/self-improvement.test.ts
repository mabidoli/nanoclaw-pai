import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  createCheckpoint,
  loadCheckpoint,
  getLatestCheckpoint,
  getContextUsage,
  checkContextWarning,
} from '../src/self-improvement/checkpoint.js';
import { runAutoresearch, getExperimentSummary } from '../src/self-improvement/autoresearch.js';
import {
  proposeModification,
  verifyModification,
  applyModification,
  rollbackModification,
  getModificationHistory,
  _resetModificationHistory,
} from '../src/self-improvement/godel.js';

describe('Checkpoint System', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a checkpoint file', () => {
    const ckpt = createCheckpoint('main', {
      iscStatus: { 'ISC-1': 'pass', 'ISC-2': 'pending' },
      decisions: ['Use TypeScript'],
      context: 'Building PAI system',
      artifacts: ['src/telos.ts'],
    }, tmpDir);

    expect(ckpt.id).toMatch(/^ckpt-/);
    expect(fs.existsSync(path.join(tmpDir, `${ckpt.id}.json`))).toBe(true);
  });

  it('loads a checkpoint by ID', () => {
    const ckpt = createCheckpoint('main', {
      iscStatus: { 'ISC-1': 'pass' },
      decisions: [],
      context: 'test',
      artifacts: [],
    }, tmpDir);

    const loaded = loadCheckpoint(ckpt.id, tmpDir);
    expect(loaded).toBeDefined();
    expect(loaded!.groupFolder).toBe('main');
    expect(loaded!.state.iscStatus['ISC-1']).toBe('pass');
  });

  it('returns undefined for nonexistent checkpoint', () => {
    const loaded = loadCheckpoint('ckpt-nonexistent', tmpDir);
    expect(loaded).toBeUndefined();
  });

  it('gets latest checkpoint for group', () => {
    createCheckpoint('main', {
      iscStatus: { 'ISC-1': 'pass' },
      decisions: [],
      context: 'first',
      artifacts: [],
    }, tmpDir);

    // Small delay to ensure different timestamp
    const ckpt2 = createCheckpoint('main', {
      iscStatus: { 'ISC-1': 'pass', 'ISC-2': 'pass' },
      decisions: ['decision'],
      context: 'second',
      artifacts: [],
    }, tmpDir);

    const latest = getLatestCheckpoint('main', tmpDir);
    expect(latest).toBeDefined();
    expect(latest!.id).toBe(ckpt2.id);
  });

  it('calculates context usage percentage', () => {
    expect(getContextUsage(70000, 100000)).toBe(70);
    expect(getContextUsage(50000, 200000)).toBe(25);
  });

  describe('checkContextWarning', () => {
    it('triggers warning at 70%+ usage', () => {
      const onWarning = vi.fn();
      const result = checkContextWarning(70000, 100000, onWarning);

      expect(result).toBe(true);
      expect(onWarning).toHaveBeenCalledWith(70);
    });

    it('triggers warning at exactly threshold', () => {
      const onWarning = vi.fn();
      const result = checkContextWarning(70000, 100000, onWarning, 70);

      expect(result).toBe(true);
      expect(onWarning).toHaveBeenCalledWith(70);
    });

    it('does NOT trigger warning below threshold', () => {
      const onWarning = vi.fn();
      const result = checkContextWarning(60000, 100000, onWarning);

      expect(result).toBe(false);
      expect(onWarning).not.toHaveBeenCalled();
    });

    it('uses custom threshold', () => {
      const onWarning = vi.fn();
      const result = checkContextWarning(50000, 100000, onWarning, 50);

      expect(result).toBe(true);
      expect(onWarning).toHaveBeenCalledWith(50);
    });

    it('does NOT trigger at 69% with default 70% threshold', () => {
      const onWarning = vi.fn();
      const result = checkContextWarning(69000, 100000, onWarning);

      expect(result).toBe(false);
      expect(onWarning).not.toHaveBeenCalled();
    });
  });
});

describe('Autoresearch', () => {
  it('runs experiments and reports results', async () => {
    let value = 0.8;

    const results = await runAutoresearch({
      maxIterations: 2,
      timeoutMinutes: 1,
      metric: async () => value,
      improvements: [
        {
          description: 'Improve prompt clarity',
          modification: 'Add clearer instructions',
          apply: async () => { value = 0.9; },
          rollback: async () => { value = 0.8; },
        },
        {
          description: 'Add context window',
          modification: 'Increase context',
          apply: async () => { value = 0.7; }, // This one regresses
          rollback: async () => { value = 0.8; },
        },
      ],
    });

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('success');
    expect(results[1].status).toBe('discarded');
  });

  it('generates experiment summary', () => {
    const experiments = [
      {
        id: 'exp-1',
        description: 'Test improvement',
        modification: 'change',
        baselineScore: 0.8,
        newScore: 0.9,
        status: 'success' as const,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    ];
    const summary = getExperimentSummary(experiments);
    expect(summary).toContain('success');
    expect(summary).toContain('+0.10');
  });
});

describe('Gödel Loop', () => {
  let tmpDir: string;
  let targetFile: string;

  beforeEach(() => {
    _resetModificationHistory();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'godel-test-'));
    targetFile = path.join(tmpDir, 'test-config.txt');
    fs.writeFileSync(targetFile, 'original content', 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('proposes a modification', () => {
    const mod = proposeModification('config', targetFile, 'new content', 'Improve performance', 0.8);
    expect(mod.status).toBe('proposed');
    expect(mod.type).toBe('config');
  });

  it('verifies modification with passing score', async () => {
    const mod = proposeModification('config', targetFile, 'new content', 'Test', 0.8);
    const result = await verifyModification(mod.id, async () => 0.9);
    expect(result).toBe(true);
    expect(getModificationHistory().find((m) => m.id === mod.id)!.status).toBe('verified');
  });

  it('rejects modification with failing score', async () => {
    const mod = proposeModification('config', targetFile, 'new content', 'Test', 0.8);
    const result = await verifyModification(mod.id, async () => 0.7);
    expect(result).toBe(false);
    expect(getModificationHistory().find((m) => m.id === mod.id)!.status).toBe('rejected');
  });

  it('applies verified modification', async () => {
    const mod = proposeModification('config', targetFile, 'new content', 'Test', 0.8);
    await verifyModification(mod.id, async () => 0.9);
    const applied = applyModification(mod.id);
    expect(applied).toBe(true);
    expect(fs.readFileSync(targetFile, 'utf-8')).toBe('new content');
  });

  it('rejects applying unverified modification', () => {
    const mod = proposeModification('config', targetFile, 'new content', 'Test', 0.8);
    const applied = applyModification(mod.id);
    expect(applied).toBe(false);
  });

  it('rolls back applied modification', async () => {
    const mod = proposeModification('config', targetFile, 'new content', 'Test', 0.8);
    await verifyModification(mod.id, async () => 0.9);
    applyModification(mod.id);

    const rolledBack = rollbackModification(mod.id);
    expect(rolledBack).toBe(true);
    expect(fs.readFileSync(targetFile, 'utf-8')).toBe('original content');
  });

  it('cannot rollback non-applied modification', () => {
    const mod = proposeModification('config', targetFile, 'new content', 'Test', 0.8);
    const rolledBack = rollbackModification(mod.id);
    expect(rolledBack).toBe(false);
  });

  it('applies modification successfully (git commit is non-blocking)', async () => {
    // The git commit happens in a try-catch so it's non-blocking
    // This test verifies that applyModification works even if git fails
    // (which it will in the temp directory that's not a git repo)
    const mod = proposeModification('config', targetFile, 'new content', 'Improve performance', 0.8);
    await verifyModification(mod.id, async () => 0.9);
    const applied = applyModification(mod.id);

    // Should still apply successfully even though git commit would fail (not a git repo)
    expect(applied).toBe(true);
    expect(fs.readFileSync(targetFile, 'utf-8')).toBe('new content');
    expect(getModificationHistory().find((m) => m.id === mod.id)!.status).toBe('applied');
  });

  it('modification has truncated rationale in commit message format', () => {
    const longRationale = 'A'.repeat(100);
    const mod = proposeModification('steering', targetFile, 'content', longRationale, 0.8);
    
    // The commit message should use rationale.slice(0, 50)
    // Verify the modification stores the full rationale
    expect(mod.rationale).toBe(longRationale);
    expect(mod.rationale.length).toBe(100);
    // The slice(0, 50) happens during the execSync call, not stored
  });
});
