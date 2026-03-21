import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { logger } from '../logger.js';

export interface Modification {
  id: string;
  type: 'steering' | 'prompt' | 'config';
  targetFile: string;
  diff: string;
  rationale: string;
  baselineScore: number;
  verifiedScore?: number;
  status: 'proposed' | 'verified' | 'applied' | 'rejected' | 'rolledback';
  createdAt: Date;
}

// Store for tracking modifications
let modificationHistory: Modification[] = [];
let modCounter = 0;

/** @internal - for tests only */
export function _resetModificationHistory(): void {
  modificationHistory = [];
  modCounter = 0;
}

export function proposeModification(
  type: Modification['type'],
  targetFile: string,
  diff: string,
  rationale: string,
  baselineScore: number,
): Modification {
  const mod: Modification = {
    id: `mod-${Date.now()}-${modCounter++}`,
    type,
    targetFile,
    diff,
    rationale,
    baselineScore,
    status: 'proposed',
    createdAt: new Date(),
  };

  modificationHistory.push(mod);
  logger.info({ modId: mod.id, type, targetFile }, 'Modification proposed');
  return mod;
}

export async function verifyModification(
  modId: string,
  testSuite: () => Promise<number>,
): Promise<boolean> {
  const mod = modificationHistory.find((m) => m.id === modId);
  if (!mod) {
    logger.error({ modId }, 'Modification not found');
    return false;
  }

  if (mod.status !== 'proposed') {
    logger.warn({ modId, status: mod.status }, 'Modification not in proposed state');
    return false;
  }

  try {
    const score = await testSuite();
    mod.verifiedScore = score;

    if (score >= mod.baselineScore) {
      mod.status = 'verified';
      logger.info({ modId, baselineScore: mod.baselineScore, verifiedScore: score }, 'Modification verified');
      return true;
    } else {
      mod.status = 'rejected';
      logger.warn({ modId, baselineScore: mod.baselineScore, verifiedScore: score }, 'Modification rejected — score regression');
      return false;
    }
  } catch (err) {
    mod.status = 'rejected';
    logger.error({ modId, err }, 'Verification failed');
    return false;
  }
}

export function applyModification(modId: string): boolean {
  const mod = modificationHistory.find((m) => m.id === modId);
  if (!mod) return false;

  if (mod.status !== 'verified') {
    logger.warn({ modId, status: mod.status }, 'Cannot apply unverified modification');
    return false;
  }

  try {
    // Store backup before applying
    if (fs.existsSync(mod.targetFile)) {
      const backup = fs.readFileSync(mod.targetFile, 'utf-8');
      const backupPath = `${mod.targetFile}.bak-${mod.id}`;
      fs.writeFileSync(backupPath, backup, 'utf-8');
    }

    // Apply the diff (simplified — in production, use a proper diff/patch lib)
    // For now, the diff is treated as the new content
    fs.writeFileSync(mod.targetFile, mod.diff, 'utf-8');
    mod.status = 'applied';

    try {
      execSync(`git add "${mod.targetFile}" && git commit -m "self-mod(${mod.type}): ${mod.rationale.slice(0, 50)}"`, {
        cwd: path.dirname(mod.targetFile) || process.cwd(),
        stdio: 'pipe',
      });
      logger.info({ modId, targetFile: mod.targetFile }, 'Modification committed to git');
    } catch (gitErr) {
      logger.warn({ modId, err: gitErr }, 'Git commit failed (non-blocking)');
    }

    logger.info({ modId, targetFile: mod.targetFile }, 'Modification applied');
    return true;
  } catch (err) {
    logger.error({ modId, err }, 'Failed to apply modification');
    return false;
  }
}

export function rollbackModification(modId: string): boolean {
  const mod = modificationHistory.find((m) => m.id === modId);
  if (!mod) return false;

  if (mod.status !== 'applied') {
    logger.warn({ modId, status: mod.status }, 'Cannot rollback — not applied');
    return false;
  }

  const backupPath = `${mod.targetFile}.bak-${mod.id}`;

  try {
    if (fs.existsSync(backupPath)) {
      const backup = fs.readFileSync(backupPath, 'utf-8');
      fs.writeFileSync(mod.targetFile, backup, 'utf-8');
      fs.unlinkSync(backupPath);
      mod.status = 'rolledback';
      logger.info({ modId, targetFile: mod.targetFile }, 'Modification rolled back');
      return true;
    } else {
      logger.error({ modId, backupPath }, 'Backup file not found for rollback');
      return false;
    }
  } catch (err) {
    logger.error({ modId, err }, 'Rollback failed');
    return false;
  }
}

export function getModificationHistory(): Modification[] {
  return [...modificationHistory];
}

export function getModification(modId: string): Modification | undefined {
  return modificationHistory.find((m) => m.id === modId);
}
