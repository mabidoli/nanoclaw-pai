# Codebase Context: NanoClaw

**Feature:** nanoclaw-pai  
**Primed:** 2026-03-20  
**Source:** https://github.com/qwibitai/nanoclaw

---

## 1. Overview

- **Purpose:** Lightweight personal Claude assistant with container isolation, multi-channel messaging, persistent memory, and scheduled tasks
- **Type:** CLI Agent Framework
- **Version:** 1.2.19
- **Philosophy:** Fork & customize, skills over features, AI-native (no config files)

## 2. Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Language** | TypeScript | 5.7.0 |
| **Runtime** | Node.js | 20+ |
| **Database** | SQLite (better-sqlite3) | 11.8.1 |
| **Container** | Docker / Apple Container | — |
| **Agent SDK** | @anthropic-ai/claude-agent-sdk | 0.2.29 |
| **Validation** | Zod | 4.3.6 |
| **Logging** | Pino | 9.6.0 |
| **Testing** | Vitest | 4.0.18 |

**Minimal dependencies:** 6 runtime deps, ~10 source files

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HOST (macOS / Linux)                           │
│                     (Single Node.js Process)                          │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐       ┌────────────────────┐                   │
│  │ Channels         │──────▶│   SQLite Database  │                   │
│  │ (self-register)  │◀──────│   (messages.db)    │                   │
│  └──────────────────┘       └─────────┬──────────┘                   │
│         │                             │                              │
│         ▼                             ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  Message Loop    │    │  Scheduler Loop  │    │  IPC Watcher  │  │
│  │  (polls SQLite)  │    │  (checks tasks)  │    │  (file-based) │  │
│  └────────┬─────────┘    └────────┬─────────┘    └───────────────┘  │
│           └───────────┬───────────┘                                  │
│                       │ spawns container                             │
│                       ▼                                              │
├──────────────────────────────────────────────────────────────────────┤
│                     CONTAINER (Linux VM)                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Working dir: /workspace/group (mounted from host)            │   │
│  │  Mounts: groups/{name}/, data/sessions/, extra dirs           │   │
│  │  Tools: Bash, Read/Write/Edit, WebSearch, MCP servers         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**Pattern:** Single-process orchestrator with container-isolated agent execution

## 4. Key Components

| File | Purpose | LOC (est) |
|------|---------|-----------|
| `src/index.ts` | **Orchestrator** — state, message loop, agent invocation | ~400 |
| `src/container-runner.ts` | Spawns streaming agent containers | ~300 |
| `src/channels/registry.ts` | Channel factory registry (self-registration pattern) | ~50 |
| `src/db.ts` | SQLite operations (messages, groups, sessions, state) | ~200 |
| `src/router.ts` | Message formatting, outbound routing | ~100 |
| `src/group-queue.ts` | Per-group queue with concurrency limit | ~150 |
| `src/ipc.ts` | IPC watcher and task processing | ~100 |
| `src/task-scheduler.ts` | Runs scheduled tasks | ~150 |
| `src/config.ts` | Configuration constants | ~50 |
| `src/types.ts` | TypeScript interfaces | ~100 |

**Total:** ~1,600 LOC (estimated)

## 5. Key Patterns

### 5.1 Channel Self-Registration

```typescript
// Each channel registers at module load
registerChannel('telegram', (opts: ChannelOpts) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  return new TelegramChannel(opts);
});

// Barrel import triggers registration
import './whatsapp.js';
import './telegram.js';
```

### 5.2 Container Isolation

```typescript
// Agent runs in isolated container with mounted workspace
const output = await runContainerAgent(group, {
  prompt,
  sessionId,
  groupFolder: group.folder,
  isMain,
});
```

### 5.3 Per-Group Memory

```
groups/
├── main/
│   └── CLAUDE.md          # Main channel memory
├── family-chat/
│   └── CLAUDE.md          # Family group memory
└── work-team/
    └── CLAUDE.md          # Work group memory
```

### 5.4 Message Flow

