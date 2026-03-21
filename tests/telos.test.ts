import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadTelos, formatTelosForContext, getTelosFile } from '../src/telos.js';

describe('TELOS System', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telos-test-'));
    // Create all 10 TELOS files
    const files = [
      'MISSION.md', 'GOALS.md', 'BELIEFS.md', 'MODELS.md', 'STRATEGIES.md',
      'PROJECTS.md', 'NARRATIVES.md', 'LEARNED.md', 'CHALLENGES.md', 'IDEAS.md',
    ];
    for (const file of files) {
      fs.writeFileSync(path.join(tmpDir, file), `# ${file.replace('.md', '')}\n\nContent for ${file}`);
    }
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads all 10 TELOS files', () => {
    const context = loadTelos(tmpDir);
    expect(context.files).toHaveLength(10);
  });

  it('returns correct file content', () => {
    const context = loadTelos(tmpDir);
    const mission = getTelosFile(context, 'MISSION.md');
    expect(mission).toBeDefined();
    expect(mission!.content).toContain('Content for MISSION.md');
  });

  it('handles missing files gracefully', () => {
    fs.unlinkSync(path.join(tmpDir, 'IDEAS.md'));
    const context = loadTelos(tmpDir);
    expect(context.files).toHaveLength(9);
  });

  it('formatTelosForContext returns formatted string', () => {
    const context = loadTelos(tmpDir);
    const formatted = formatTelosForContext(context);
    expect(formatted).toContain('# TELOS Context');
    expect(formatted).toContain('## MISSION');
    expect(formatted).toContain('## GOALS');
  });

  it('formatTelosForContext returns empty for empty context', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telos-empty-'));
    const context = loadTelos(emptyDir);
    expect(formatTelosForContext(context)).toBe('');
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('includes loadedAt timestamp', () => {
    const before = new Date();
    const context = loadTelos(tmpDir);
    const after = new Date();
    expect(context.loadedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(context.loadedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
