---
name: aidlc-workflows
description: Slim, runtime-agnostic AI-DLC workflow for structured software changes. Use for requirements, design, implementation planning, coding, verification, and durable project context. The workflow governs lifecycle and evidence but never overrides the active agent's execution, delegation, model, or tool strategy.
license: MIT
---

# AI-DLC Slim

AI-DLC Slim defines **what development process must be satisfied**. The currently active agent defines **how the work is executed**.

Do not hardcode agent names, models, providers, MCPs, or orchestration frameworks. The active agent may work directly or delegate. Delegated workers may produce artifacts or code, but they may not approve gates, mutate AI-DLC state, or declare the workflow complete. The active parent agent reconciles their work and owns semantic verification.

## Non-negotiable rules

1. There is exactly one workflow cursor: `aidlc-docs/aidlc-state.json`.
2. Durable project truth lives in `aidlc-docs/project/`; per-change work lives in `aidlc-docs/changes/<date>-<slug>/`.
3. Never start a competing end-to-end lifecycle while an AI-DLC change is active. Delegation inside the current stage is allowed.
4. Never claim completion from intent or worker reports. Completion requires current evidence from Verification.
5. Never weaken, skip, delete, or rewrite a failing test/check merely to obtain a passing result without explicit user authorization.
6. At a planning gate, `approve` means approve-and-hold. `continue`/`proceed` means approve-and-continue. Ambiguous approval means hold.
7. Security requirements activate automatically when the change touches auth, authorization, secrets, PII, payments, uploads, external input, exposed APIs, production infrastructure, networking, or destructive operations.
8. All lifecycle-state mutations go through the deterministic engine. Direct edits to `aidlc-state.json` are recovery-only.
9. Workflow-routing decisions are persisted at initialization; do not repeatedly infer Design, gate, Review, acceptance, or security requirements afterward.
10. Legal transitions and stage completion are governed by `references/transition-contract.md` and `references/completion-predicates.md`.

## Engine

