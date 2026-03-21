import { logger } from '../logger.js';

export interface VectorEntry {
  id: string;
  content: string;
  vector: number[];
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
}

// Simple bag-of-words vectorizer
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function buildVocabulary(documents: string[]): Map<string, number> {
  const vocab = new Map<string, number>();
  let idx = 0;
  for (const doc of documents) {
    for (const token of tokenize(doc)) {
      if (!vocab.has(token)) {
        vocab.set(token, idx++);
      }
    }
  }
  return vocab;
}

function vectorize(text: string, vocab: Map<string, number>): number[] {
  const vector = new Array(vocab.size).fill(0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    const idx = vocab.get(token);
    if (idx !== undefined) vector[idx]++;
  }
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] /= magnitude;
  }
  return vector;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export class VectorStore {
  private entries: VectorEntry[] = [];
  private vocabulary: Map<string, number> = new Map();

  add(id: string, content: string): void {
    // Rebuild vocab when adding
    const allDocs = [...this.entries.map((e) => e.content), content];
    this.vocabulary = buildVocabulary(allDocs);

    // Re-vectorize all entries with updated vocabulary
    this.entries = this.entries.map((e) => ({
      ...e,
      vector: vectorize(e.content, this.vocabulary),
    }));

    this.entries.push({
      id,
      content,
      vector: vectorize(content, this.vocabulary),
    });
  }

  addBatch(items: Array<{ id: string; content: string }>): void {
    const allDocs = [
      ...this.entries.map((e) => e.content),
      ...items.map((i) => i.content),
    ];
    this.vocabulary = buildVocabulary(allDocs);

    this.entries = this.entries.map((e) => ({
      ...e,
      vector: vectorize(e.content, this.vocabulary),
    }));

    for (const item of items) {
      this.entries.push({
        id: item.id,
        content: item.content,
        vector: vectorize(item.content, this.vocabulary),
      });
    }
  }

  search(query: string, topK: number = 5): SearchResult[] {
    if (this.entries.length === 0) return [];

    const queryVector = vectorize(query, this.vocabulary);

    const results = this.entries.map((entry) => ({
      id: entry.id,
      content: entry.content,
      score: cosineSimilarity(queryVector, entry.vector),
    }));

    return results
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  delete(ids: string[]): void {
    const idSet = new Set(ids);
    this.entries = this.entries.filter((e) => !idSet.has(e.id));
  }

  size(): number {
    return this.entries.length;
  }
}

export function createVectorStore(): VectorStore {
  logger.info('Vector store created');
  return new VectorStore();
}
