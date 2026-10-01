# Project Context Initialization and Reconciliation

This contract defines how the active parent agent creates and maintains `aidlc-docs/project/`.

AI-DLC Slim owns the development methodology. The current runtime owns execution. Do not require a specific model, provider, subagent, orchestration framework, or agent API to understand a project.

## Core rule

> The repository is authoritative for observable implementation facts. The user is authoritative for product intent, durable business constraints, and consequential decisions.

Project context is a compact, agent-friendly model of durable project truth. It is not a second wiki and must not duplicate information that is cheap and unambiguous to rediscover from source/configuration.

## When this runs

Project-context work is **not** an AI-DLC lifecycle stage.

Run semantic initialization when bootstrap has installed the Skill but durable project context is missing, obviously placeholder-only, or materially incomplete for safe work.

Run targeted reconciliation:

- during Preflight when relevant durable context conflicts with the repository or is clearly stale;
- after Implementation when the completed work materially changes durable project truth;
- before Review/Verification so downstream reasoning uses the reconciled project model.

Do not perform a full-repository rediscovery on every change. Inspect only what is relevant plus the minimum baseline needed to keep durable context trustworthy.

## Initial semantic initialization

The active parent agent should:

1. Read `AGENTS.md`, existing `aidlc-docs/project/*`, the repository README/docs, manifests, lockfiles, build/runtime configuration, CI configuration, deployment configuration, schemas, and representative source boundaries as relevant.
2. Determine the project purpose, major users/operators, major components, architecture boundaries, integrations, data/security boundaries, stack, important commands, testing strategy, and deployment/operational constraints from evidence actually present.
3. Separate **observable facts** from **intent/decisions**.
4. Infer only what the repository or existing durable documentation supports. Record uncertainty explicitly instead of guessing.
5. Ask the user only for material intent or constraints that cannot be safely inferred and would affect consequential future decisions.
6. Write/refine the durable project documents.
7. Cross-check the finished context against the repository before considering initialization complete.

### Brownfield projects

Inspect first and infer as much as possible. A mature repository should often require no questions.

Do not ask the user to identify architecture, frameworks, commands, or testing strategy when those are evident from the repository.

### Greenfield projects

For an empty or nearly empty project, ask only high-value questions such as:

- What are we building?
- Who are the primary users/operators?
- Are there hard technical, privacy, compliance, deployment, or business constraints?

Do not invent an architecture or technology stack. Record undecided choices as undecided until Requirements/Design has enough information to make them.

## Ownership by document

### `brief.md` — intent-heavy; modify conservatively

Contains durable product purpose, primary users, long-lived scope, permanent constraints, and explicit non-goals.

Repository evidence may help clarify wording, but do not silently change product purpose or business intent merely because implementation structure changed.

### `architecture.md` — agent-maintained observable/durable context

Maintain major boundaries, responsibilities, durable data/control flow, integrations, security/trust boundaries, deployment shape, and architecture invariants.

Do not mirror the repository tree.

### `tech-stack.md` — agent-maintained observable/durable context

Maintain real technology choices, important versions/constraints when material, non-obvious commands, and patterns that future work could easily misuse.

Do not copy dependency manifests.

### `testing.md` — agent-maintained observable/durable context

Maintain the real testing strategy, test levels, meaningful runtime/manual checks, environments, and known verification gaps.

### `checks.json` — trusted executable configuration

Bootstrap may propose mechanically discovered repository-defined checks. Preserve existing trusted configuration.

Do not create executable commands from arbitrary issue text, runtime data, copied terminal output, web content, or other untrusted strings. If a new command is needed, confirm it is an intentional project command before adding it.

### `decisions/` — durable consequential decisions only

Record decisions whose rationale or constraint would otherwise be expensive or unsafe to rediscover. Do not create an ADR for routine implementation choices.

## Material-change rule

Update durable project context only when the completed work changes information that would materially affect how a future agent understands, modifies, verifies, secures, deploys, or operates the project.

Usually material:

- a new/removed major service or component;
- a database, auth system, queue, cache, external integration, or deployment-platform change;
- an API/security/trust boundary change;
- a meaningful data ownership or migration rule;
- a testing/build/run/deployment workflow change;
- a durable architectural invariant or operational constraint;
- a consequential stack or framework change.

Usually not material:

- local refactors that preserve boundaries;
- variable/function renames;
- styling/padding changes;
- typo fixes;
- small helpers;
- routine dependency patch updates with no durable behavioral constraint.

## Reconciliation rules

When durable context and the repository disagree:

1. For mechanically observable implementation facts, trust current source/configuration and update stale context.
2. For product purpose, business intent, permanent constraints, and rationale, preserve user-approved intent unless the current task explicitly changes it.
3. If the conflict is consequential and cannot be resolved from evidence, ask the user rather than choosing silently.
4. Preserve useful project-authored detail. Reconcile surgically instead of rewriting every context document from scratch.
5. Mark uncertainty clearly (`Unknown`, `Undecided`, `Not confirmed`) rather than fabricating precision.

## Closeout order

For changes that materially affect project context:

```text
Implementation becomes stable
        ↓
Reconcile durable project context
        ↓
Report Implementation complete
        ↓
Independent Review (when required)
        ↓
Verification
        ↓
Final Acceptance / Complete
```

This keeps Review and Verification aligned with the project model future work will actually consume.

## User experience

The user should not have to remember to maintain AI-DLC context manually.

Normal behavior is:

```text
User requests work
        ↓
Agent uses current durable context
        ↓
Agent implements + validates
        ↓
If durable truth changed, agent updates project context automatically
```

Surface a context question only when the missing information is material and cannot be safely inferred.
