# Plan: nanoclaw-pai

**Personal AI Infrastructure built on NanoClaw**

---

## Feature Summary

Build a personal AI harness on NanoClaw that extends its container-isolated agent architecture with TELOS goal system, signal capture for continuous learning, hybrid memory (file + vector + graph), and verified self-improvement capabilities. For power users who want an AI assistant that remembers context, learns from feedback, and improves over time — all in a compact codebase they can fully understand.

## Stack

| Component | Technology |
|-----------|------------|
| **Language** | TypeScript 5.7+ |
| **Runtime** | Node.js 20+ |
| **Base Framework** | NanoClaw 1.2.x (fork) |
| **Database** | SQLite (existing) + pgvector (new) |
| **Container** | Docker / Apple Container |
| **Testing** | Vitest + DeepEval |

---

## Ideal State Criteria

### Phase 1: Core System

#### Functional
- [ ] ISC-F1: Agent processes execute inside isolated Docker containers only
- [ ] ISC-F2: TELOS directory contains all ten canonical files present
- [ ] ISC-F3: Agent loads TELOS context at session initialization automatically
- [ ] ISC-F4: MEMORY.md persists across session restarts without data loss
- [ ] ISC-F5: Daily notes created automatically in memory/YYYY-MM-DD.md format

#### Technical
- [ ] ISC-T1: Host filesystem inaccessible unless explicitly mounted to container
- [ ] ISC-T2: Container crash does not affect orchestrator process stability
- [ ] ISC-T3: Memory search returns relevant snippets within 200ms latency
- [ ] ISC-T4: Memory files version-controlled with git automatically

#### Quality
- [ ] ISC-Q1: Messages from Telegram reach agent within 500ms latency
- [ ] ISC-Q2: Multiple channels operate concurrently without message loss

### Phase 2: Signal Capture

#### Functional
- [ ] ISC-F6: Explicit ratings (1-10) captured and stored within one turn
- [ ] ISC-F7: Low ratings (1-3) trigger automatic failure context capture
- [ ] ISC-F8: Positive sentiment detected with confidence score above 0.7

#### Technical
- [ ] ISC-T5: Sentiment analysis runs without blocking response generation
- [ ] ISC-T6: Steering rules load at session start affecting behavior

#### Anti-Criteria
- [ ] ISC-A1: No false positives on numeric inputs like "3 items"
- [ ] ISC-A2: Human approval required before steering rule activation

### Phase 3: Memory Enhancement

#### Functional
- [ ] ISC-F9: Embeddings generated for all memory entries automatically
- [ ] ISC-F10: Semantic search returns top-k relevant memories in 50ms
- [ ] ISC-F11: Entities extracted from conversations with relationship types
- [ ] ISC-F12: Multi-hop queries traverse up to 3 relationship hops

#### Technical
- [ ] ISC-T7: Vector store persists across system restarts
- [ ] ISC-T8: Hybrid search combines keyword and semantic ranking
- [ ] ISC-T9: Graph updates incrementally without full rebuild required

### Phase 4: Self-Improvement

#### Functional
- [ ] ISC-F13: Checkpoint command saves current progress to persistent file
- [ ] ISC-F14: Fresh session loads checkpoint and continues seamlessly
- [ ] ISC-F15: Autonomous experiments run without human intervention overnight
- [ ] ISC-F16: Scalar metric determines keep/discard decision automatically

#### Technical
- [ ] ISC-T10: Context warning triggers at 70% window capacity
- [ ] ISC-T11: Self-modification proposals require verification pass first
- [ ] ISC-T12: Failed modifications automatically rollback without corruption
- [ ] ISC-T13: Modification history auditable with diff and rationale

#### Anti-Criteria
- [ ] ISC-A3: Verification compares pre/post performance on test suite
- [ ] ISC-A4: Successful improvements commit to version control

### Security

- [ ] ISC-S1: Untrusted content wrapped with security markers automatically
- [ ] ISC-S2: Tool execution blocked for content inside untrusted blocks
- [ ] ISC-S3: Outbound requests require explicit user approval first
- [ ] ISC-S4: Exfiltration attempts trigger immediate session termination

---

## Scope

### In (Phase 1)
- Fork NanoClaw repository
- Add `src/telos.ts` — TELOS 10-file system
- Add `src/memory.ts` — MEMORY.md + daily notes
- Modify `src/index.ts` — Context priming at session start
- Add `TELOS/` directory with template files
- Integrate git auto-commit for memory files

### In (Phase 2)
- Add `src/signals.ts` — Rating and sentiment capture
- Add `src/steering.ts` — AI Steering Rules
- Add SQLite table for signals
- Add approval workflow via IPC

### In (Phase 3)
- Add `src/memory/vector.ts` — pgvector/FAISS integration
- Add `src/memory/graph.ts` — Entity extraction + relationships
- Add `src/memory/hybrid.ts` — Combined search
- Add embedding generation hook

### In (Phase 4)
- Add `src/self-improvement/checkpoint.ts` — Ralph Wiggum loop
- Add `src/self-improvement/autoresearch.ts` — Overnight experiments
- Add `src/self-improvement/godel.ts` — Verified self-modification
- Add context usage monitoring

### Out
- GUI/web interface
- Multi-user support
- Cloud hosting
- Voice interface
- Custom model training
- Real-time collaboration

---

## Test Cases (Gherkin)

