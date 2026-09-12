# AI-DLC Skills Slim

A slim, runtime-agnostic adaptation of AWS AI-DLC v1 for structured AI-assisted software development, backed by a deterministic lifecycle, recovery, freshness, and evidence engine.

AI-DLC Slim separates two responsibilities:

```text
AI-DLC Slim                     Active coding agent/runtime
----------------------------    ------------------------------
Owns the development process    Owns execution
Owns lifecycle state            Chooses tools/models/workers
Owns gates and freshness        Writes/reviews code
Owns machine evidence           Makes semantic judgments
```

It does **not** hardcode OMO Slim, OpenCode, model names, providers, specialist roles, or delegation strategy. The active agent decides how to do the work; AI-DLC Slim makes sure the required process and evidence are satisfied.

## Quick Start

If you only want to use AI-DLC Slim, start here. You do **not** need to understand the state-machine internals or manually create the AI-DLC directory structure first.

### 1. Requirements

You need:

- **Node.js 20+**
- **Git**
- a coding agent/runtime capable of loading repository-local Skill instructions

The included runtime is prebuilt JavaScript. Using AI-DLC Slim does not require compiling the TypeScript engine.

### 2. Run the guided initializer

From the root of the project you want AI-DLC Slim to manage, run:

```bash
npm exec --yes --package=github:LiangRVR/aidlc-skills-slim -- aidlc init
```

This downloads the current AI-DLC Slim package from the GitHub repository, runs the user-facing initializer, and installs the repository-local Skill into the project.

If you already have this repository cloned locally, you can run the same initializer directly:

```bash
node /path/to/aidlc-skills-slim/bin/aidlc.mjs init --root /path/to/your-project
```

The normal interactive command is simply:

```bash
aidlc init
```

when the `aidlc` package binary is already available in your environment.

`aidlc init` is a **project bootstrap command**. It is intentionally different from `aidlc-engine init`, which initializes one individual software change after the project has already been configured.

```text
aidlc init
    ↓
Configure / inspect the PROJECT

User requests a change
    ↓
aidlc-engine init
    ↓
Initialize that CHANGE
```

Project bootstrap is not an AI-DLC lifecycle stage.

### 3. Let the initializer inspect before you answer questions

The initializer works **inspect first, ask second**. It will:

- resolve the Git project root;
- offer to initialize Git when the directory is not yet a repository;
- distinguish a greenfield project from an existing/brownfield project;
- inspect common project files and dependencies;
- detect common Node.js, TypeScript, React, Next.js, Vite, Express, Supabase, Prisma, Python, Rust, Go, Docker, and GitHub Actions signals;
- detect useful verification candidates such as tests, type checks, builds, linting, `pytest`, `cargo test`, and `go test`;
- ask only for important project information that cannot be safely inferred;
- install or repair `.agents/skills/aidlc-workflows/` without overwriting existing Skill files;
- preserve an existing `AGENTS.md` and existing `aidlc-docs/project/*` context;
- create only missing durable project context;
- create a safe starter `checks.json` from approved/detected verification commands;
- validate an existing `checks.json` instead of silently replacing it;
- run the engine `doctor` at the end;
- leave lifecycle state untouched — initialization does not create a fake change.

A typical existing-project run may look like:

```text
AI-DLC Slim setup

Project type: brownfield
Detected stack: Node.js, TypeScript, React, Vite
Detected checks: npm run test, npm run typecheck, npm run build

? What is this product/project primarily for?
? Who are the primary users or operators?
? Is this already used in production or by real users?
? Does it handle sensitive/personal or security-critical data?
? I detected Node.js, TypeScript, React, Vite. Is that materially correct?
? Add npm run test as a required AI-DLC verification check?
...

Setup summary
✓ Skill installed/repaired
✓ Project context created/preserved
✓ Verification configuration created/validated
✓ Doctor healthy

Next step:
  Tell your coding agent:
  "Use AI-DLC Slim to implement <your change>."
```

For a **greenfield project**, the initializer does not invent architecture or a technology stack. If the stack has not been decided, it records that explicitly and leaves the decision for Requirements/Design when enough information exists.

### 4. Know what was created

After initialization, the important repository-local pieces are:

```text
project/
├── AGENTS.md
├── .agents/
│   └── skills/
│       └── aidlc-workflows/
│           ├── SKILL.md
│           ├── references/
│           ├── schemas/
│           ├── templates/
│           └── engine/
└── aidlc-docs/
    └── project/
        ├── brief.md
        ├── architecture.md
        ├── tech-stack.md
        ├── testing.md
        ├── checks.json
        └── decisions/
```

The durable project files are intentionally small and should contain only project knowledge that is important, non-obvious, expensive, or unsafe to rediscover.

