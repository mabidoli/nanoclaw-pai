# Feature: nanoclaw-pai

**Personal AI Infrastructure built on NanoClaw**

## Ambiguity Assessment

**Request:** "Build a personal AI harness on NanoClaw with TELOS, signal capture, memory enhancement, and self-improvement capabilities based on harness engineering research"

**Score: 2/10**

| Factor | Assessment |
|--------|------------|
| Success criteria | ✅ Clear — 56 ISCs already defined |
| Scope boundaries | ✅ Defined — 4 phases with explicit boundaries |
| User story | ✅ Specific — Personal AI augmentation |
| Technical constraints | ✅ Specified — NanoClaw base, Docker, TypeScript |
| Edge cases | ✅ Discussed — Security, rollback, false positives |

**Verdict:** ✅ PROCEED

---

## Problem Statement

Power users who want personal AI assistants face a dilemma: existing solutions like OpenClaw are too complex (~500K LOC) to understand or customize, while minimal solutions lack memory, learning, and self-improvement capabilities. Users need a compact, auditable AI harness that remembers context, learns from feedback, and improves over time while maintaining security through container isolation.

This matters because effective AI augmentation requires trust (understand the code), persistence (remember across sessions), and evolution (get better over time).

## User Stories

- As a power user, I want my AI to remember my goals and decisions so that I don't re-explain context every session
- As a researcher, I want autonomous experimentation overnight so that I make progress while sleeping
- As a developer, I want to understand the entire codebase so that I can customize without fear of breaking things
- As a security-conscious user, I want container isolation so that agent actions can't compromise my host system
- As a continuous learner, I want my AI to learn from my feedback so that mistakes aren't repeated

## Proto-ISC (Summary — Full 56 ISCs in success-criteria.md)

### Core System
- [ ] Agent processes execute inside isolated Docker containers only
- [ ] TELOS directory contains all ten canonical files present
- [ ] MEMORY.md persists across session restarts without data loss
- [ ] Memory search returns relevant snippets within 200ms

### Signal Capture
- [ ] Explicit ratings (1-10) captured and stored within one turn
- [ ] Low ratings (1-3) trigger automatic failure context capture
- [ ] No false positives on numeric inputs like "3 items"

### Memory Enhancement
- [ ] Semantic search returns top-k relevant memories in 50ms
- [ ] Entities extracted from conversations with relationship types
- [ ] Multi-hop queries traverse up to 3 relationship hops

### Self-Improvement
- [ ] Checkpoint command saves current progress to persistent file
- [ ] Autonomous experiments run without human intervention overnight
- [ ] Self-modification proposals require verification pass first
- [ ] Failed modifications automatically rollback without corruption

### Security
- [ ] Untrusted content wrapped with security markers automatically
- [ ] Outbound requests require explicit user approval first

## Scope

### In (Phase 1 — Core)
- Fork NanoClaw as base
- Add TELOS 10-file system
- Implement MEMORY.md + daily notes pattern
- Signal capture for explicit ratings
- Context priming at session start

### In (Phase 2 — Signals)
- Implicit sentiment detection
- AI Steering Rules generation from failures
- Human approval workflow for rule activation

### In (Phase 3 — Memory)
- Vector memory (pgvector/FAISS)
- Hybrid search (keyword + semantic)
- Graph memory (entity extraction)
- Multi-hop relationship queries

### In (Phase 4 — Self-Improvement)
- Ralph Wiggum Loop (checkpoint/resume)
- Autoresearch mode (overnight experiments)
- Gödel Loop (verified self-modification)
- Automatic rollback on regression

### Out (Explicitly NOT building)
- GUI/web interface (CLI and channels only)
- Multi-user support (single user focus)
- Cloud hosting (local-first)
- Voice interface (text only for v1)
- Custom model training (use existing models)
- Real-time collaboration features

## Codebase Hints

> For bmad-prime context loading

- **Base repository:** https://github.com/qwibitai/nanoclaw
- **Key files to study:**
  - `src/index.ts` — Orchestrator
  - `src/container-runner.ts` — Docker isolation
  - `src/db.ts` — SQLite operations
  - `groups/*/CLAUDE.md` — Per-group memory
- **Stack:** TypeScript, Node.js 20+, Docker, SQLite
- **Patterns to adopt from PAI:**
  - Signal capture (ratings.jsonl)
  - TELOS 10-file structure
  - Algorithm versioning
  - Context priming pipeline
- **Research references:**
  - `research/harness-engineering-agentic-systems-2026.md`
  - `research/pai-vs-harness-research-comparison.md`
  - `research/pai-system-success-criteria.md`

## Dependencies

| Dependency | Purpose | Version |
|------------|---------|---------|
| NanoClaw | Base framework | Latest |
| Docker | Container isolation | 24+ |
| Node.js | Runtime | 20+ |
| SQLite | Message/state storage | 3.x |
| pgvector/FAISS | Vector memory | TBD |
| mem0 (optional) | Memory module | 1.x |

## Open Questions

> None blocking — research phase complete

- ~~Which compact framework to use?~~ → NanoClaw selected
- ~~Extend PAI or build new?~~ → Hybrid (concepts on new base)
- ~~What memory architecture?~~ → File + Vector + Graph hybrid

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| NanoClaw breaking changes | Medium | High | Pin version, fork not track |
| Vector search latency | Low | Medium | Benchmark early, FAISS fallback |
| Self-modification instability | Medium | High | Verification gate + auto-rollback |
| Container overhead | Low | Low | Apple Container on macOS |

## Recommended BMAD Path

- [x] Complex (prime → plan → architect → implement → validate → review)

**Rationale:** Multi-phase project with novel self-improvement features requires full BMAD rigor.

## Phase Milestones

| Phase | Duration | Success Gate |
|-------|----------|--------------|
| Phase 1: Core | 2 weeks | ISC-1 through ISC-4 pass (16 criteria) |
| Phase 2: Signals | 1 week | ISC-5 through ISC-7 pass (12 criteria) |
| Phase 3: Memory | 2 weeks | ISC-8 through ISC-9 pass (8 criteria) |
| Phase 4: Self-Improvement | 3 weeks | ISC-10 through ISC-14 pass (20 criteria) |

**Total estimated duration:** 8 weeks

---

**Ready for BMAD:** [x] Yes  
**Created:** 2026-03-20  
**References:**
- `research/pai-system-success-criteria.md` (56 ISCs, 49 Gherkin, 63 DeepEval)
- `research/harness-engineering-agentic-systems-2026.md` (full research)
- `research/pai-vs-harness-research-comparison.md` (gap analysis)
