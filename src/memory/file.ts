import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';

const DATA_MEMORY_DIR = path.resolve(process.cwd(), 'data', 'memory');

export interface MemoryEntry {
  id: string;
  content: string;
  source: 'memory.md' | 'daily' | 'session';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function loadMemory(memoryDir: string = DATA_MEMORY_DIR): MemoryEntry[] {
  ensureDir(memoryDir);
  const memoryPath = path.join(memoryDir, 'MEMORY.md');
  const entries: MemoryEntry[] = [];

  if (fs.existsSync(memoryPath)) {
    const content = fs.readFileSync(memoryPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      // Parse entries in format: - [YYYY-MM-DD] content
      const match = line.match(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/);
      if (match) {
        entries.push({
          id: `mem-${match[1]}-${entries.length}`,
          content: match[2],
          source: 'memory.md',
          timestamp: new Date(match[1]),
        });
      }
    }
  }

  // Also load daily notes
  try {
    const files = fs.readdirSync(memoryDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
    for (const file of files) {
      const date = file.replace('.md', '');
      const content = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
      entries.push({
        id: `daily-${date}`,
        content,
        source: 'daily',
        timestamp: new Date(date),
      });
    }
  } catch (err) {
    // Directory might not exist yet — this is expected on first run
    logger.debug({ err }, 'Memory directory not found, starting fresh');
  }

  logger.info({ entryCount: entries.length }, 'Memory loaded');
  return entries;
}

export function addMemoryEntry(
  content: string,
  memoryDir: string = DATA_MEMORY_DIR,
): MemoryEntry {
  ensureDir(memoryDir);
  const memoryPath = path.join(memoryDir, 'MEMORY.md');
  const date = new Date().toISOString().split('T')[0];
  const line = `- [${date}] ${content}\n`;

  fs.appendFileSync(memoryPath, line, 'utf-8');

  const entry: MemoryEntry = {
    id: `mem-${date}-${Date.now()}`,
    content,
    source: 'memory.md',
    timestamp: new Date(),
  };

  logger.info({ entryId: entry.id }, 'Memory entry added');
  return entry;
}

export function createDailyNote(
  memoryDir: string = DATA_MEMORY_DIR,
  date?: string,
): string {
  ensureDir(memoryDir);
  const dateStr = date || new Date().toISOString().split('T')[0];
  const filePath = path.join(memoryDir, `${dateStr}.md`);

  if (!fs.existsSync(filePath)) {
    const content = `# Daily Note — ${dateStr}\n\n## Notes\n\n## Decisions\n\n## Reflections\n`;
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info({ date: dateStr }, 'Daily note created');
  }

  return filePath;
}

export function searchMemory(
  query: string,
  entries: MemoryEntry[],
  limit: number = 10,
): MemoryEntry[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/);

  const scored = entries.map((entry) => {
    const contentLower = entry.content.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) score++;
    }
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}
