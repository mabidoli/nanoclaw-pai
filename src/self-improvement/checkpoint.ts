import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';

const CHECKPOINTS_DIR = path.resolve(process.cwd(), 'data', 'checkpoints');

export interface CheckpointState {
  iscStatus: Record<string, 'pass' | 'fail' | 'pending'>;
  decisions: string[];
  context: string;
  artifacts: string[];
}

export interface Checkpoint {
  id: string;
  groupFolder: string;
  state: CheckpointState;
  timestamp: Date;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function createCheckpoint(
  groupFolder: string,
  state: CheckpointState,
  checkpointsDir: string = CHECKPOINTS_DIR,
): Checkpoint {
  ensureDir(checkpointsDir);

  const checkpoint: Checkpoint = {
    id: `ckpt-${Date.now()}`,
    groupFolder,
    state,
    timestamp: new Date(),
  };

  const filePath = path.join(checkpointsDir, `${checkpoint.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');

  logger.info({ checkpointId: checkpoint.id, groupFolder }, 'Checkpoint created');
  return checkpoint;
}

export function loadCheckpoint(
  checkpointId: string,
  checkpointsDir: string = CHECKPOINTS_DIR,
): Checkpoint | undefined {
  const filePath = path.join(checkpointsDir, `${checkpointId}.json`);

  if (!fs.existsSync(filePath)) {
    logger.warn({ checkpointId }, 'Checkpoint not found');
    return undefined;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data.timestamp = new Date(data.timestamp);
    logger.info({ checkpointId }, 'Checkpoint loaded');
    return data as Checkpoint;
  } catch (err) {
    logger.error({ checkpointId, err }, 'Failed to load checkpoint');
    return undefined;
  }
}

export function getLatestCheckpoint(
  groupFolder: string,
  checkpointsDir: string = CHECKPOINTS_DIR,
): Checkpoint | undefined {
  ensureDir(checkpointsDir);

  try {
    const files = fs.readdirSync(checkpointsDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    for (const file of files) {
      const filePath = path.join(checkpointsDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (data.groupFolder === groupFolder) {
          data.timestamp = new Date(data.timestamp);
          return data as Checkpoint;
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Directory might not exist
  }

  return undefined;
}

export function getContextUsage(currentTokens: number, maxTokens: number): number {
  return Math.round((currentTokens / maxTokens) * 100);
}

export function checkContextWarning(
  currentTokens: number,
  maxTokens: number,
  onWarning: (usage: number) => void,
  threshold: number = 70,
): boolean {
  const usage = getContextUsage(currentTokens, maxTokens);
  if (usage >= threshold) {
    onWarning(usage);
    return true;
  }
  return false;
}
