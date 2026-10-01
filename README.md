# AI-DLC Skills Slim

A slim, runtime-agnostic adaptation of AWS AI-DLC v1 for structured AI-assisted software development, backed by a deterministic lifecycle, recovery, freshness, and evidence engine.

AI-DLC Slim separates responsibilities deliberately:

```text
AI-DLC Slim                     Active coding agent/runtime
----------------------------    --------------------------------
Owns the development process    Owns execution
Owns lifecycle state            Chooses tools/models/workers
Owns gates and freshness        Understands the project
Owns machine evidence           Writes/reviews code
Defines context contracts       Maintains durable project context
```

It does **not** hardcode OMO Slim, OpenCode, Claude Code, Codex, model names, providers, specialist roles, or delegation strategy. The active agent decides how to do the work; AI-DLC Slim makes sure the required process and evidence are satisfied.

## Quick Start

You do **not** need to understand the state-machine internals or manually maintain a specification system.

### 1. Requirements

You need:

- **Node.js 20+**
- **Git**
- a coding agent/runtime capable of loading repository-local Skill instructions

The included runtime is prebuilt JavaScript. Using AI-DLC Slim does not require compiling the TypeScript engine.

### 2. Bootstrap the project

From the project root:

```bash
npm exec --yes --package=github:LiangRVR/aidlc-skills-slim -- aidlc init
```

For non-interactive/default bootstrap:

```bash
npm exec --yes --package=github:LiangRVR/aidlc-skills-slim -- aidlc init --yes
```

If this repository is already cloned locally:

```bash
node /path/to/aidlc-skills-slim/bin/aidlc.mjs init --root /path/to/your-project
```

`aidlc init` is intentionally a **mechanical bootstrap**, not an AI model hidden inside the CLI. It safely installs/repairs the Skill, creates missing durable-context templates, discovers repository-defined verification candidates, validates `checks.json`, and runs `doctor`.

Semantic project understanding belongs to the active coding agent so AI-DLC Slim stays runtime-agnostic.

```text
aidlc init
    ↓
Mechanical project bootstrap
    ↓
Active agent inspects repository
    ↓
Semantic project context initialization
    ↓
Project ready

User requests a change
    ↓
aidlc-engine init
    ↓
Initialize that CHANGE
```

Project bootstrap and project-context initialization are not lifecycle stages.

### 3. Let the agent initialize project context

After bootstrap, tell the coding agent something like:

```text
Initialize/reconcile the AI-DLC Slim project context from this repository.
Inspect first and ask me only for material intent or constraints you cannot safely infer.
```

The Skill instructs the active parent agent to inspect relevant repository evidence such as README/docs, manifests, source boundaries, schemas, CI/deployment configuration, and tests. It then refines:

```text
aidlc-docs/project/
├── brief.md
├── architecture.md
├── tech-stack.md
├── testing.md
├── checks.json
└── decisions/
```

Fresh templates contain:

```text
<!-- AI-DLC-CONTEXT: PENDING -->
```

The agent removes that marker only after it has actually reconciled the document against repository evidence and material user intent.

For an existing/brownfield project, the agent should infer as much as possible instead of interviewing the user about facts already visible in the codebase.

For a greenfield project, it should ask only high-value questions such as what is being built, who uses it, and hard constraints. It must not invent an undecided architecture or technology stack.

### 4. Ask your coding agent to use AI-DLC

Normal usage happens through the coding agent rather than by manually operating the engine:

```text
Use AI-DLC Slim to add CSV export to the admin orders page.
```

Or:

```text
Implement this change using AI-DLC Slim. Continue through the workflow until you need my approval.
```

The agent handles preflight, engine commands, workflow artifacts, risk routing, state transitions, context reconciliation, verification receipts, freshness checks, and delegated work itself.

### 5. Respond only at real gates

The important user responses are:

```text
approve      Approve the Plan and HOLD. Do not implement yet.
continue     Approve/continue and enter Implementation.
accept       Final acceptance when requested.
<changes>    Explain what should change.
```

`approve` and `continue` intentionally mean different things. If you say only `approve`, implementation should **not** begin.

---

## What Normal Usage Looks Like

A typical Standard-risk change:

