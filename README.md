# AI-DLC Skills Slim

A slim, runtime-agnostic adaptation of AWS AI-DLC v1 for structured AI-assisted software development, with a deterministic state engine.

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

Workflow routing is decided once during Preflight and persisted. The deterministic engine then enforces legal sequencing and gates.

## Responsibility split

AI-DLC Slim owns lifecycle, workflow state, approval semantics, project/change artifacts, completion requirements, and verification expectations.

The currently active agent/runtime owns execution strategy, delegation/parallelism, model/provider selection, tool/MCP selection, and specialist routing.

The Skill never hardcodes OMO Slim or any other orchestration framework. OMO can remain the active orchestrator without AI-DLC depending on it.

## Deterministic engine v0.1

The engine lives under:

```text
.agents/skills/aidlc-workflows/engine/
```

It is written in TypeScript, requires Node.js 20+, and has zero runtime dependencies. TypeScript is used only to build/test the engine.

Build it after installing the Skill source:

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm run build
```

Then use:

```bash
node .agents/skills/aidlc-workflows/engine/dist/src/cli.js status
node .agents/skills/aidlc-workflows/engine/dist/src/cli.js next
```

The command surface is intentionally small:

```text
init
next                         # read-only
status                       # read-only
report <lifecycle-event>
approve                       # planning approval + HOLD
continue                      # planning approval/continuation
request-changes
block / unblock
```

The engine enforces `approve != continue`, risk/workflow invariants, legal transitions, blockers, required artifact predicates, review routing, final acceptance, and conservative downstream invalidation after rework. Rejected transitions leave the persisted state unchanged.

## State contract

The only workflow cursor is:

```text
aidlc-docs/aidlc-state.json
```

Its canonical external schema lives at:

```text
.agents/skills/aidlc-workflows/schemas/aidlc-state.schema.json
```

Preflight persists these decisions once:

- `design_required`
- `planning_gate_required`
- `review_required`
- `final_acceptance_required`
- `security_required`

The contract is split into:

- `references/state.md` — state ownership/model;
- `references/transition-contract.md` — legal transitions and risk invariants;
- `references/completion-predicates.md` — minimum completion requirements;
- `references/engine-contract.md` — agent/engine boundary.

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

Unchecked behavior is `NOT VERIFIED`, not assumed to work. Tests/checks must not be weakened merely to obtain a passing result without explicit user authorization.

## Engine tests

The v0.1 implementation includes automated coverage of the contract matrix: initialization invariants, conditional Design, planning gates, approve/continue separation, illegal transitions, Implementation completion, Review pass/fail and invalidation, Verification failures/`NOT VERIFIED`, final acceptance, blockers, read-only operations, and rejected-transition atomicity.

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm test
```

## Installation

Copy `.agents` into the project root, or install the Skill in the user-level agent skills location supported by your coding environment. Templates for a thin `AGENTS.md` and durable project baseline are under `.agents/skills/aidlc-workflows/templates/`.

## v0.2 boundary

Artifact/source hashes, review freshness receipts, executable verification receipts, source manifests, hash-driven downstream invalidation, and runtime-specific hooks/plugins remain intentionally deferred. They should strengthen evidence without creating a second lifecycle.

## Attribution

This project is based on `qtalen/aidlc-skills`, an MIT-licensed Skill-form adaptation of AWS AI-DLC v1. Selected context-organization ideas were also informed by `KhazP/vibe-coding-prompt-template`.

See `ATTRIBUTION.md` and `LICENSE` for details.
