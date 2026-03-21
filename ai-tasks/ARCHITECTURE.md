# Architecture: nanoclaw-pai

**Personal AI Infrastructure built on NanoClaw**

---

## 1. Approach

Extend NanoClaw's existing single-process orchestrator architecture with modular components for TELOS, signals, memory, and self-improvement. Each feature is a separate TypeScript module that integrates via hooks in the main orchestrator. Maintain NanoClaw's container isolation pattern — new features run on the host orchestrator, providing context to container agents.

---

## 2. File Manifest

### Create (in implementation order)

| File | Purpose | LOC Est |
|------|---------|---------|
| `src/telos.ts` | TELOS 10-file system loader | ~100 |
| `src/memory/index.ts` | Memory module barrel export | ~20 |
| `src/memory/file.ts` | MEMORY.md + daily notes | ~150 |
| `src/memory/vector.ts` | pgvector/FAISS integration | ~200 |
| `src/memory/graph.ts` | Entity extraction + relationships | ~250 |
| `src/memory/hybrid.ts` | Combined search orchestrator | ~100 |
| `src/signals.ts` | Rating + sentiment capture | ~200 |
| `src/steering.ts` | AI Steering Rules management | ~150 |
| `src/self-improvement/index.ts` | Self-improvement barrel | ~20 |
| `src/self-improvement/checkpoint.ts` | Ralph Wiggum loop | ~150 |
| `src/self-improvement/autoresearch.ts` | Overnight experiments | ~250 |
| `src/self-improvement/godel.ts` | Verified self-modification | ~200 |
| `TELOS/MISSION.md` | Template: life mission | ~10 |
| `TELOS/GOALS.md` | Template: active goals | ~10 |
| `TELOS/BELIEFS.md` | Template: core beliefs | ~10 |
| `TELOS/MODELS.md` | Template: mental models | ~10 |
| `TELOS/STRATEGIES.md` | Template: approaches | ~10 |
| `TELOS/PROJECTS.md` | Template: initiatives | ~10 |
| `TELOS/NARRATIVES.md` | Template: stories | ~10 |
| `TELOS/LEARNED.md` | Template: lessons | ~10 |
| `TELOS/CHALLENGES.md` | Template: obstacles | ~10 |
| `TELOS/IDEAS.md` | Template: future ideas | ~10 |
| `tests/telos.test.ts` | TELOS unit tests | ~100 |
| `tests/signals.test.ts` | Signal capture tests | ~150 |
| `tests/memory.test.ts` | Memory integration tests | ~200 |
| `tests/self-improvement.test.ts` | Self-improvement tests | ~200 |

### Modify

| File | Changes |
|------|---------|
| `src/index.ts` | Add TELOS/memory/signals initialization |
| `src/container-runner.ts` | Mount TELOS + memory to containers |
| `src/db.ts` | Add signals + embeddings tables |
| `src/types.ts` | Add new type definitions |
| `package.json` | Add pgvector, better-sqlite3-vec deps |

---

## 3. Directory Structure

```
nanoclaw-pai/
├── src/
│   ├── index.ts              # Modified: orchestrator
│   ├── telos.ts              # New: TELOS system
│   ├── signals.ts            # New: rating/sentiment
│   ├── steering.ts           # New: AI steering rules
│   ├── memory/
│   │   ├── index.ts          # Barrel export
│   │   ├── file.ts           # File-based memory
│   │   ├── vector.ts         # Vector memory
│   │   ├── graph.ts          # Graph memory
│   │   └── hybrid.ts         # Combined search
│   ├── self-improvement/
│   │   ├── index.ts          # Barrel export
│   │   ├── checkpoint.ts     # Ralph Wiggum
│   │   ├── autoresearch.ts   # Overnight experiments
│   │   └── godel.ts          # Verified self-mod
│   └── ... (existing)
├── TELOS/                    # New: goal system
│   ├── MISSION.md
│   ├── GOALS.md
│   └── ... (10 files)
├── data/
│   ├── memory/               # New: memory storage
│   │   ├── MEMORY.md
│   │   └── YYYY-MM-DD.md
│   ├── signals/              # New: signal storage
│   │   └── signals.jsonl
│   └── checkpoints/          # New: checkpoint storage
├── tests/
│   ├── telos.test.ts
│   ├── signals.test.ts
│   ├── memory.test.ts
│   └── self-improvement.test.ts
└── ... (existing)
```

---

## 4. Interfaces

### TELOS System (`src/telos.ts`)

```typescript
interface TelosFile {
  name: string;
  path: string;
  content: string;
  lastModified: Date;
}

interface TelosContext {
  mission: string;
  goals: string[];
  beliefs: string[];
  // ... other fields
}

// Functions
loadTelos(): TelosContext
getTelsoFile(name: string): TelosFile | null
updateTelosFile(name: string, content: string): void
formatTelosForContext(): string  // For container injection
```

### Memory System (`src/memory/`)

