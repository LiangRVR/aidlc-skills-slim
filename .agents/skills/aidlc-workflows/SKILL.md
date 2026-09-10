---
name: aidlc-workflows
description: Slim, runtime-agnostic AI-DLC workflow for structured software changes. Use for requirements, design, implementation planning, coding, verification, and durable project context. The workflow governs lifecycle and evidence but never overrides the active agent's execution, delegation, model, or tool strategy.
license: MIT
---

# AI-DLC Slim

AI-DLC Slim defines **what development process must be satisfied**. The currently active agent defines **how the work is executed**.

Do not hardcode agent names, models, providers, MCPs, or orchestration frameworks. The active agent may work directly or delegate. Delegated workers may produce artifacts or code, but they may not approve gates, advance AI-DLC state, or declare the workflow complete. The active parent agent must reconcile their work and own verification.

## Non-negotiable rules

1. There is exactly one workflow cursor: `aidlc-docs/aidlc-state.md`.
2. Durable project truth lives in `aidlc-docs/project/`; per-change work lives in `aidlc-docs/changes/<date>-<slug>/`.
3. Never start a competing end-to-end lifecycle while an AI-DLC change is active. Delegation inside the current stage is allowed.
4. Never claim completion from intent or worker reports. Completion requires current evidence from Verification.
5. Never weaken, skip, delete, or rewrite a failing test/check merely to obtain a passing result without explicit user authorization.
6. At a gate, `approve` means approve-and-hold. `continue`/`proceed` means approve-and-continue. Ambiguous approval means hold.
7. Security requirements activate automatically when the change touches auth, authorization, secrets, PII, payments, uploads, external input, exposed APIs, production infrastructure, networking, or destructive operations.
8. The active parent agent is the only actor that updates workflow state.

## Preflight — automatic, not a user-facing stage

At the start of every invocation:

1. Read `AGENTS.md` if present.
2. Read `aidlc-docs/aidlc-state.md` if present.
3. If a change is active, resume it; do not silently create a second active change.
4. Load only the project baseline documents relevant to the task.
5. Inspect source/configuration needed to ground the change.
6. If the project baseline is missing, stale, or materially incomplete, follow `references/project-baseline.md`.
7. Classify the change as Low, Standard, or High risk.
8. Create or update the active change directory and preserve the user's original request in `request.md`.

Preflight should not produce ceremony or an approval prompt unless it discovers a consequential ambiguity.

## Risk profiles

**Low** — isolated, reversible, no meaningful security/data/architecture impact. Flow: Requirements → Plan → Implement → Verify. The user's implementation request authorizes implementation unless planning introduces a consequential decision.

**Standard** — multiple files/components, user-visible behavior, API/data-model impact, or moderate rollback/testing complexity. Flow: Requirements → Design if needed → Plan → Planning Gate → Implement → Verify.

**High** — auth/authorization, sensitive data, migrations, public contracts, infrastructure/deployment, difficult rollback, architecture boundaries, broad refactors, or other production-critical work. Flow: Requirements → Design → Plan → Planning Gate → Implement → Independent Review → Verify.

If uncertain between two levels, choose the higher level. Record the risk and concise rationale in state.

## Stage 1 — Requirements

Load `references/requirements.md`.

Requirements always execute, but depth is proportional to the change. Capture behavior, invariants, acceptance criteria, constraints, and explicit non-goals. Ask only questions whose answers materially change requirements, design, risk, or verification.

User stories and NFRs are sections inside `requirements.md` when useful; they are not separate lifecycle stages.

## Stage 2 — Design (conditional)

Load `references/design.md` when the change affects architecture, component/service boundaries, contracts, schemas, data flow, security boundaries, infrastructure, migration behavior, failure/recovery behavior, or another consequential technical decision.

Do not create `design.md` for a localized change when source conventions already determine the implementation.

If an approved design changes durable project architecture, update the project baseline and create an ADR only when the decision is consequential and alternatives/trade-offs matter.

## Stage 3 — Plan

Load `references/plan.md`.

Create a concrete, executable plan. Include affected areas, ordered work, dependencies, verification strategy, and rollback/migration notes when relevant. Work units may be listed for parallel/delegated execution, but AI-DLC never prescribes which agent performs them.

### Planning gate

Required for Standard and High risk. Also required for Low risk if the plan introduces a consequential choice not already authorized by the user.

At the gate classify the response:

- **Approve-and-Hold**: approval without continuation signal. Mark `approved-hold`; do not start implementation.
- **Approve-and-Continue**: `continue`, `proceed`, `go on`, or equivalent. Record approval and begin implementation.
- **Request Changes**: any correction, question that changes the plan, or requested modification. Revise and reopen the gate.

Approval plus an explicit instruction not to continue is always hold. Ambiguity is always hold.

## Stage 4 — Implementation

Load `references/implementation.md`.

Execute the approved/current plan using the capabilities of the active runtime. The active agent may delegate, parallelize independent work, or call tools. AI-DLC imposes no routing policy.

The active parent agent must:

- preserve unrelated working-tree changes;
- reconcile delegated output before accepting it;
- keep `plan.md` current when scope changes;
- stop and return to planning if implementation reveals a consequential new decision;
- update durable project baseline documents when the implemented change makes them stale.

For High-risk work, obtain an independent review using an available review capability before Verification. The reviewer should evaluate requirements/design/plan, actual changed artifacts, and relevant evidence; it should not merely repeat the builder's self-assessment. Resolve blocking findings and re-review changed material.

## Stage 5 — Verification

Load `references/verification.md`.

Verification is evidence-based. Run the checks appropriate to the changed area and map acceptance criteria to actual results. User-visible behavior should be exercised in the real product surface when the environment permits it.

Anything not actually checked must be labeled `NOT VERIFIED` rather than inferred as passing.

Create `verification.md` containing commands/actions, outcomes, requirement coverage, limitations, and known residual risks.

### Final acceptance

For Standard and High-risk work, present the completed implementation and verification evidence for user acceptance. For Low-risk work, present the evidence and outcome; require explicit final acceptance only if the user requested a gate or if consequential residual risk remains.

After final acceptance, mark the change complete. There is no continuation gate after completion.

## State and audit

Load `references/state.md` when creating, resuming, changing, holding, or completing workflow state.

Audit only events Git does not capture well: original request, material answers, gate decisions, consequential design/risk decisions, explicit risk acceptance, and final acceptance. Do not log every automatic action or every generated file.

## Security

Load `references/security.md` automatically when its trigger conditions apply. Security is not an opt-in extension.

## Context discipline

Load only the current stage reference plus relevant project/change artifacts. Do not preload every reference file. Source code/configuration are authoritative for mechanically discoverable facts; durable docs should contain only decisions, constraints, commands, and architecture context that are expensive or ambiguous to rediscover.
