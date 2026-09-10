---
name: aidlc-workflows
description: Slim, runtime-agnostic AI-DLC workflow for structured software changes. Use for requirements, design, implementation planning, coding, verification, and durable project context. The workflow governs lifecycle and evidence but never overrides the active agent's execution, delegation, model, or tool strategy.
license: MIT
---

# AI-DLC Slim

AI-DLC Slim defines **what development process must be satisfied**. The currently active agent defines **how the work is executed**.

Do not hardcode agent names, models, providers, MCPs, or orchestration frameworks. Delegated workers may produce artifacts/code, but they may not approve gates, mutate AI-DLC control files, or declare the workflow complete. The active parent agent reconciles delegated work and owns semantic verification.

## Non-negotiable rules

1. `aidlc-docs/aidlc-state.json` is the only workflow cursor.
2. All lifecycle mutations go through the engine; direct state edits are recovery-only.
3. `aidlc-docs/.aidlc.lock` and `.aidlc-txn.json` are engine-owned control files. Never edit/delete them manually during normal work.
4. Durable project truth lives in `aidlc-docs/project/`; per-change work lives in `aidlc-docs/changes/<date>-<slug>/`.
5. Never start a competing end-to-end lifecycle while an AI-DLC change is active. Delegation inside the current stage is allowed.
6. Never claim completion from intent or worker reports. Completion requires current Verification evidence.
7. Never weaken/skip/delete a failing test or check merely to obtain PASS without explicit user authorization.
8. At a planning gate, `approve` means approve-and-hold; `continue` means approve-and-continue. Ambiguity means hold.
9. Security activates automatically for auth, authorization, secrets, PII, payments, uploads, external input, exposed APIs, production infrastructure, networking, or destructive operations.
10. If the engine reports `RECOVERY_REQUIRED`, `WORKFLOW_LOCKED`, migration required, or invalid state, do not bypass it. Use `doctor`/`migrate` or surface the blocker.

## Engine

Normal use is zero-setup with Node.js 20+:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs <command>
```

When the Skill is installed outside the project, add `--root <project-root>`.

Use `status` and `next` for read-only inspection. Mutations use `init`, `migrate`, `reclassify`, lifecycle `report`, `approve`, `continue`, `request-changes`, `block`, `unblock`, or `cancel`.

`doctor` diagnoses runtime/state/lock/transaction/path health. `doctor --repair` may remove only malformed/provably stale locks, recover a non-conflicting interrupted transaction, and migrate schema-v1 state. Do not manually force recovery around an apparently live lock or a `RECOVERY_CONFLICT`.

## Preflight — automatic

1. Read `AGENTS.md` if present.
2. Run engine `doctor`. If it reports a repairable stale condition, use `doctor --repair`; otherwise stop on failures.
3. If state exists, run `status` and `next` and resume it unless terminal.
4. Load only relevant project-baseline documents and inspect source/configuration needed for the request.
5. For a new change, classify Low/Standard/High risk and decide the five workflow flags.
6. Initialize via engine `init`, preserving the original request.
7. If new pre-Implementation evidence changes routing, use `reclassify`; never edit state directly.

Preflight is not a user-facing stage and should not create ceremony.

## Risk profiles

**Low** — isolated, reversible, no meaningful security/data/architecture impact. Default: Requirements → Plan → Implement → Verify.

**Standard** — multiple files/components, user-visible behavior, API/data-model impact, or moderate rollback/testing complexity. Planning gate and final acceptance are required; Design/Review are explicit decisions.

**High** — auth/authorization, sensitive data, migrations, public contracts, infrastructure/deployment, difficult rollback, architecture boundaries, broad refactors, or production-critical work. Design, planning gate, independent Review, and final acceptance are required.

If uncertain, choose the higher risk. The engine validates risk/flag invariants.

## Requirements

Load `references/requirements.md`, create `requirements.md`, then report `requirements_complete`. Requirements always execute with depth proportional to the change. User stories and NFRs are sections, not separate stages.

## Design — conditional

When `workflow.design_required=true`, load `references/design.md`, create `design.md`, then report `design_complete`. Use Design only for consequential structure/contracts/data/security/infrastructure/failure/migration decisions.

## Plan

Load `references/plan.md`, create an executable Plan with Work checkboxes and verification strategy, then report `plan_complete`.

If a planning gate opens:

- `approve` → approved hold; stop.
- `continue` → implementation authorized.
- `request-changes` → reopen Plan.

## Implementation

Load `references/implementation.md`. Execute the approved/current Plan using the active runtime. Delegation and parallelism are allowed, but the parent agent reconciles work, preserves unrelated changes, keeps Plan checkboxes current, and updates durable project context when project truth changes.

Report `implementation_complete` only when the implementation predicate passes. The engine routes to Review or Verification.

## Review — conditional

When required, load `references/review.md`; obtain independent review and record an explicit verdict. `review_pass` routes forward; `review_fail` returns to Implementation and invalidates downstream progress.

## Verification

Load `references/verification.md`. Map every acceptance criterion to actual evidence. Anything not checked is `NOT VERIFIED`. Report `verification_complete` only after writing the evidence artifact.

If Final Acceptance is required, explicit acceptance uses `report accept`; requested changes use `request-changes` and return to Implementation.

## Cancellation

If the user abandons the change, use `cancel --reason <text>`. Cancellation is terminal, preserves artifacts/audit/source, and permits a later new change. Do not delete the active state file to simulate cancellation.

## Contracts

Load only when relevant:

- `references/state.md` — schema, revision, lock, transaction, recovery, terminal states.
- `references/transition-contract.md` — legal sequencing and hardening invariants.
- `references/completion-predicates.md` — mechanically testable completion requirements.
- `references/engine-contract.md` — agent/engine authority boundary.
- `schemas/aidlc-state.schema.json` — canonical external state schema.

## Context discipline

Use engine `next` to determine the current lifecycle directive, then load only that stage's reference plus relevant project/change artifacts. Source/configuration are authoritative for mechanically discoverable facts; durable docs should store decisions, constraints, commands, and architectural context that are expensive or ambiguous to rediscover.