```text
User request
    ↓
Preflight
├── doctor / status / next
├── relevant project context
├── targeted repository inspection
├── context reconciliation if stale
└── risk/routing
    ↓
Requirements
    ↓
Design (only if needed)
    ↓
Plan
    ↓
Planning Gate
    ├── approve  → HOLD
    └── continue → Implementation
                      ↓
                 implement / test / fix
                      ↓
          reconcile durable context
              if materially changed
                      ↓
             Implementation complete
                      ↓
            Independent Review
              (when required)
                      ↓
                 Verification
                      ↓
              Final Acceptance
              (when required)
                      ↓
                   Complete
```

When the user authorizes continuation, entering Implementation is not a stopping condition. The agent should keep advancing through non-human-gated stages until a real human gate, blocker, consequential unapproved decision, explicit hold, or terminal state is reached.

## Human vs Agent vs Engine

| Human | Active agent/runtime | AI-DLC engine |
| --- | --- | --- |
| Defines requested outcome | Understands repository/project context | Enforces legal transitions |
| Owns product intent and durable business constraints | Maintains architecture/stack/testing context | Stores canonical state |
| Answers material unknowns | Classifies risk and workflow flags | Enforces approval semantics |
| Approves/requests Plan changes | Writes Requirements/Design/Plan | Locks transactional mutations |
| Authorizes consequential choices | Implements and delegates | Tracks artifact/source freshness |
| Accepts final result when required | Obtains independent review | Records executable check receipts |
| Decides real-world authorization | Runs/assesses verification | Invalidates stale downstream evidence |

Delegated workers may help create artifacts or code, but the active parent agent remains responsible for reconciling their work. Workers do not own AI-DLC lifecycle state or approvals.

## Lifecycle

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

### Preflight

Preflight is automatic and should not create ceremony. The agent should:

1. read `AGENTS.md` when present;
2. run `doctor`;
3. inspect `status` and `next` if state already exists;
4. reconcile freshness before new lifecycle work when required;
5. load only relevant durable project context;
6. initialize/reconcile project context when it is pending, materially stale, or incomplete for safe work;
7. inspect repository/configuration needed for the request;
8. classify risk and workflow routing;
9. initialize a new change only when no active non-terminal change exists.

### Requirements

Requirements always run, with depth proportional to the change. They capture intended behavior, acceptance criteria, preserved behavior, constraints, and explicit non-goals.

### Design

Design runs only when the change materially affects architecture, boundaries, contracts, schemas, security, infrastructure, migration behavior, failure/recovery behavior, or another consequential technical decision.

### Plan

The Plan is an executable work plan with ordered tasks, affected areas, dependencies, verification strategy, and migration/rollback considerations when relevant.

Plan Work checkboxes also track implementation progress.

### Implementation

The active agent executes the approved/current Plan. It may delegate or parallelize work, but it must preserve unrelated changes, reconcile delegated output, and keep Plan progress current.

When implementation materially changes durable project truth, the agent updates the affected `aidlc-docs/project/` context **before** reporting Implementation complete. This keeps Review and Verification aligned with the project model future work will consume.

### Review

Independent Review is conditional. When required, the reviewer examines the actual implementation and records an explicit PASS or failure/changes-required verdict.

### Verification

Verification maps every acceptance criterion to actual evidence. Anything not checked is `NOT VERIFIED`, not assumed to work.

### Final Acceptance

Standard/High workflows may require explicit final acceptance. Acceptance is bound to the exact verified source/evidence state.

---

## Living Project Context

AI-DLC Slim treats durable context as an agent-maintained project model, not a user maintenance chore.

Core rule:

> The repository is authoritative for observable implementation facts. The user is authoritative for product intent, durable business constraints, and consequential decisions.

Document ownership:

```text
brief.md          intent-heavy; modify conservatively
architecture.md   agent-maintained durable architecture/boundaries
tech-stack.md     agent-maintained real stack/commands/patterns
testing.md        agent-maintained testing strategy/gaps
checks.json       trusted executable configuration
decisions/        consequential durable decisions only
```

Update context only when a change materially affects how a future agent should understand, modify, verify, secure, deploy, or operate the project.

Usually material:

- new/removed major component or service;
- database/auth/queue/cache/external integration changes;
- API, security, trust, or data-ownership boundary changes;
- deployment/build/run/testing workflow changes;
- consequential framework/stack changes;
- durable architecture or operational constraints.