```typescript
// file.ts
interface MemoryEntry {
  id: string;
  content: string;
  source: 'memory.md' | 'daily' | 'session';
  timestamp: Date;
  metadata?: Record<string, any>;
}

loadMemory(): MemoryEntry[]
addMemoryEntry(content: string, source: string): void
searchMemory(query: string, limit?: number): MemoryEntry[]
createDailyNote(): string  // Returns path

// vector.ts
interface VectorStore {
  add(entries: MemoryEntry[]): Promise<void>;
  search(query: string, topK: number): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
}

interface SearchResult {
  entry: MemoryEntry;
  score: number;
}

createVectorStore(dbPath: string): VectorStore

// graph.ts
interface Entity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
}

interface Relationship {
  from: string;
  to: string;
  type: string;
}

extractEntities(text: string): Entity[]
extractRelationships(text: string, entities: Entity[]): Relationship[]
queryGraph(start: string, pattern: string, maxHops: number): Entity[]

// hybrid.ts
interface HybridSearchResult {
  entry: MemoryEntry;
  keywordScore: number;
  semanticScore: number;
  combinedScore: number;
}

hybridSearch(query: string, options?: SearchOptions): HybridSearchResult[]
```

### Signals System (`src/signals.ts`)

```typescript
interface Signal {
  id: string;
  type: 'rating' | 'sentiment';
  value: number | string;
  confidence?: number;
  context: ConversationContext;
  timestamp: Date;
}

interface ConversationContext {
  messages: Message[];
  groupFolder: string;
  sessionId: string;
}

// Functions
parseRating(text: string): { rating: number; comment: string } | null
analyzeSentiment(text: string): { sentiment: string; confidence: number }
captureSignal(message: Message, context: ConversationContext): Signal | null
getSignalHistory(groupFolder: string, since?: Date): Signal[]

// Rating pattern: /^(\d+)\s*[-:–—]?\s*(.*)$/
// Must NOT match: /^\d+\s+(items?|things?|files?|tasks?)/i
```

### Steering System (`src/steering.ts`)

```typescript
interface SteeringRule {
  id: string;
  condition: string;
  action: string;
  source: 'failure' | 'manual';
  status: 'proposed' | 'approved' | 'rejected' | 'active';
  createdAt: Date;
  approvedAt?: Date;
}

proposeRule(failure: Signal): SteeringRule
approveRule(ruleId: string): void
rejectRule(ruleId: string): void
getActiveRules(): SteeringRule[]
formatRulesForContext(): string  // For container injection
```

### Self-Improvement (`src/self-improvement/`)

```typescript
// checkpoint.ts
interface Checkpoint {
  id: string;
  groupFolder: string;
  state: CheckpointState;
  timestamp: Date;
}

interface CheckpointState {
  iscStatus: Record<string, 'pass' | 'fail' | 'pending'>;
  decisions: string[];
  context: string;
  artifacts: string[];
}

createCheckpoint(groupFolder: string): Checkpoint
loadCheckpoint(checkpointId: string): Checkpoint
resumeFromCheckpoint(checkpointId: string): void
getContextUsage(): number  // 0-100%

// autoresearch.ts
interface Experiment {
  id: string;
  modification: string;
  baselineScore: number;
  newScore?: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'discarded';
  startedAt: Date;
  completedAt?: Date;
}

interface AutoresearchConfig {
  maxIterations: number;
  timeoutMinutes: number;
  metric: () => Promise<number>;
}

runAutoresearch(config: AutoresearchConfig): Promise<Experiment[]>
getExperimentLog(): Experiment[]

// godel.ts
interface Modification {
  id: string;
  type: 'steering' | 'prompt' | 'config';
  diff: string;
  rationale: string;
  baselineScore: number;
  verifiedScore?: number;
  status: 'proposed' | 'verified' | 'applied' | 'rejected' | 'rolledback';
}

proposeModification(type: string, diff: string, rationale: string): Modification
verifyModification(modId: string, testSuite: () => Promise<number>): boolean
applyModification(modId: string): void
rollbackModification(modId: string): void
getModificationHistory(): Modification[]
```

---

## 5. Data Flow

### Context Priming Flow
```
Session Start
    │
    ▼
loadTelos() ─────────────────┐
    │                        │
    ▼                        │
loadMemory() ────────────────┤
    │                        │
    ▼                        │
getActiveRules() ────────────┤
    │                        │
    ▼                        │
formatContextForContainer() ◀┘
    │
    ▼
Mount to /workspace/context/
    │
    ▼
Container Agent Starts
```

### Signal Capture Flow
```
Message Received
    │
    ▼
parseRating(text) ──────────┬──▶ rating found
    │                       │        │
    │ no rating             │        ▼
    ▼                       │   captureSignal()
analyzeSentiment(text)      │        │
    │                       │        ▼
    ▼                       │   if rating < 4:
sentiment result            │     proposeRule()
    │                       │
    ▼                       │
store in signals table ◀────┘
```

