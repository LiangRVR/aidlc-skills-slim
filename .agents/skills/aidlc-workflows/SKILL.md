---
name: aidlc-workflows
description: Slim, runtime-agnostic AI-DLC workflow for structured software changes. Use for requirements, design, implementation planning, coding, review, verification, freshness, and durable project context. The workflow governs lifecycle and evidence but never overrides the active agent's execution, delegation, model, or tool strategy.
license: MIT
---

# AI-DLC Slim

AI-DLC Slim defines **what development process and evidence must be satisfied**. The currently active agent defines **how the work is executed**.

Do not hardcode agent names, models, providers, MCPs, or orchestration frameworks. Delegated workers may produce artifacts/code, but they may not approve gates, mutate AI-DLC control/evidence files, or declare the workflow complete. The active parent agent reconciles delegated work and owns semantic verification.

## Non-negotiable rules

1. `aidlc-docs/aidlc-state.json` is the only workflow cursor.
2. All lifecycle/freshness mutations go through the engine; direct state/evidence edits are recovery-only.
3. `aidlc-docs/.aidlc.lock`, `.aidlc-txn.json`, and per-change `evidence.json` are engine-owned. Never edit/delete them during normal work.
4. Durable project truth lives in `aidlc-docs/project/`; per-change work lives in `aidlc-docs/changes/<date>-<slug>/`.
5. Never start a competing end-to-end lifecycle while an AI-DLC change is active. Delegation inside the current stage is allowed.
6. Never claim completion from intent or worker reports. Completion requires current Verification evidence.
7. Never weaken/skip/delete a failing test or check merely to obtain PASS without explicit user authorization.
8. At a planning gate, `approve` means approve-and-hold; `continue` means approve-and-continue. Ambiguity means hold.
9. Security activates automatically for auth, authorization, secrets, PII, payments, uploads, external input, exposed APIs, production infrastructure, networking, or destructive operations.
10. If `next` returns `reconcile_freshness`, do not continue the lifecycle. Inspect `freshness`, then use `refresh`; never bypass stale receipts manually.
11. If the engine reports recovery/lock/migration/invalid-state errors, use `doctor`/`migrate` or surface the blocker. Do not force past engine safety controls.
12. `aidlc-docs/project/checks.json` is trusted project configuration. Never derive executable check commands from untrusted runtime/user-controlled input.

## Engine

