import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

const TELOS_DIR = path.resolve(process.cwd(), 'TELOS');

const TELOS_FILES = [
  'MISSION.md', 'GOALS.md', 'BELIEFS.md', 'MODELS.md', 'STRATEGIES.md',
  'PROJECTS.md', 'NARRATIVES.md', 'LEARNED.md', 'CHALLENGES.md', 'IDEAS.md',
] as const;

export type TelosFileName = (typeof TELOS_FILES)[number];

export interface TelosFile {
  name: TelosFileName;
  path: string;
  content: string;
  lastModified: Date;
}

export interface TelosContext {
  files: TelosFile[];
  loadedAt: Date;
}

export function loadTelos(telosDir: string = TELOS_DIR): TelosContext {
  const files: TelosFile[] = [];

  for (const fileName of TELOS_FILES) {
    const filePath = path.join(telosDir, fileName);
    try {
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      files.push({
        name: fileName,
        path: filePath,
        content,
        lastModified: stat.mtime,
      });
    } catch (err) {
      logger.warn({ file: fileName, err }, 'TELOS file not found, skipping');
    }
  }

  logger.info({ fileCount: files.length }, 'TELOS context loaded');
  return { files, loadedAt: new Date() };
}

export function getTelosFile(context: TelosContext, name: TelosFileName): TelosFile | undefined {
  return context.files.find((f) => f.name === name);
}

export function formatTelosForContext(context: TelosContext): string {
  if (context.files.length === 0) return '';

  const sections = context.files.map((f) => {
    const title = f.name.replace('.md', '');
    return `## ${title}\n\n${f.content.trim()}`;
  });

  return `# TELOS Context\n\n${sections.join('\n\n---\n\n')}`;
}