1. Channel receives message → stores in SQLite
2. Message loop polls SQLite for new messages
3. Group queue manages concurrency (one container per group)
4. Container spawns with mounted workspace
5. Agent processes, outputs stream back
6. Router sends response to originating channel

## 6. Conventions

| Aspect | Convention |
|--------|------------|
| **Naming** | camelCase (functions), PascalCase (types) |
| **Testing** | Vitest, `*.test.ts` files |
| **Formatting** | Prettier |
| **Logging** | Pino with structured JSON |
| **Imports** | ES modules (.js extensions) |
| **Config** | Environment variables, NO config files |
| **Types** | Zod schemas for validation |

## 7. Entry Points

| Entry | Purpose |
|-------|---------|
| `src/index.ts` | Main process — starts channels, loops, scheduler |
| `npm run dev` | Development with tsx |
| `npm run start` | Production build |
| `npm run setup` | Interactive setup wizard |

## 8. Extension Points

### Where to Add TELOS System
- **Location:** New `src/telos.ts` module
- **Integration:** Load at startup in `main()`, inject into container mounts
- **Pattern:** Similar to existing `groups/*/CLAUDE.md` but global

### Where to Add Signal Capture
- **Location:** New `src/signals.ts` module
- **Integration:** Hook into message processing in `processGroupMessages()`
- **Storage:** New SQLite table or JSONL file

### Where to Add Memory Enhancement
- **Location:** New `src/memory/` directory
- **Modules:** `vector.ts`, `graph.ts`, `hybrid.ts`
- **Integration:** Query during context priming before container spawn

### Where to Add Self-Improvement
- **Location:** New `src/self-improvement/` directory
- **Modules:** `checkpoint.ts`, `autoresearch.ts`, `godel.ts`
- **Integration:** IPC commands, scheduled tasks

## 9. Database Schema (Inferred)

```sql
-- Messages table
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  chat_jid TEXT,
  sender TEXT,
  content TEXT,
  timestamp TEXT,
  is_from_me BOOLEAN
);

-- Groups table
CREATE TABLE registered_groups (
  jid TEXT PRIMARY KEY,
  name TEXT,
  folder TEXT,
  is_main BOOLEAN,
  requires_trigger BOOLEAN
);

-- Sessions table
CREATE TABLE sessions (
  folder TEXT PRIMARY KEY,
  session_id TEXT
);

-- Tasks table (scheduler)
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  group_folder TEXT,
  prompt TEXT,
  schedule_type TEXT,
  schedule_value TEXT,
  status TEXT,
  next_run TEXT
);

-- Router state
CREATE TABLE router_state (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

## 10. Security Model

1. **Container Isolation** — Agents run in Linux containers, not host process
2. **Filesystem Isolation** — Only mounted directories visible to agent
3. **Credential Proxy** — API keys routed through proxy, never exposed to container
4. **Sender Allowlist** — Control who can trigger the agent in groups

## 11. Gaps for PAI Enhancement

| Current State | Gap | Extension Needed |
|---------------|-----|------------------|
| Per-group CLAUDE.md | No global memory | Add MEMORY.md + daily notes |
| No goal system | No purpose alignment | Add TELOS 10-file system |
| No feedback capture | Can't learn from mistakes | Add signal capture |
| File-only memory | No semantic search | Add vector memory |
| No self-modification | Static behavior | Add Gödel loop |
| No context rotation | Long tasks degrade | Add Ralph Wiggum loop |

---

## Quality Gate

- [x] Purpose is clear (lightweight personal AI with container isolation)
- [x] Tech stack identified (TypeScript, Node.js 20+, SQLite, Docker)
- [x] Architecture pattern recognized (single-process orchestrator + container agents)
- [x] Key components listed with purposes (~10 files, ~1,600 LOC)
- [x] Entry points documented (src/index.ts, npm scripts)
- [x] Extension points identified for PAI features

---

## Handoff

**Next step:** bmad-plan (ISC already defined in success-criteria.md, need PLAN.md)

**State:** CONTEXT.md complete, proceed to planning phase