Engine source is under `engine/`. Build it once after installation:

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm run build
```

From the managed project, invoke:

```bash
node .agents/skills/aidlc-workflows/engine/dist/src/cli.js <command>
```

When the Skill is installed elsewhere, invoke that engine path with `--root <project-root>`.

Use `next` and `status` for read-only inspection. Use `init`, `report`, `approve`, `continue`, `request-changes`, `block`, `unblock`, and `report accept` for lifecycle mutations. Never edit the state file as the normal progression mechanism.

## Preflight — automatic, not a user-facing stage

At the start of every invocation:

1. Read `AGENTS.md` if present.
2. If `aidlc-docs/aidlc-state.json` exists, call engine `status` and `next`; resume the active change rather than silently creating another.
3. Load only project-baseline documents relevant to the task.
4. Inspect source/configuration needed to ground the change.
5. If the project baseline is missing, stale, or materially incomplete, follow `references/project-baseline.md`.
6. For a new change, classify Low/Standard/High risk and decide the five workflow flags.
7. Initialize those decisions and the original request through engine `init`.

Preflight should not produce ceremony or an approval prompt unless it discovers a consequential ambiguity.

## Risk profiles

**Low** — isolated, reversible, no meaningful security/data/architecture impact. Default flow: Requirements → Plan → Implement → Verify. A gate/review/acceptance may still be enabled explicitly when warranted.

**Standard** — multiple files/components, user-visible behavior, API/data-model impact, or moderate rollback/testing complexity. Planning gate and final acceptance are required; Design and Review are explicit decisions.

**High** — auth/authorization, sensitive data, migrations, public contracts, infrastructure/deployment, difficult rollback, architecture boundaries, broad refactors, or other production-critical work. Design, planning gate, independent Review, and final acceptance are required.

If uncertain between two levels, choose the higher level. The engine validates persisted risk/flag invariants.

## Stage 1 — Requirements

Load `references/requirements.md`. Create the Requirements artifact, then report `requirements_complete`. The engine accepts the transition only when its mechanically testable predicate passes.

Requirements always execute, but depth is proportional to the change. Capture behavior, invariants, acceptance criteria, constraints, and explicit non-goals. Ask only questions whose answers materially change requirements, design, risk, or verification.

User stories and NFRs are sections inside `requirements.md` when useful; they are not separate lifecycle stages.

## Stage 2 — Design (conditional)

Execute only when `workflow.design_required=true`. Load `references/design.md`, create the artifact, then report `design_complete`.

Design is required when the change affects architecture, component/service boundaries, contracts, schemas, data flow, security boundaries, infrastructure, migration behavior, failure/recovery behavior, or another consequential technical decision.

If an approved design changes durable project architecture, update the project baseline during implementation and create an ADR only when the rationale should survive future refactors.

## Stage 3 — Plan

Load `references/plan.md`. Create a concrete executable plan, including affected areas, ordered work, dependencies, verification strategy, and rollback/migration notes when relevant. Then report `plan_complete`.

Work units may support parallel/delegated execution, but AI-DLC never prescribes which agent performs them.

### Planning gate

If `workflow.planning_gate_required=true`, `plan_complete` opens the planning gate.

Classify the user's response into exactly one engine command:

- **`approve`** — approve-and-hold. Do not start Implementation.
- **`continue`** — approve-and-continue. Enter Implementation.
- **`request-changes`** — reopen Plan for revision.

Approval plus an explicit instruction not to continue is `approve`. Ambiguity is `approve`.

## Stage 4 — Implementation

Load `references/implementation.md` and execute the approved/current Plan using the active runtime. The active agent may delegate, parallelize independent work, or call tools. AI-DLC imposes no routing policy.

The active parent agent must preserve unrelated changes, reconcile delegated output, keep Plan Work checkboxes current, return upstream if a consequential new decision appears, and update durable project-baseline documents when implementation changes project truth.

When implementation work is complete, report `implementation_complete`. The engine routes to Review or Verification according to persisted workflow flags.

## Review — conditional lifecycle state

When `workflow.review_required=true`, load `references/review.md`. Obtain an independent review using an available review capability and record an explicit verdict in `review.md`.

- report `review_pass` for `Verdict: PASS`;
- report `review_fail` for a blocking `FAIL`/`CHANGES_REQUIRED` verdict.

A failed review returns to Implementation and invalidates downstream Review/Verification progress. If implementation changes after review, review again.

## Stage 5 — Verification

Load `references/verification.md`. Run checks appropriate to the changed area and map every acceptance criterion to actual evidence. User-visible behavior should be exercised in the real product surface when the environment permits it.

Anything not actually checked is `NOT VERIFIED`, not inferred as passing. Create `verification.md`, then report `verification_complete`. A mandatory failed criterion blocks the transition.

## Final acceptance

If `workflow.final_acceptance_required=true`, successful Verification opens Final Acceptance. Explicit user acceptance is reported with `report accept`; requested changes use `request-changes` and return to Implementation with downstream evidence invalidated.

If final acceptance is not required, successful Verification completes the workflow directly.

## State, transitions, and audit

Load these contracts only when relevant:

- `references/state.md` — canonical JSON state and ownership.
- `references/transition-contract.md` — legal events/transitions and invariants.
- `references/completion-predicates.md` — minimum completion requirements.
- `references/engine-contract.md` — engine/agent boundary.
- `schemas/aidlc-state.schema.json` — canonical external state schema.

Audit only events Git does not capture well: original request, material answers, gate decisions, consequential design/risk decisions, explicit risk acceptance, material recovery, and final acceptance. The engine writes its lifecycle audit events; the active agent appends semantic decisions outside engine events when necessary.

## Security

Load `references/security.md` automatically when `workflow.security_required=true`. Security is not an opt-in extension.

## Context discipline

Call engine `next` to determine the current lifecycle directive, then load only the current stage reference plus relevant project/change artifacts. Do not preload every reference file. Source code/configuration are authoritative for mechanically discoverable facts; durable docs contain decisions, constraints, commands, and architectural context that are expensive or ambiguous to rediscover.