Running `aidlc init` again is safe and idempotent. Existing project context is preserved, while missing Skill/setup files can be repaired.

### 5. Ask your coding agent to use AI-DLC

Once setup is healthy, normal usage happens through your coding agent rather than by manually operating the engine.

For example:

```text
Use AI-DLC Slim to add CSV export to the admin orders page.
```

Or:

```text
Implement this change using AI-DLC Slim. Continue through the workflow until you need my approval.
```

The agent should handle preflight, engine commands, workflow artifacts, risk routing, state transitions, verification receipts, freshness checks, and delegated work itself.

### 6. Respond when AI-DLC reaches a gate

The most important user responses are:

```text
approve      Approve the Plan and HOLD. Do not implement yet.
continue     Approve/continue and enter Implementation.

accept       Final acceptance when the workflow asks for it.

<changes>    Explain what should change; the agent should route the
             workflow back through the appropriate rework path.
```

`approve` and `continue` intentionally mean different things.

If you say only `approve`, implementation should **not** begin.

### Manual/offline installation

If you do not want to run the package/bootstrap command, you may install AI-DLC Slim manually by copying the complete Skill directory to:

```text
.agents/skills/aidlc-workflows/
```

The Skill entry point is:

```text
.agents/skills/aidlc-workflows/SKILL.md
```

Starter templates are available under:

```text
.agents/skills/aidlc-workflows/templates/
├── AGENTS.md
└── project/
    ├── brief.md
    ├── architecture.md
    ├── tech-stack.md
    ├── testing.md
    └── checks.json
```

Manual installation is an advanced/fallback path. Prefer `aidlc init` because it inspects the target repository, preserves existing context, guides missing decisions, configures verification, repairs partial setup, and validates the result.

---

## What Normal Usage Looks Like

Most users should interact with their coding agent, not with the engine CLI directly.

A typical Standard-risk change looks like this:

```text
You
│
│  "Use AI-DLC Slim to add CSV export to the admin orders page."
│
▼
Agent: Preflight
├── reads project context
├── runs doctor/status/next
├── inspects the repository
└── initializes the change and risk routing
│
▼
Requirements
│
▼
Design (only if needed)
│
▼
Plan
│
▼
Planning Gate
│
│  Agent: "The Plan is ready for approval."
│
├── You: "approve"  → approve + HOLD
│
└── You: "continue" → enter Implementation
                         │
                         ▼
                    Implementation
                         │
                         ▼
                 Independent Review
                    (when required)
                         │
                         ▼
                     Verification
                         │
                         ▼
                   Final Acceptance
                         │
                 You: "accept"
                         │
                         ▼
                      Complete
```

The engine records exact fingerprints and source/evidence receipts as this progresses so an old approval, review, or verification result cannot silently apply to changed work.

## Human vs Agent Responsibilities

| Human | Active agent/runtime | AI-DLC engine |
| --- | --- | --- |
| Defines the requested outcome | Inspects repository/context | Enforces legal transitions |
| Answers material questions | Classifies risk and workflow flags | Stores canonical state |
| Approves or requests Plan changes | Writes Requirements/Design/Plan | Enforces approval semantics |
| Authorizes consequential choices | Implements and delegates work | Locks transactional mutations |
| Accepts final result when required | Obtains independent review | Tracks artifact/source freshness |
| Can explicitly accept known risk | Runs/assesses verification | Records executable check receipts |
| Decides real-world authorization | Updates durable project context | Invalidates stale downstream evidence |

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
4. reconcile freshness before doing new lifecycle work when required;
5. load only relevant durable project context;
6. inspect the repository/configuration needed for the request;
7. classify risk and workflow routing;
8. initialize a new change only when there is no active non-terminal change.

### Requirements

Requirements always run, with depth proportional to the change. They capture intended behavior, acceptance criteria, preserved behavior, constraints, and explicit non-goals.

### Design

Design runs only when the change materially affects architecture, boundaries, contracts, schemas, security, infrastructure, migration behavior, failure/recovery behavior, or another consequential technical decision.

### Plan

The Plan is an executable work plan with ordered tasks, affected areas, dependencies, verification strategy, and migration/rollback considerations when relevant.

Plan Work checkboxes are also used to track implementation progress.

### Implementation

The active agent executes the approved/current Plan. It may delegate or parallelize work, but it must preserve unrelated changes, reconcile delegated output, keep Plan progress current, and update durable project context when implementation changes project truth.

### Review

Independent Review is conditional. When required, the reviewer examines the actual implementation and records an explicit PASS or failure/changes-required verdict.

### Verification

Verification maps every acceptance criterion to actual evidence. Anything not checked is `NOT VERIFIED`, not assumed to work.

