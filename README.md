# AI-DLC Skills Slim

A slim, runtime-agnostic adaptation of AWS AI-DLC v1 for structured AI-assisted software development.

This fork keeps the useful lifecycle discipline from `qtalen/aidlc-skills` while removing overlapping stages, verbose ceremony, duplicate state, and runtime-specific orchestration assumptions.

## Core lifecycle

```text
Preflight (automatic)
  ↓
Requirements
  ↓
Design (only when required)
  ↓
Plan
  ↓
Planning Gate (when required)
  ↓
Implementation
  ↓
Independent Review (when required)
  ↓
Verification
  ↓
Final Acceptance (when required)
  ↓
Complete
```

The workflow adapts through explicit persisted routing decisions rather than repeatedly re-inferring the process.

## Responsibility split

AI-DLC Slim owns:

- lifecycle stages;
- workflow state;
- approval semantics;
- project/change artifacts;
- completion requirements;
- verification expectations.

The currently active agent/runtime owns:

- execution strategy;
- delegation and parallelism;
- model/provider selection;
- tool/MCP selection;
- specialist routing.

The Skill never hardcodes OMO Slim or any other orchestration framework. OMO can remain the active orchestrator without AI-DLC depending on it.

## Deterministic state contract

The only workflow cursor is:

```text
aidlc-docs/aidlc-state.json
```

Its canonical schema lives at:

```text
.agents/skills/aidlc-workflows/schemas/aidlc-state.schema.json
```

Preflight persists these workflow decisions once:

- `design_required`
- `planning_gate_required`
- `review_required`
- `final_acceptance_required`
- `security_required`

The machine contract is split into:

- `references/state.md` — state ownership and JSON model;
- `references/transition-contract.md` — legal events/transitions and risk invariants;
- `references/completion-predicates.md` — minimum completion requirements;
- `references/engine-contract.md` — boundary for the future deterministic engine.

This lets a future state machine own bookkeeping while the LLM remains responsible for semantic judgment.

## Approval semantics

At a planning gate:

```text
approve
→ approve-and-hold
→ do not implement

continue / proceed
→ approve-and-continue
→ enter Implementation
```

Ambiguous approval defaults to hold.

## Project context

Durable project knowledge belongs under:

```text
aidlc-docs/project/
├── brief.md
├── architecture.md
├── tech-stack.md
├── testing.md
└── decisions/
```

Per-change artifacts belong under:

```text
aidlc-docs/changes/<date>-<slug>/
├── request.md
├── requirements.md
├── design.md        # only when required
├── plan.md
├── review.md        # only when required
├── verification.md
└── audit.md
```

`AGENTS.md` should remain a thin index to these files and contain only non-obvious project-wide constraints or gotchas.

## Risk profiles

- **Low** — isolated and reversible. Usually Requirements → Plan → Implement → Verify.
- **Standard** — broader/user-visible/API/data impact. Planning gate and final acceptance are required; Design and Review are explicit decisions.
- **High** — auth, sensitive data, migrations, public contracts, infrastructure, architecture boundaries, difficult rollback, or production-critical work. Design, planning gate, independent review, and final acceptance are required.

Security is automatic whenever security triggers apply; it is not an opt-in extension.

## Verification

Completion is evidence-based. Verification maps acceptance criteria to actual outcomes and records commands/actions performed.

Unchecked behavior is reported as `NOT VERIFIED`, not assumed to work. Tests/checks must not be weakened merely to obtain a passing result without explicit user authorization.

## Installation

Copy `.agents` into the project root, or install the skill in the user-level agent skills location supported by your coding environment.

Templates for a thin `AGENTS.md` and durable project baseline are under:

```text
.agents/skills/aidlc-workflows/templates/
```

## State-machine roadmap

The workflow contract is intentionally frozen before engine implementation.

The first deterministic engine should stay small and expose only:

```text
init
next
report <event>
approve
continue
request-changes
block / unblock
status
```

`next` and `status` are read-only. Mutations must validate the current state, event legality, completion predicates, next-state schema, and workflow invariants before writing atomically.

Artifact hashing, review freshness, source fingerprints, evidence receipts, and downstream staleness propagation are deferred to v0.2.

## Attribution

This project is based on `qtalen/aidlc-skills`, an MIT-licensed Skill-form adaptation of AWS AI-DLC v1. Selected context-organization ideas were also informed by `KhazP/vibe-coding-prompt-template`.

See `ATTRIBUTION.md` and `LICENSE` for details.