### Self-Improvement Flow
```
Context at 70%
    │
    ▼
Warn User
    │
    ▼
/checkpoint command
    │
    ▼
createCheckpoint() ──▶ Save state to disk
    │
    ▼
Clear context / New session
    │
    ▼
/resume command
    │
    ▼
loadCheckpoint() ──▶ Restore state
    │
    ▼
Continue work
```

---

## 6. Database Schema Additions

```sql
-- Signals table
CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,  -- 'rating' | 'sentiment'
  value TEXT NOT NULL,
  confidence REAL,
  context_json TEXT,
  group_folder TEXT,
  session_id TEXT,
  timestamp TEXT NOT NULL
);

-- Steering rules table
CREATE TABLE steering_rules (
  id TEXT PRIMARY KEY,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  source TEXT NOT NULL,  -- 'failure' | 'manual'
  status TEXT NOT NULL,  -- 'proposed' | 'approved' | 'rejected' | 'active'
  created_at TEXT NOT NULL,
  approved_at TEXT
);

-- Embeddings table (for vector search)
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  vector BLOB NOT NULL,  -- float32 array
  created_at TEXT NOT NULL,
  FOREIGN KEY (memory_id) REFERENCES memory_entries(id)
);

-- Entities table (for graph memory)
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  properties_json TEXT
);

-- Relationships table
CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL,
  FOREIGN KEY (from_id) REFERENCES entities(id),
  FOREIGN KEY (to_id) REFERENCES entities(id)
);

-- Checkpoints table
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  group_folder TEXT NOT NULL,
  state_json TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

-- Modifications table (Gödel loop)
CREATE TABLE modifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  diff TEXT NOT NULL,
  rationale TEXT NOT NULL,
  baseline_score REAL,
  verified_score REAL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

---

## 7. Integration Points

### Orchestrator Integration (`src/index.ts`)

```typescript
// Add to main()
async function main(): Promise<void> {
  // Existing init...
  
  // NEW: Initialize PAI systems
  const telos = loadTelos();
  const memory = await initMemory();
  const signals = initSignalCapture();
  const steering = loadSteeringRules();
  
  // NEW: Monitor context usage
  startContextMonitor(onContextWarning);
  
  // Existing message loop with signal capture hook
  // ...
}
```

### Container Runner Integration

```typescript
// Add to runContainerAgent()
const contextDir = await prepareContextDir({
  telos: formatTelosForContext(),
  memory: getRecentMemory(100),
  steering: formatRulesForContext(),
});

// Mount to container
mounts.push({ host: contextDir, container: '/workspace/context' });
```

---

## 8. ISC Traceability

| ISC | Component | File |
|-----|-----------|------|
| ISC-F1 | Container isolation | `container-runner.ts` (existing) |
| ISC-F2 | TELOS files | `TELOS/*.md` |
| ISC-F3 | Context priming | `src/telos.ts` → `src/index.ts` |
| ISC-F4 | Memory persistence | `src/memory/file.ts` |
| ISC-F5 | Daily notes | `src/memory/file.ts` |
| ISC-F6 | Rating capture | `src/signals.ts` |
| ISC-F7 | Failure capture | `src/signals.ts` |
| ISC-F9 | Embeddings | `src/memory/vector.ts` |
| ISC-F10 | Semantic search | `src/memory/vector.ts` |
| ISC-F11 | Entity extraction | `src/memory/graph.ts` |
| ISC-F13 | Checkpoint | `src/self-improvement/checkpoint.ts` |
| ISC-F15 | Autoresearch | `src/self-improvement/autoresearch.ts` |
| ISC-T11 | Verification gate | `src/self-improvement/godel.ts` |
| ISC-A1 | False positive prevention | `src/signals.ts` (regex) |

---

## 9. Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Vector search latency | Use FAISS for in-memory, pgvector for persistence |
| Entity extraction accuracy | Use LLM for extraction, not regex |
| Self-modification instability | Verification gate + auto-rollback |
| Context overflow | Monitor at 70%, checkpoint at 80% |
| Container mount complexity | Single context dir with structured files |

---

## 10. Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "better-sqlite3-vec": "^0.1.0",  // Vector extension for SQLite
    "faiss-node": "^0.5.0",          // FAISS bindings (optional)
    "natural": "^7.0.0"              // NLP for sentiment
  }
}
```

### Internal Dependencies

```
index.ts
    ├── telos.ts
    ├── signals.ts
    │   └── steering.ts
    ├── memory/
    │   ├── file.ts
    │   ├── vector.ts
    │   ├── graph.ts
    │   └── hybrid.ts
    └── self-improvement/
        ├── checkpoint.ts
        ├── autoresearch.ts
        └── godel.ts
```

---

## Quality Gate

- [x] Approach clearly stated
- [x] All files listed with purpose
- [x] Implementation order defined
- [x] Key interfaces designed (types, not implementations)
- [x] Risks identified with mitigations
- [x] Design satisfies all ISC (traced)
- [x] Database schema defined
- [x] Integration points documented

---

**Handoff:** → bmad-implement (Phase 1 first)

**Pass forward:**
- File manifest in order
- Interface definitions
- Database schema
- Integration points