Usually not material:

- variable/function renames;
- local refactors that preserve boundaries;
- padding/style changes;
- typo fixes;
- small helpers;
- routine dependency patch updates with no durable constraint.

The Skill contract is in:

```text
.agents/skills/aidlc-workflows/references/project-context.md
```

## Risk Profiles

### Low

Isolated, reversible work with no meaningful security, data, or architecture impact.

```text
Requirements → Plan → Implementation → Verification
```

### Standard

Multi-file/component work, user-visible behavior, moderate API/data impact, or non-trivial rollback/testing complexity. Planning approval and final acceptance are required. Design and independent Review are explicit routing decisions.

### High

Auth/authorization, sensitive data, migrations, public contracts, infrastructure/deployment, difficult rollback, architecture boundaries, broad refactors, or production-critical changes.

High risk requires:

```text
Design
Planning Gate
Independent Review
Final Acceptance
```

When uncertain, choose the higher risk.

Security activates automatically for auth, authorization, secrets, PII, payments, uploads, untrusted external input, exposed APIs, production infrastructure, networking, or destructive operations.

## Approval Semantics

At a planning gate:

| User intent | Meaning |
| --- | --- |
| `approve`, `approved`, `ok`, `yes`, `lgtm` | approve + HOLD |
| `continue`, `proceed`, `go on`, `next` | approve/continue into Implementation |
| requested modifications | reopen the Plan |
| ambiguous approval | HOLD |

This prevents a simple acknowledgement from being interpreted as permission to implement.

## Freshness and Evidence

Schema v3 binds lifecycle decisions to exact machine fingerprints:

```text
Requirements
   ↓ fingerprint
Design (optional)
   ↓ fingerprint
semantic Plan
   ↓ planning approval receipt
Implementation
   ↓ Git source digest + source manifest
Review (optional)
   ↓ source-bound review receipt
Verification
   ↓ artifact + executable-check evidence receipt
Final Acceptance (optional)
   ↓ exact verified source/evidence
```

If source or a bound artifact changes, old evidence becomes stale rather than silently applying to new work.

Changing Plan checkbox progress (`[ ]` → `[x]`) does not stale approval; changing task text/scope/order or upstream Requirements/Design does.

When freshness becomes stale:

```text
next
  ↓
reconcile_freshness
  ↓
freshness       # read-only explanation
  ↓
refresh         # deterministic invalidation
  ↓
next
```

`refresh` invalidates only the affected dependency and downstream receipts. It does not delete source or user-authored artifacts.

## Executable Verification Checks

Trusted commands live in:

```text
aidlc-docs/project/checks.json
```

Example:

```json
{
  "schema_version": 1,
  "checks": {
    "unit": {
      "command": ["npm", "test"],
      "required": true,
      "timeout_ms": 120000
    },
    "typecheck": {
      "command": ["npm", "run", "typecheck"],
      "required": true,
      "timeout_ms": 120000
    }
  }
}
```

