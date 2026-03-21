import { logger } from '../logger.js';

export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'technology' | 'project' | 'concept' | 'location' | 'other';
  properties: Record<string, unknown>;
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
}

export class GraphStore {
  private entities: Map<string, Entity> = new Map();
  private relationships: Relationship[] = [];

  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  addRelationship(rel: Relationship): void {
    this.relationships.push(rel);
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  findEntityByName(name: string): Entity | undefined {
    const nameLower = name.toLowerCase();
    for (const entity of this.entities.values()) {
      if (entity.name.toLowerCase() === nameLower) return entity;
    }
    return undefined;
  }

  getRelationshipsFor(entityId: string): Relationship[] {
    return this.relationships.filter(
      (r) => r.from === entityId || r.to === entityId,
    );
  }

  queryGraph(startId: string, maxHops: number = 3): Entity[] {
    const visited = new Set<string>();
    const result: Entity[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.depth > maxHops) continue;
      visited.add(current.id);

      const entity = this.entities.get(current.id);
      if (entity) result.push(entity);

      if (current.depth < maxHops) {
        const rels = this.getRelationshipsFor(current.id);
        for (const rel of rels) {
          const nextId = rel.from === current.id ? rel.to : rel.from;
          if (!visited.has(nextId)) {
            queue.push({ id: nextId, depth: current.depth + 1 });
          }
        }
      }
    }

    return result;
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  getAllRelationships(): Relationship[] {
    return [...this.relationships];
  }

  size(): { entities: number; relationships: number } {
    return { entities: this.entities.size, relationships: this.relationships.length };
  }
}

// Simple entity extraction using regex patterns
const PATTERNS: Array<{ type: Entity['type']; pattern: RegExp }> = [
  { type: 'technology', pattern: /\b(TypeScript|JavaScript|Python|Node\.js|React|Docker|SQLite|PostgreSQL|Redis|Kubernetes|Git|AWS|GCP|Azure)\b/gi },
  { type: 'organization', pattern: /\b(Google|Microsoft|Apple|Amazon|Meta|Anthropic|OpenAI|GitHub)\b/gi },
];

export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  const seen = new Set<string>();

  for (const { type, pattern } of PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[0];
      const key = `${type}:${name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        entities.push({
          id: `entity-${key}`,
          name,
          type,
          properties: {},
        });
      }
    }
  }

  // Extract capitalized proper nouns as potential entities
  const properNouns = text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
  for (const match of properNouns) {
    const name = match[0];
    // Skip common words
    if (['The', 'This', 'That', 'When', 'Where', 'What', 'How', 'Why', 'Which', 'Note', 'Notes', 'Daily', 'Content', 'Lesson', 'Mission'].includes(name)) continue;
    const key = `other:${name.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({
        id: `entity-${key}`,
        name,
        type: 'other',
        properties: {},
      });
    }
  }

  logger.debug({ count: entities.length }, 'Entities extracted');
  return entities;
}

export function extractRelationships(text: string, entities: Entity[]): Relationship[] {
  const relationships: Relationship[] = [];
  if (entities.length < 2) return relationships;

  // Simple co-occurrence based relationship extraction
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    const present: Entity[] = [];

    for (const entity of entities) {
      if (sentenceLower.includes(entity.name.toLowerCase())) {
        present.push(entity);
      }
    }

    // Create relationships for entities in same sentence
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        // Detect relationship type from context
        let relType = 'related_to';
        if (/\b(uses?|using|used)\b/i.test(sentence)) relType = 'uses';
        else if (/\b(is|are|was|were)\b/i.test(sentence)) relType = 'is';
        else if (/\b(has|have|had)\b/i.test(sentence)) relType = 'has';
        else if (/\b(built|build|creates?|created)\b/i.test(sentence)) relType = 'builds';
        else if (/\b(depends?|requires?|needs?)\b/i.test(sentence)) relType = 'depends_on';

        relationships.push({
          id: `rel-${present[i].id}-${present[j].id}`,
          from: present[i].id,
          to: present[j].id,
          type: relType,
        });
      }
    }
  }

  logger.debug({ count: relationships.length }, 'Relationships extracted');
  return relationships;
}

export function createGraphStore(): GraphStore {
  logger.info('Graph store created');
  return new GraphStore();
}
