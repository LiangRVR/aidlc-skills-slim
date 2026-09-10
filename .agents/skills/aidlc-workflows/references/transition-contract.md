# Transition Contract

This file defines the deterministic lifecycle contract for AI-DLC Slim. A future state engine must implement these transitions exactly. The active agent may decide workflow flags during Preflight, but after they are persisted the engine owns legal sequencing.

## Events

The engine recognizes only these lifecycle events:

- `initialize` — create a new active change and persist workflow flags.
- `requirements_complete` — mark Requirements complete.
- `design_complete` — mark Design complete when required.
- `plan_complete` — mark Plan complete and either open the planning gate or advance directly when no gate is required.
- `approve` — approve the current planning gate and hold.
- `continue` — satisfy the current planning gate and enter Implementation. When called on an open planning gate it implies approval.
- `request_changes` — reject/reopen the current planning gate or final acceptance and return to the owning stage.
- `implementation_complete` — mark Implementation complete and enter Review or Verification according to `workflow.review_required`.
- `review_pass` — mark Review complete and enter Verification.
- `review_fail` — mark Review blocked and return to Implementation for remediation.
- `verification_complete` — mark Verification complete and either open Final Acceptance or complete directly according to `workflow.final_acceptance_required`.
- `accept` — satisfy Final Acceptance and complete the workflow.
- `block` — set the current stage status to blocked with at least one blocker.
- `unblock` — clear resolved blockers and return the current stage to active.

No other event may mutate lifecycle state.

## Legal transitions

| Current stage/status | Event | Preconditions | Next stage/status |
|---|---|---|---|
| none | `initialize` | no active change | requirements / active |
| requirements / active | `requirements_complete` | Requirements completion predicate passes | design / active if design required; otherwise plan / active |
| design / active | `design_complete` | `design_required=true` and Design predicate passes | plan / active |
| plan / active | `plan_complete` | Plan predicate passes | plan / awaiting_approval if planning gate required; otherwise implementation / active |
| plan / awaiting_approval | `approve` | planning gate open | plan / approved_hold |
| plan / awaiting_approval | `continue` | planning gate open | implementation / active |
| plan / approved_hold | `continue` | planning gate approved_hold | implementation / active |
| plan / awaiting_approval or approved_hold | `request_changes` | planning gate exists | plan / active |
| implementation / active | `implementation_complete` | Implementation predicate passes | review / active if review required; otherwise verification / active |
| review / active | `review_pass` | Review predicate passes | verification / active |
| review / active | `review_fail` | blocking finding recorded | implementation / active |
| verification / active | `verification_complete` | Verification predicate passes | final_acceptance / awaiting_acceptance if required; otherwise complete / complete |
| final_acceptance / awaiting_acceptance | `accept` | final acceptance gate open | complete / complete |
| final_acceptance / awaiting_acceptance | `request_changes` | final acceptance gate open | implementation / active |
| any active stage | `block` | blocker supplied | same stage / blocked |
| any stage / blocked | `unblock` | blockers empty after update | same stage / active |

## Illegal-transition rule

If the current stage/status and requested event do not match a row above, reject the transition without mutating state.

Examples that must be rejected:

- `approve` during Requirements;
- `continue` when no planning gate exists;
- `implementation_complete` before Plan is complete;
- `review_pass` when `review_required=false`;
- `verification_complete` while required evidence is missing;
- `accept` before Final Acceptance is open;
- starting a second change while another change is active.

## Workflow-flag invariants

Workflow flags are persisted at initialization and may be changed only through an explicit workflow reclassification before Implementation begins.

Minimum invariants:

- `risk=high` requires `design_required=true`, `planning_gate_required=true`, `review_required=true`, and `final_acceptance_required=true`.
- `risk=standard` requires `planning_gate_required=true` and `final_acceptance_required=true`; Design and Review remain explicit decisions.
- `risk=low` defaults to no planning gate, no independent review, and no final-acceptance gate unless a consequential decision or residual risk makes one required.
- `security_required=true` whenever any automatic security trigger in `security.md` applies, regardless of risk label.

The engine must validate invariants before accepting initialization or workflow reclassification.

## Approval semantics

`approve` and `continue` are intentionally different events.

- `approve` changes an open planning gate to `approved_hold` and does not advance the stage.
- `continue` on an open planning gate records approval and advances to Implementation.
- `continue` on an `approved_hold` gate advances without asking for approval again.
- ambiguous natural-language intent is classified by the active agent before calling the engine; ambiguity must resolve to `approve`, not `continue`.

## Rework semantics

`request_changes` at the planning gate returns to Plan. If the requested change invalidates Requirements or Design, the active agent must explicitly move the workflow back by starting a new corrected stage sequence in the future engine rather than silently editing approved upstream artifacts. v0.1 may conservatively require reinitialization of downstream progress after such a change.

`review_fail` and final-acceptance `request_changes` return to Implementation. Verification and later progress become stale and must be rerun after code changes.