### Final Acceptance

Standard/High workflows may require explicit final acceptance. Acceptance is bound to the exact verified source/evidence state.

---

## Risk Profiles

### Low

Use for isolated, reversible work with no meaningful security, data, or architecture impact.

Typical flow:

```text
Requirements → Plan → Implementation → Verification
```

### Standard

Use for multi-file/component work, user-visible behavior, moderate API/data impact, or non-trivial rollback/testing complexity.

Planning approval and final acceptance are required. Design and independent Review are explicit routing decisions.

### High

Use for auth/authorization, sensitive data, migrations, public contracts, infrastructure/deployment, difficult rollback, architecture boundaries, broad refactors, or other production-critical changes.

High risk requires:

```text
Design
Planning Gate
Independent Review
Final Acceptance
```

When uncertain between risk levels, choose the higher one.

Security activates automatically when the change touches auth, authorization, secrets, PII, payments, uploads, untrusted external input, exposed APIs, production infrastructure, networking, or destructive operations.

## Approval Semantics

At a planning gate:

| User intent | Meaning |
| --- | --- |
| `approve`, `approved`, `ok`, `yes`, `lgtm` | approve + HOLD |
| `continue`, `proceed`, `go on`, `next` | approve/continue into Implementation |
| requested modifications | reopen the Plan |
| ambiguous approval | HOLD |

This protects against an agent interpreting a simple acknowledgement as permission to start implementation.

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

### Why this matters

Suppose you approve a Plan and then its scope changes. AI-DLC does not merely remember that "the Plan was approved." It compares the current semantic Plan fingerprint with the fingerprint that was approved.

Likewise, if source changes after Review or Verification, the old receipt becomes stale.

### Plan checkbox exception

Changing:

```text
- [ ] Implement CSV serializer
```

to:

```text
- [x] Implement CSV serializer
```

is execution progress and does **not** invalidate Plan approval.

Changing the task text, scope, ordering, Requirements, or Design does.

### When freshness becomes stale

`next` does not silently continue. It returns a freshness-reconciliation directive.

The normal recovery sequence is:

```text
next
  ↓
reconcile_freshness
  ↓
freshness       # read-only explanation
  ↓
refresh         # explicit deterministic invalidation
  ↓
next
  ↓
resume from the earliest stale dependency
```

`refresh` does not delete source or user-authored artifacts. It invalidates only the affected lifecycle receipt and everything downstream that can no longer be trusted.

## Executable Verification Checks

Projects may define trusted commands in:

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

During active Verification, the agent can run:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs check unit
```

Checks execute with `shell:false`. Receipts record:

- exact command and working directory;
- start time and duration;
- exit code and timeout status;
- stdout/stderr hashes and byte counts;
- source digest before and after execution.

Full stdout/stderr is not persisted in `evidence.json`.

If a check modifies source, its receipt is `STALE`, not PASS. Required checks need a current PASS receipt against the exact source and current check definition before Verification can complete.

`checks.json` is **trusted project configuration**. Do not populate it from untrusted runtime/user-controlled input or treat it as an arbitrary command execution API.

### Choosing project checks

Examples of useful project-defined checks include:

```text
Node/TypeScript    unit tests, typecheck, lint, build
Python             pytest, static/type checks, package/build checks
Backend/API        unit + integration/API tests
Frontend           unit/component tests, typecheck, production build
Infrastructure     validation/plan commands appropriate to the stack
```

Only mark checks required when they are part of the project's real verification contract.

## Recovery and Troubleshooting

The agent should normally handle these conditions rather than asking the user to edit engine files manually.

| Condition | Correct response |
| --- | --- |
| `FRESHNESS_STALE` / `reconcile_freshness` | run `freshness`, then `refresh`, then resume from `next` |
| `RECOVERY_REQUIRED` | run `doctor`; use `doctor --repair` only when the engine says recovery is safe |
| `RECOVERY_CONFLICT` | stop and surface the conflict; do not force recovery |
| `WORKFLOW_LOCKED` | do not delete the lock blindly; inspect with `doctor` |
| schema migration required | run `migrate` or safe `doctor --repair` migration path |
| failed configured check | fix the cause and rerun the check; never weaken the test simply to obtain PASS |
| Review fails | return to Implementation, address findings, then re-review |
| Verification contains `NOT VERIFIED` | keep it explicit and document residual risk; do not silently convert it to PASS |
| user abandons the change | `cancel --reason "..."` |

Engine-owned files should not be manually edited during normal operation:

```text
aidlc-docs/aidlc-state.json
aidlc-docs/.aidlc.lock
aidlc-docs/.aidlc-txn.json
aidlc-docs/changes/<change>/evidence.json
```

## Project and Change Files

The canonical workflow cursor is:

```text
aidlc-docs/aidlc-state.json
```

Durable project context:

```text
aidlc-docs/project/
├── brief.md
├── architecture.md
├── tech-stack.md
├── testing.md
├── checks.json
└── decisions/
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

