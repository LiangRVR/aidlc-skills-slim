# State Contract

`aidlc-docs/aidlc-state.json` is the only workflow cursor. Do not maintain a parallel Markdown state or `MEMORY.md`.

The canonical external schema is `schemas/aidlc-state.schema.json`. Engine v0.1 validates the same version-1 structure and invariants before accepting transitions.

## Initialization decisions

During Preflight, the active parent agent makes the semantic routing decisions once and supplies them to `aidlc-engine init`:

- `risk`: `low | standard | high`
- `workflow.design_required`
- `workflow.planning_gate_required`
- `workflow.review_required`
- `workflow.final_acceptance_required`
- `workflow.security_required`

These are decisions, not repeatedly inferred properties. Once initialized, lifecycle mutations go through the engine.

## Canonical state example

```json
{
  "schema_version": 1,
  "active_change": "260910-auth",
  "risk": "high",
  "risk_rationale": "Authentication changes affect authorization boundaries and user data.",
  "workflow": {
    "design_required": true,
    "planning_gate_required": true,
    "review_required": true,
    "final_acceptance_required": true,
    "security_required": true
  },
  "stage": "plan",
  "status": "awaiting_approval",
  "gate": {
    "type": "planning",
    "status": "open"
  },
  "artifacts": {
    "request": "aidlc-docs/changes/260910-auth/request.md",
    "requirements": "aidlc-docs/changes/260910-auth/requirements.md",
    "design": "aidlc-docs/changes/260910-auth/design.md",
    "plan": "aidlc-docs/changes/260910-auth/plan.md",
    "review": "aidlc-docs/changes/260910-auth/review.md",
    "verification": "aidlc-docs/changes/260910-auth/verification.md"
  },
  "progress": {
    "requirements": "complete",
    "design": "complete",
    "plan": "complete",
    "implementation": "pending",
    "review": "pending",
    "verification": "pending",
    "final_acceptance": "pending"
  },
  "blockers": []
}
```

## Ownership

- The active agent owns semantic decisions and artifacts.
- The deterministic engine owns lifecycle-state mutations.
- Delegated workers never edit `aidlc-state.json`.
- Direct state edits are recovery-only. After recovery, validate with `aidlc-engine status` and record material recovery in the change audit.
- If state conflicts with actual artifacts/source, stop progression and inspect the change directory and Git history before recovery.

## Transition authority

Legal events, transitions, approval semantics, and workflow invariants are defined in `transition-contract.md` and implemented by `engine/src/machine.ts`.

Stage completion requirements are defined in `completion-predicates.md` and mechanically enforced where possible by `engine/src/predicates.ts`. Semantic quality remains agent/reviewer responsibility.

## Audit

Each change owns `audit.md`. Record only information Git does not capture well:

- original user request;
- material answers that alter requirements/design;
- planning approval, hold, continuation, or rejection;
- consequential design or risk decisions;
- explicit risk acceptance;
- final acceptance;
- material state recovery.

The engine writes initialization and lifecycle gate/acceptance records. The active agent remains responsible for appending semantic decisions that are outside engine events. Historical entries are append-only; Git remains the source of history for ordinary code/file edits.