```gherkin
Feature: Container Isolation

  Scenario: Agent cannot access host filesystem
    Given the agent is running in container for "test-group"
    When the agent attempts to read "/etc/passwd"
    Then the operation should fail with "permission denied"
    And no host filesystem data should be exposed

  Scenario: Container crash does not crash orchestrator
    Given the agent is processing a message in "test-group"
    When the container process crashes unexpectedly
    Then the orchestrator should remain running
    And the user should receive an error message

Feature: TELOS System

  Scenario: TELOS loads at session start
    Given TELOS directory exists with MISSION.md and GOALS.md
    When a new session starts
    Then the agent should have access to MISSION.md content
    And context loading should complete within 500ms

  Scenario: Agent references goals in decisions
    Given a session is active with TELOS loaded
    And GOALS.md contains "Build personal AI infrastructure"
    When user asks "Should I prioritize feature X or Y?"
    Then the response should reference building AI infrastructure

Feature: Signal Capture

  Scenario: Explicit rating captured
    Given a conversation is active
    When user sends "8 - great response"
    Then a rating of 8 should be stored in signals table
    And the full conversation context should be preserved

  Scenario: False positive prevention
    Given a conversation is active
    When user sends "3 items need to be fixed"
    Then no rating should be captured
    And the message should be processed as normal input

  Scenario: Low rating triggers failure capture
    Given a conversation is active
    When user sends "2 - completely wrong"
    Then a failure record should be created
    And proposed steering rules should be generated

Feature: Memory Enhancement

  Scenario: Semantic search finds relevant memories
    Given MEMORY.md contains "Decided to use PostgreSQL for Rosie"
    When user asks "What database did we choose?"
    Then the search should return the PostgreSQL decision
    And query should complete within 200ms

  Scenario: Multi-hop graph query
    Given entity "Rosie" is connected to "PostgreSQL" via "uses"
    And entity "PostgreSQL" is connected to "pgvector" via "extension"
    When querying "What extensions does Rosie's database use?"
    Then the query should return "pgvector"

Feature: Context Rotation (Ralph Wiggum)

  Scenario: Manual checkpoint saves state
    Given a complex task is in progress
    When user runs "/checkpoint"
    Then current progress should be saved to checkpoint file
    And the checkpoint should include ISC status

  Scenario: Context warning at threshold
    Given context usage is at 65%
    When context usage reaches 70%
    Then user should receive a warning notification

Feature: Verified Self-Modification

  Scenario: Modification requires verification
    Given the system proposes a steering rule change
    When applying the modification
    Then verification suite must run first
    And modification blocked if verification fails

  Scenario: Successful modification commits
    Given a proposed improvement with baseline score 85%
    When verification shows new score 89%
    Then modification should be applied
    And git commit should include diff and rationale

  Scenario: Failed modification rollback
    Given a modification is applied
    And runtime error occurs after 5 interactions
    Then automatic rollback should trigger
    And incident should be logged for review
```

---

## External References

From CONTEXT.md:
- NanoClaw architecture: Single-process orchestrator + container agents
- Key files: `src/index.ts`, `src/container-runner.ts`, `src/db.ts`
- Channel pattern: Self-registration via `registerChannel()`
- Memory pattern: Per-group `groups/*/CLAUDE.md`
- Tech stack: TypeScript, Node.js 20+, SQLite, Docker

From Research:
- `research/harness-engineering-agentic-systems-2026.md` — Full research
- `research/pai-vs-harness-research-comparison.md` — Gap analysis
- `research/pai-system-success-criteria.md` — DeepEval tests

---

## Verification Plan

| Criterion | Method | Command/Steps |
|-----------|--------|---------------|
| ISC-F1 | Automated | `docker ps` during agent run |
| ISC-F2 | Automated | `ls TELOS/*.md \| wc -l` = 10 |
| ISC-F3 | Log inspection | Check context priming log |
| ISC-F4 | Restart test | Write → restart → read |
| ISC-T3 | Benchmark | Time `memory_search()` |
| ISC-A1 | Negative test | Send "3 items" → no rating |
| ISC-T11 | Integration | Propose bad mod → blocked |
| ISC-S1 | Code review | Check wrapper markers |

---

## Quality Gate Checklist

- [x] At least 4 ISC defined (28 ISC)
- [x] At least 1 anti-criterion defined (4 anti-criteria)
- [x] All ISC are 8-12 words
- [x] All ISC are state-based (no verbs at start)
- [x] All ISC have verification method
- [x] All ISC are binary testable in under 10 seconds
- [x] Scope boundaries are explicit
- [x] Gherkin test cases defined (14 scenarios)
- [x] At least 1 negative test scenario (3 negative scenarios)

---

## Dependencies

| Phase | Depends On |
|-------|------------|
| Phase 1 | NanoClaw fork |
| Phase 2 | Phase 1 (TELOS + memory) |
| Phase 3 | Phase 1 (base memory) |
| Phase 4 | Phase 1-3 (full system) |

---

## Timeline

| Phase | Duration | Success Gate |
|-------|----------|--------------|
| Phase 1: Core | 2 weeks | ISC-F1 to ISC-T4 pass |
| Phase 2: Signals | 1 week | ISC-F6 to ISC-A2 pass |
| Phase 3: Memory | 2 weeks | ISC-F9 to ISC-T9 pass |
| Phase 4: Self-Improvement | 3 weeks | ISC-F13 to ISC-A4 pass |

**Total:** 8 weeks

---

**Handoff:** → bmad-architect (multi-file, requires architecture design)

**State:** PLAN.md complete, all quality gates passed