The Git repository remains authoritative for implementation details. Durable docs should capture decisions, constraints, important commands, architecture, testing expectations, and other context that is expensive or ambiguous to rediscover.

## Updating Durable Project Context

After implementation, update `aidlc-docs/project/` only when the change materially changes durable project truth.

Examples:

- new service/integration boundary → `architecture.md`;
- changed runtime/deployment/setup → `tech-stack.md`;
- changed verification convention → `testing.md` or `checks.json`;
- changed project purpose or permanent constraint → `brief.md`;
- consequential durable decision with real alternatives → ADR.

Do not create documentation churn for routine implementation details that the repository already makes obvious.

## What "Complete" Means

A workflow reaching `Complete` means the required lifecycle for that risk/routing decision has been satisfied against current evidence.

Depending on the workflow, that can include:

- current Requirements/Design/Plan fingerprints;
- a current planning approval;
- Implementation bound to a Git source snapshot;
- current independent Review;
- current executable Verification receipts;
- explicit final acceptance.

Completion does **not** mean deployment or another real-world side effect was authorized. Deployments, destructive production actions, access changes, external sends, charges, or similar actions still require their own explicit authorization.

Artifacts and evidence remain in the repository after completion for auditability and future context.

---

## Manual Engine Usage

Most users do not need this section. It is useful for debugging, integration, or operating AI-DLC without an agent that handles the CLI automatically.

Define a convenience variable in your shell if useful, or invoke the wrapper directly:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs status
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs next
```

When the Skill is installed outside the managed project, add:

```text
--root /path/to/project
```

### Initialize a change manually

Example Standard-risk change:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs init \
  --change 2026-09-11-orders-csv-export \
  --risk standard \
  --risk-rationale "User-visible multi-file export feature with non-trivial verification" \
  --design-required false \
  --planning-gate-required true \
  --review-required true \
  --final-acceptance-required true \
  --security-required false \
  --request "Add CSV export to the admin orders page"
```

The active agent is responsible for choosing these risk/routing values based on the actual change. Do not mechanically reuse the example flags.

### Command reference

```text
init
next                         read-only; returns freshness reconciliation when stale
status                       read-only
freshness                    read-only freshness diagnostics
refresh                      reopen earliest stale dependency and invalidate downstream receipts
doctor [--repair]            diagnostics / conservative safe recovery
migrate                      schema v1/v2 -> v3
reclassify                   change pre-Implementation risk/routing
check <name>                 run a trusted configured Verification check
report <event>               report lifecycle completion/verdict/acceptance
approve                      planning approval + HOLD
continue                     planning approval/continuation into Implementation
request-changes              route approved/final work back for revision
block --reason "..."
unblock --reason "..."
unblock --all
cancel --reason "..."       terminal cancellation
```

Lifecycle report events are:

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

Use the engine README for lower-level implementation details:

```text
.agents/skills/aidlc-workflows/engine/README.md
```

## Engine v0.2 Guarantees

### State and recovery

Every mutation is protected by:

```text
aidlc-docs/.aidlc.lock
aidlc-docs/.aidlc-txn.json
```

State revisions are monotonic. Interrupted transactions block progression until conservative recovery succeeds or a recovery conflict is surfaced.

### Filesystem hardening

Realpath containment protects workflow artifact reads and engine control-file writes from path/symlink escapes.

Current limits:

```text
workflow Markdown artifact     2 MiB
evidence.json                  4 MiB
transaction journal           16 MiB
```

### Conservative migration

Schema v1/v2 → v3 migration does not fabricate historical freshness receipts. Older completion/approval claims without v0.2 evidence become stale and must be reconciled normally.

### Source identity

Production freshness requires a Git working tree. Source snapshots include Git tree identity plus changed/untracked file hashes, while workflow files under `aidlc-docs/**` are excluded from implementation source identity.

A dirty file that existed before the workflow and did not change during the workflow is not falsely attributed to the change manifest.

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

CI runs the full suite against both compiled TypeScript and the committed zero-setup runtime on Node 20 across Linux, macOS, and Windows, then smoke-tests the packaged CLI.

## Attribution

This project is based on `qtalen/aidlc-skills`, an MIT-licensed Skill-form adaptation of AWS AI-DLC v1. Selected context-organization ideas were also informed by `KhazP/vibe-coding-prompt-template`.

See `ATTRIBUTION.md` and `LICENSE`.