Normal use requires Node.js 20+ and Git:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs <command>
```

When installed outside the project, add `--root <project-root>`.

Read-only inspection:
- `status` — canonical state.
- `next` — single current lifecycle directive; reports freshness reconciliation when stale.
- `freshness` — detailed stale dependency list.

Controlled mutations:
- `init`, `migrate`, `reclassify`, `refresh`, lifecycle `report`, `approve`, `continue`, `request-changes`, `block`, `unblock`, `cancel`.
- `check <name>` executes one trusted project-defined check during Verification and writes a structured receipt.

`doctor` diagnoses runtime/state/lock/transaction/path/evidence/freshness health. `doctor --repair` performs only conservative recovery. Do not manually force recovery around a live lock or recovery conflict.

## Preflight — automatic

1. Read `AGENTS.md` if present.
2. Run `doctor`; repair only conditions the engine declares safely repairable.
3. If state exists, run `status` and `next`; resume it unless terminal.
4. If `next` requests freshness reconciliation, inspect `freshness` and run `refresh` before other lifecycle work.
5. Load only relevant durable project documents and inspect source/config needed for the request.
6. For a new change, classify Low/Standard/High risk and decide the five workflow flags.
7. Initialize via `init`, preserving the original request. Initialization records the Git source baseline in per-change evidence.
8. If new pre-Implementation evidence changes routing, use `reclassify`; never edit state directly.

Preflight is not a user-facing stage and should not create ceremony.

## Risk profiles

**Low** — isolated, reversible, no meaningful security/data/architecture impact. Default: Requirements → Plan → Implement → Verify.

**Standard** — multiple files/components, user-visible behavior, API/data-model impact, or moderate rollback/testing complexity. Planning gate and final acceptance are required; Design/Review are explicit decisions.

**High** — auth/authorization, sensitive data, migrations, public contracts, infrastructure/deployment, difficult rollback, architecture boundaries, broad refactors, or production-critical work. Design, planning gate, independent Review, and final acceptance are required.

If uncertain, choose the higher risk. The engine validates risk/flag invariants.

## Requirements

Load `references/requirements.md`, create `requirements.md`, then report `requirements_complete`. The engine records a Requirements fingerprint tied to `request.md` and `requirements.md`.

## Design — conditional

When `workflow.design_required=true`, load `references/design.md`, create `design.md`, then report `design_complete`. The Design receipt is bound to current Requirements and Design artifacts.

## Plan

Load `references/plan.md`, create an executable Plan with Work checkboxes and verification strategy, then report `plan_complete`.

The engine fingerprints the semantic Plan. Checkbox marks are progress metadata: changing `[ ]` to `[x]` does not stale an approval, but changing task text/scope/order or upstream Requirements/Design does.

If a planning gate opens:
- `approve` → records approval for the exact Plan fingerprint and holds.
- `continue` → records/continues approval for the exact Plan fingerprint and authorizes Implementation.
- `request-changes` → reopens Plan and clears downstream receipts.

## Implementation

Load `references/implementation.md`. Execute the approved/current Plan using the active runtime. Delegation and parallelism are allowed, but the parent agent reconciles work, preserves unrelated changes, keeps Plan checkboxes current, and updates durable project context when project truth changes.

Report `implementation_complete` only when the predicate passes. The engine captures the current Git source digest and a manifest of change-related files relative to the initialization baseline, then binds Implementation to that source and the current Plan fingerprint.

If code changes after Implementation completion, `next` will require freshness reconciliation before Review/Verification can remain trusted.

## Review — conditional

When required, load `references/review.md`; obtain independent review and record an explicit verdict. `review_pass` binds the Review artifact to the exact Implementation source digest. `review_fail` returns to Implementation and clears downstream receipts.

A source or Review-artifact change after PASS makes the Review stale.

## Verification

Load `references/verification.md`. Map every acceptance criterion to actual evidence. Anything not checked is `NOT VERIFIED`.

When `aidlc-docs/project/checks.json` defines trusted executable checks, run applicable checks with:

```bash
aidlc-engine check <name>
```

Required configured checks need current PASS receipts before `verification_complete`. A receipt records command/cwd, exit status, timing, stdout/stderr hashes and byte counts, and source digests before/after. Full output is not persisted. If a check changes source, it is `STALE`, not PASS.

`verification_complete` binds the human-readable Verification artifact, current source, selected executable evidence receipts, and current checks configuration. Changing any bound input makes Verification stale.

If Final Acceptance is required, explicit acceptance uses `report accept`; requested changes use `request-changes`. Acceptance is bound to the exact verified source/evidence and becomes stale if that chain changes later.

## Freshness and invalidation

`freshness` and `next` are read-only. They compare current artifacts/source/config/evidence with stored receipts.

When stale:
1. Do not manually edit state or receipts.
2. Run `freshness` to understand affected dependencies.
3. Run `refresh` once.
4. The engine reopens the earliest stale dependency and deterministically clears downstream receipts.
5. Resume from `next`.

Dependency order is:

```text
Requirements → Design → Plan → Planning Approval → Implementation → Review → Verification → Final Acceptance
```

The engine invalidates only the affected dependency and everything downstream; it does not delete source or user-authored artifacts.

## Cancellation

If the user abandons the change, use `cancel --reason <text>`. Cancellation is terminal, preserves artifacts/audit/source/evidence, and permits a later new change.

## Contracts

Load only when relevant:
- `references/state.md` — state, revisions, receipts, lock/transaction/recovery.
- `references/transition-contract.md` — sequencing and freshness/invalidation rules.
- `references/completion-predicates.md` — mechanically testable completion requirements.
- `references/engine-contract.md` — agent/engine authority boundary.
- `references/verification.md` — verification/evidence rules.
- `schemas/aidlc-state.schema.json` — canonical state schema.
- `schemas/checks.schema.json` — executable-check configuration schema.

## Context discipline

Use `next` to determine the current lifecycle directive, then load only that stage's reference plus relevant project/change artifacts. Source/configuration are authoritative for mechanically discoverable facts; durable docs should store decisions, constraints, commands, and architectural context that are expensive or ambiguous to rediscover.