During Verification:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs check unit
```

Receipts record the exact command/cwd, timing, exit state, stdout/stderr hashes and byte counts, and source digests before/after. Full output is not persisted.

Commands normally execute without a shell. Windows uses a narrow validated adapter only for known package-manager shims. `checks.json` remains trusted project configuration, not an arbitrary command-execution surface.

If a check modifies source, its receipt is `STALE`, not PASS. Required checks need current PASS receipts against the exact source and current check definition before Verification can complete.

## Recovery and Troubleshooting

| Condition | Correct response |
| --- | --- |
| `FRESHNESS_STALE` / `reconcile_freshness` | run `freshness`, then `refresh`, then resume from `next` |
| `RECOVERY_REQUIRED` | run `doctor`; use `doctor --repair` only when declared safe |
| `RECOVERY_CONFLICT` | stop and surface the conflict; do not force recovery |
| `WORKFLOW_LOCKED` | inspect with `doctor`; do not delete the lock blindly |
| schema migration required | run `migrate` or safe `doctor --repair` migration |
| failed configured check | fix the cause and rerun; do not weaken the check just to pass |
| Review fails | return to Implementation, address findings, then re-review |
| Verification contains `NOT VERIFIED` | keep it explicit and document residual risk |
| user abandons the change | `cancel --reason "..."` |

Engine-owned files must not be manually edited during normal operation:

```text
aidlc-docs/aidlc-state.json
aidlc-docs/.aidlc.lock
aidlc-docs/.aidlc-txn.json
aidlc-docs/changes/<change>/evidence.json
```

## Project and Change Files

Canonical workflow cursor:

```text
aidlc-docs/aidlc-state.json
```

Per-change work:

```text
aidlc-docs/changes/<date>-<slug>/
├── request.md
├── requirements.md
├── design.md          # conditional
├── plan.md
├── review.md          # conditional
├── verification.md
├── audit.md
└── evidence.json      # engine-owned
```

The Git repository remains authoritative for implementation details. Workflow files under `aidlc-docs/**` are excluded from implementation source identity.

## What "Complete" Means

`Complete` means the required lifecycle for the current risk/routing decision has been satisfied against current evidence. Depending on the workflow, that can include current artifact fingerprints, planning approval, source-bound Implementation, independent Review, executable Verification receipts, and final acceptance.

Completion does **not** authorize production deployment or another real-world side effect. Deployments, destructive actions, access changes, external sends, charges, or similar actions still require their own authorization.

## Manual / Offline Installation

As an advanced fallback, copy the complete Skill directory to:

```text
.agents/skills/aidlc-workflows/
```

Then copy/use the project templates and let the active agent perform semantic project-context initialization according to `references/project-context.md`.

Prefer `aidlc init` because it safely installs/repairs the Skill, preserves project-owned context, discovers trusted verification candidates, and validates bootstrap health.

## Manual Engine Usage

Most users do not need this section.

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs status
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs next
```

When the Skill is installed outside the managed project, add:

```text
--root /path/to/project
```

Command reference:

```text
init
next                         read-only; current lifecycle directive
status                       read-only
freshness                    read-only freshness diagnostics
refresh                      reopen earliest stale dependency
doctor [--repair]            diagnostics / conservative recovery
migrate                      schema v1/v2 -> v3
reclassify                   change pre-Implementation risk/routing
check <name>                 run a trusted Verification check
report <event>               report lifecycle completion/verdict/acceptance
approve                      planning approval + HOLD
continue                     planning approval/continuation into Implementation
request-changes              route work back for revision
block --reason "..."
unblock --reason "..."
unblock --all
cancel --reason "..."       terminal cancellation
```

Lifecycle report events:

```text
requirements_complete
design_complete
plan_complete
implementation_complete
review_pass
review_fail
verification_complete
accept
```

See the engine README for lower-level details:

```text
.agents/skills/aidlc-workflows/engine/README.md
```

## Engine Guarantees

Every mutation is protected by:

```text
aidlc-docs/.aidlc.lock
aidlc-docs/.aidlc-txn.json
```

State revisions are monotonic. Interrupted transactions block progression until conservative recovery succeeds or a recovery conflict is surfaced.

Realpath containment protects workflow artifact reads and engine control-file writes from path/symlink escapes.

Current limits:

```text
workflow Markdown artifact     2 MiB
evidence.json                  4 MiB
transaction journal           16 MiB
```

Schema v1/v2 → v3 migration does not fabricate historical freshness receipts. Older claims without compatible evidence become stale and must be reconciled normally.

Production freshness requires a Git working tree. Source snapshots include Git tree identity plus changed/untracked file hashes while workflow files under `aidlc-docs/**` are excluded from implementation source identity.

## Verification Philosophy

Completion is evidence-based.

```text
Agent/reviewer judgment     → semantics and quality
Markdown artifacts          → human-readable intent/explanation
Hashes and receipts         → exact identity/freshness
Executable checks           → machine-observed verification evidence
```

Unchecked behavior is `NOT VERIFIED`, not assumed to work. Tests/checks must not be weakened simply to obtain a passing result.

## Development

To develop the engine itself:

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm test
npm run test-runtime
```

CI runs the full suite against compiled TypeScript and the committed zero-setup runtime on Node 20, 22, and 24 across Linux, macOS, and Windows, then smoke-tests the guided bootstrap and packaged CLI.

## Attribution

This project is based on `qtalen/aidlc-skills`, an MIT-licensed Skill-form adaptation of AWS AI-DLC v1. Selected context-organization ideas were also informed by `KhazP/vibe-coding-prompt-template`.

See `ATTRIBUTION.md` and `LICENSE`.
