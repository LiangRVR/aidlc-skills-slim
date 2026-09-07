# Context Checkpointing Rules

## Overview

These context checkpointing (CTX) rules are cross-cutting constraints that prevent context rot in long-running AI-DLC projects. They replace full-history reloading with a **checkpoint-first, on-demand-fallback** context strategy: each phase distills its durable outcomes into a small checkpoint file, and session resumption loads only what is needed.

This file has a companion `checkpointing.opt-in.md`. The full rules are loaded only after the user opts in. Before enforcing, check the extension's `Enabled` status in `aidlc-docs/aidlc-state.md` under `## Extension Configuration`; when disabled, all CTX rules are N/A.

**Enforcement**: At each applicable point (see Enforcement Integration), verify compliance BEFORE presenting the stage completion message, and include CTX rules in the compliance summary (compliant / non-compliant / N/A per rule). Blocking finding behavior follows the generic protocol in `../../workflow/workflow-conventions/workflow-conventions.md` (list finding with rule ID, withhold "Continue to Next Stage", log in audit.md). All rules are **blocking** by default; N/A with rationale is not a finding.

---

## Rule CTX-01: Phase Checkpoints

**Rule**: A checkpoint file MUST be written at each of these points:
1. **End of INCEPTION phase** (after Workflow Planning approval, or after the last executed inception stage) → `aidlc-docs/checkpoints/inception-checkpoint.md`
2. **Completion of each unit** in CONSTRUCTION (after that unit's Code Generation stage) → `aidlc-docs/checkpoints/unit-{unit-name}-checkpoint.md`
3. **Build and Test completion** → `aidlc-docs/checkpoints/construction-checkpoint.md`

Each checkpoint MUST be **≤200 lines** and contain exactly these sections:

```markdown
# Checkpoint: [name]
**Timestamp**: [ISO 8601]
## Key Decisions          # durable decisions with rationale (bullet points)
## Artifact Inventory     # paths of artifacts produced, one line each
## Core Constraints       # invariants downstream stages MUST NOT violate (enums, signatures, ranges, architectural commitments)
## Open Items             # unfinished work, deferred questions, known gaps
```

- A checkpoint captures **durable outcomes**, not narrative history — no conversation transcripts, no full requirement texts (reference artifact paths instead).
- Rewriting a same-named checkpoint on re-execution of a stage is allowed (checkpoints are current state, not historical records per DOC-04); superseded information is preserved in audit.md and the underlying artifacts.
- Checkpoints are **maintained artifacts within DOC-01 sweep scope**: when an approved change makes any checkpoint content stale (e.g., a Core Constraints enum, signature, or range), the affected checkpoint MUST be updated in place in the same interaction as the change. This in-place update is not a DOC-04 violation — checkpoints are current state, not historical records.

**Verification**: checkpoint exists at each required point, is ≤200 lines, has all four sections, and references artifact paths rather than duplicating their content; DOC-01 sweeps update stale checkpoint content in place (no superseded values left in Core Constraints after an approved change).

---

## Rule CTX-02: Checkpoint-First Session Resumption (Overrides session-continuity.md loading)

**Load guarantee**: the companion `checkpointing.opt-in.md` stub is always loaded at workflow start and contains a Session Resumption Trigger — when this extension is Enabled in `aidlc-state.md`, this rules file is loaded BEFORE session-continuity.md's loading steps are applied, so this override is in context at the moment resumption decisions are made.

**Rule**: When this extension is enabled, session resumption MUST use checkpoint-first loading — this **overrides** the full-artifact loading prescribed in `references/common/session-continuity.md` for its stated scope (the same override convention as Autonomous Mode AM-03 overriding APG rules; enabled extension rules are hard constraints per SKILL.md Extensions Loading):

1. **Always load**: `aidlc-docs/aidlc-state.md`, the latest checkpoint file(s), and the artifacts of the stage being resumed.
2. **Load on demand only**: earlier-stage artifacts are loaded ONLY when (a) the latest checkpoint's Open Items or Core Constraints reference a gap/conflict that requires the source artifact, or (b) the user asks. The fallback load is scoped to the specific artifact needed, never "load ALL".
3. **Announce**: the welcome-back summary MUST state what was loaded (checkpoint-first) and what was deliberately not loaded.

When resuming a stage whose required input has **no checkpoint coverage** (e.g., project predates this extension), fall back to the standard session-continuity loading for that input and note the fallback in audit.md.

**Verification**: resumption loads ≤ the always-load set plus explicitly justified on-demand artifacts; no unconditional full-tree artifact loading; fallback cases logged.

---

## Rule CTX-03: Audit Log Folding

**Rule**: audit.md grows append-only and MUST be folded for reading:

1. **Phase summary entries**: at each checkpoint point (CTX-01), append one audit.md entry summarizing the phase/unit (stages executed, approvals received, blocking findings raised and resolved) — this is a normal append, never a rewrite (DOC-04).
2. **Read discipline**: on session resumption, do NOT read audit.md in full. Read only the most recent phase summary entry and entries newer than the latest checkpoint. Historical audit entries are read only when investigating a specific decision or dispute.

**Verification**: a summary entry exists for each checkpointed phase/unit; resumption does not perform full audit.md reads.

---

## Rule CTX-04: Stage Context Budget

**Rule**: At the start of every stage, the AI MUST declare the minimal context it loaded for that stage — as a short "Context loaded:" list (artifact paths) in the stage kickoff message or in the stage's audit.md entry. Load what the stage's own rule file requires, preferring checkpoint coverage (CTX-02) over source artifacts when resuming.

**Verification**: every stage start has a context-loaded declaration; the declared set contains no artifacts irrelevant to the stage.

---

## Enforcement Integration

| Context | Applicable Rules |
|---|---|
| End of INCEPTION phase | CTX-01, CTX-03 |
| Completion of each unit's Code Generation | CTX-01, CTX-03 |
| Build and Test completion | CTX-01, CTX-03 |
| Session resumption / welcome-back | CTX-02, CTX-03 |
| Every stage start | CTX-04 |
