import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadMemory, addMemoryEntry, createDailyNote, searchMemory } from '../src/memory/file.js';
import { VectorStore, createVectorStore } from '../src/memory/vector.js';
import { GraphStore, extractEntities, extractRelationships, createGraphStore } from '../src/memory/graph.js';
import { hybridSearch } from '../src/memory/hybrid.js';

describe('File Memory', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads empty memory from new directory', () => {
    const entries = loadMemory(tmpDir);
    expect(entries).toEqual([]);
  });

  it('adds and loads memory entries', () => {
    addMemoryEntry('Decided to use TypeScript', tmpDir);
    addMemoryEntry('PostgreSQL selected for database', tmpDir);
    const entries = loadMemory(tmpDir);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.some((e) => e.content.includes('TypeScript'))).toBe(true);
  });

  it('creates daily note with correct format', () => {
    const notePath = createDailyNote(tmpDir, '2026-03-20');
    expect(fs.existsSync(notePath)).toBe(true);
    const content = fs.readFileSync(notePath, 'utf-8');
    expect(content).toContain('# Daily Note — 2026-03-20');
  });

  it('does not overwrite existing daily note', () => {
    const notePath = createDailyNote(tmpDir, '2026-03-20');
    fs.appendFileSync(notePath, '\nCustom content');
    createDailyNote(tmpDir, '2026-03-20');
    const content = fs.readFileSync(notePath, 'utf-8');
    expect(content).toContain('Custom content');
  });

  it('searches memory entries by keyword', () => {
    const entries = [
      { id: '1', content: 'Decided to use TypeScript for the project', source: 'memory.md' as const, timestamp: new Date() },
      { id: '2', content: 'PostgreSQL selected for database', source: 'memory.md' as const, timestamp: new Date() },
      { id: '3', content: 'Meeting notes from standup', source: 'daily' as const, timestamp: new Date() },
    ];
    const results = searchMemory('TypeScript', entries);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });
});

describe('Vector Memory', () => {
  it('creates a vector store', () => {
    const store = createVectorStore();
    expect(store.size()).toBe(0);
  });

  it('adds and searches entries', () => {
    const store = new VectorStore();
    store.add('1', 'TypeScript is a programming language');
    store.add('2', 'PostgreSQL is a database system');
    store.add('3', 'Docker containers provide isolation');

    const results = store.search('programming language', 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('1');
  });

  it('returns empty for no matches', () => {
    const store = new VectorStore();
    store.add('1', 'TypeScript is great');
    const results = store.search('xyzabc123', 5);
    expect(results).toEqual([]);
  });

  it('handles batch add', () => {
    const store = new VectorStore();
    store.addBatch([
      { id: '1', content: 'First document' },
      { id: '2', content: 'Second document' },
    ]);
    expect(store.size()).toBe(2);
  });

  it('deletes entries', () => {
    const store = new VectorStore();
    store.add('1', 'First');
    store.add('2', 'Second');
    store.delete(['1']);
    expect(store.size()).toBe(1);
  });
});

describe('Graph Memory', () => {
  it('creates a graph store', () => {
    const store = createGraphStore();
    expect(store.size()).toEqual({ entities: 0, relationships: 0 });
  });

  it('extracts technology entities', () => {
    const entities = extractEntities('We are using TypeScript and Docker for this project');
    expect(entities.some((e) => e.name === 'TypeScript')).toBe(true);
    expect(entities.some((e) => e.name === 'Docker')).toBe(true);
  });

  it('extracts relationships between entities', () => {
    const text = 'The project uses TypeScript and Docker for deployment';
    const entities = extractEntities(text);
    const rels = extractRelationships(text, entities);
    expect(rels.length).toBeGreaterThan(0);
  });

  it('traverses graph up to 3 hops', () => {
    const store = new GraphStore();
    store.addEntity({ id: 'a', name: 'A', type: 'concept', properties: {} });
    store.addEntity({ id: 'b', name: 'B', type: 'concept', properties: {} });
    store.addEntity({ id: 'c', name: 'C', type: 'concept', properties: {} });
    store.addEntity({ id: 'd', name: 'D', type: 'concept', properties: {} });
    store.addRelationship({ id: 'r1', from: 'a', to: 'b', type: 'related' });
    store.addRelationship({ id: 'r2', from: 'b', to: 'c', type: 'related' });
    store.addRelationship({ id: 'r3', from: 'c', to: 'd', type: 'related' });

    const result = store.queryGraph('a', 3);
    expect(result).toHaveLength(4); // a, b, c, d
  });

  it('limits traversal by maxHops', () => {
    const store = new GraphStore();
    store.addEntity({ id: 'a', name: 'A', type: 'concept', properties: {} });
    store.addEntity({ id: 'b', name: 'B', type: 'concept', properties: {} });
    store.addEntity({ id: 'c', name: 'C', type: 'concept', properties: {} });
    store.addRelationship({ id: 'r1', from: 'a', to: 'b', type: 'related' });
    store.addRelationship({ id: 'r2', from: 'b', to: 'c', type: 'related' });

    const result = store.queryGraph('a', 1);
    expect(result).toHaveLength(2); // a, b only
  });

  it('finds entity by name', () => {
    const store = new GraphStore();
    store.addEntity({ id: 'ts', name: 'TypeScript', type: 'technology', properties: {} });
    expect(store.findEntityByName('typescript')).toBeDefined();
    expect(store.findEntityByName('nonexistent')).toBeUndefined();
  });
});

describe('Hybrid Search', () => {
  it('combines keyword and semantic results', () => {
    const entries = [
      { id: '1', content: 'TypeScript programming language', source: 'memory.md' as const, timestamp: new Date() },
      { id: '2', content: 'Database system PostgreSQL', source: 'memory.md' as const, timestamp: new Date() },
      { id: '3', content: 'Container isolation with Docker', source: 'daily' as const, timestamp: new Date() },
    ];

    const vectorStore = new VectorStore();
    for (const entry of entries) {
      vectorStore.add(entry.id, entry.content);
    }

    const results = hybridSearch('TypeScript language', entries, vectorStore);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.id).toBe('1');
  });
});
