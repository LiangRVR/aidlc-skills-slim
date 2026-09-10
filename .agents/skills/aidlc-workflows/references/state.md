# State Contract

`aidlc-docs/aidlc-state.json` is the only workflow cursor. Do not maintain a parallel Markdown state or `MEMORY.md`.

The canonical machine schema is `schemas/aidlc-state.schema.json`. The state file must validate against schema version 1 before a transition is accepted.

## Initialization decisions

During Preflight, the active parent agent makes the semantic routing decisions once and persists them:

- `risk`: `low | standard | high`
- `workflow.design_required`
- `workflow.planning_gate_required`
- `workflow.review_required`
- `workflow.final_acceptance_required`
- `workflow.security_required`

These are decisions, not repeatedly inferred properties. A future deterministic engine validates their invariants using `transition-contract.md`.

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
    "review": null,
    "verification": null
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

- Only the active parent agent updates state until the deterministic engine exists.
- Delegated workers never edit `aidlc-state.json`.
- Once the engine exists, all lifecycle mutations must go through it; direct state edits become recovery-only behavior.
- If state conflicts with actual artifacts/source, stop progression, inspect the change directory and Git state, and repair conservatively. Record material recovery in the change audit.

## Transition authority

The legal events, transitions, approval semantics, and workflow invariants are defined in `transition-contract.md`. Do not invent a transition that is absent from that contract.

Stage completion requirements are defined in `completion-predicates.md`. A completion event may not be reported until its predicate passes.

## Audit

Each change owns `audit.md`. Log only information Git does not capture well:

- original user request;
- material answers that alter requirements/design;
- planning approval, hold, continuation, or rejection;
- consequential design or risk decisions;
- explicit risk acceptance;
- final acceptance;
- material state recovery.

Use timestamps. Preserve historical entries; corrections are appended rather than rewritten. Git remains the source of history for normal file/code edits.
