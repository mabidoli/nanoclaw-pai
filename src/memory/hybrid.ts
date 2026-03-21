import { logger } from '../logger.js';
import { searchMemory, type MemoryEntry } from './file.js';
import { VectorStore } from './vector.js';

export interface HybridSearchResult {
  entry: MemoryEntry;
  keywordScore: number;
  semanticScore: number;
  combinedScore: number;
}

export interface HybridSearchOptions {
  limit?: number;
  keywordWeight?: number;
  semanticWeight?: number;
}

export function hybridSearch(
  query: string,
  entries: MemoryEntry[],
  vectorStore: VectorStore,
  options: HybridSearchOptions = {},
): HybridSearchResult[] {
  const {
    limit = 10,
    keywordWeight = 0.4,
    semanticWeight = 0.6,
  } = options;

  // Keyword search
  const keywordResults = searchMemory(query, entries, entries.length);
  const keywordScores = new Map<string, number>();
  const maxKeywordRank = keywordResults.length || 1;
  keywordResults.forEach((entry, idx) => {
    keywordScores.set(entry.id, 1 - idx / maxKeywordRank);
  });

  // Semantic search
  const semanticResults = vectorStore.search(query, entries.length);
  const semanticScores = new Map<string, number>();
  for (const result of semanticResults) {
    semanticScores.set(result.id, result.score);
  }

  // Combine scores
  const entryMap = new Map<string, MemoryEntry>();
  for (const entry of entries) {
    entryMap.set(entry.id, entry);
  }

  const allIds = new Set([...keywordScores.keys(), ...semanticScores.keys()]);
  const results: HybridSearchResult[] = [];

  for (const id of allIds) {
    const entry = entryMap.get(id);
    if (!entry) continue;

    const kScore = keywordScores.get(id) || 0;
    const sScore = semanticScores.get(id) || 0;
    const combined = kScore * keywordWeight + sScore * semanticWeight;

    results.push({
      entry,
      keywordScore: kScore,
      semanticScore: sScore,
      combinedScore: combined,
    });
  }

  results.sort((a, b) => b.combinedScore - a.combinedScore);

  logger.debug({ query, resultCount: Math.min(results.length, limit) }, 'Hybrid search completed');
  return results.slice(0, limit);
}
