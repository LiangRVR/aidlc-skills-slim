# Transition Contract

This file defines the deterministic lifecycle contract for AI-DLC Slim. Engine v0.1 implements these transitions. The active agent decides semantic workflow routing; once persisted, the engine owns legal sequencing.

## Lifecycle events

- `initialize` — create a new active change and persist workflow flags.
- `requirements_complete` — mark Requirements complete.
- `design_complete` — mark Design complete when required.
- `plan_complete` — mark Plan complete and either open the planning gate or advance directly when no gate is required.
- `approve` — approve the current planning gate and hold.
- `continue` — satisfy the current planning gate and enter Implementation. On an open gate it implies approval.
- `request_changes` — reject/reopen the current planning gate or Final Acceptance and return to the owning stage.
- `implementation_complete` — mark Implementation complete and enter Review or Verification according to `workflow.review_required`.
- `review_pass` — mark Review complete and enter Verification.
- `review_fail` — return to Implementation for remediation and invalidate downstream progress.
- `verification_complete` — mark Verification complete and either open Final Acceptance or complete directly according to `workflow.final_acceptance_required`.
- `accept` — satisfy Final Acceptance and complete the workflow.
- `block` — set the current active stage to blocked with a blocker.
- `unblock` — clear resolved blockers and return the same stage to active.

`reclassify` is a controlled routing mutation rather than a stage-completion event. Its rules are defined below.

## Legal transitions

| Current stage/status | Event | Preconditions | Next stage/status |
|---|---|---|---|
| none | `initialize` | no active change | requirements / active |
| requirements / active | `requirements_complete` | Requirements predicate passes | design / active if required; otherwise plan / active |
| design / active | `design_complete` | `design_required=true` and Design predicate passes | plan / active |
| plan / active | `plan_complete` | Plan predicate passes | plan / awaiting_approval if gate required; otherwise implementation / active |
| plan / awaiting_approval | `approve` | planning gate open | plan / approved_hold |
| plan / awaiting_approval | `continue` | planning gate open | implementation / active |
| plan / approved_hold | `continue` | planning gate approved_hold | implementation / active |
| plan / awaiting_approval or approved_hold | `request_changes` | planning gate exists | plan / active |
| implementation / active | `implementation_complete` | Implementation predicate passes | review / active if required; otherwise verification / active |
| review / active | `review_pass` | Review PASS predicate passes | verification / active |
| review / active | `review_fail` | Review FAIL/CHANGES_REQUIRED predicate passes | implementation / active |
| verification / active | `verification_complete` | Verification predicate passes | final_acceptance / awaiting_acceptance if required; otherwise complete / complete |
| final_acceptance / awaiting_acceptance | `accept` | final acceptance gate open | complete / complete |
| final_acceptance / awaiting_acceptance | `request_changes` | final acceptance gate open | implementation / active |
| any active stage | `block` | non-empty blocker supplied | same stage / blocked |
| any stage / blocked | `unblock` | all blockers resolved | same stage / active |

If the current stage/status and requested event do not match a legal transition, reject it without mutating state.

## Workflow-flag invariants

Workflow routing is persisted at initialization. Minimum invariants:

- `risk=high` requires `design_required=true`, `planning_gate_required=true`, `review_required=true`, and `final_acceptance_required=true`.
- `risk=standard` requires `planning_gate_required=true` and `final_acceptance_required=true`; Design and Review remain explicit decisions.
- `risk=low` defaults to no planning gate, independent review, or final-acceptance gate unless a consequential decision/residual risk requires one.
- `security_required=true` whenever an automatic security trigger in `security.md` applies, regardless of the risk label.

The engine validates these invariants at initialization, reclassification, state load, and before committing a transition.

## Reclassification

Requirements or repository inspection may reveal that the initial routing decision was wrong. Engine v0.1 therefore exposes explicit `reclassify` before Implementation begins.

Allowed from unblocked Requirements, Design, or Plan, including an open/approved-hold planning gate. It is forbidden once Implementation has started.

Reclassification must provide a complete replacement risk, rationale, and workflow-flag set. The engine then:

1. validates the new risk/flag invariants;
2. clears any planning gate/approval;
3. preserves completed Requirements;
4. preserves completed Design only when Design was already required and remains required;
5. routes to Design when Design becomes newly required;
6. otherwise routes to a fresh Plan when Requirements are complete;
7. resets Plan and all downstream progress;
8. resets Review/Final-Acceptance applicability from the new flags;
9. appends an audit record.

This conservative invalidation prevents an approval from surviving a material workflow/risk change.

## Approval semantics

`approve` and `continue` are intentionally different.

- `approve` changes an open planning gate to `approved_hold` and does not advance.
- `continue` on an open planning gate records approval and enters Implementation.
- `continue` on `approved_hold` enters Implementation without reapproval.
- ambiguous natural-language intent is classified by the active agent before calling the engine; ambiguity resolves to `approve`, never `continue`.

## Rework semantics

`request_changes` at the planning gate returns to Plan and removes the current approval. If the change also alters workflow risk/routing, use `reclassify` before Implementation.

`review_fail` and Final-Acceptance `request_changes` return to Implementation. Review/Verification and later progress are reset as applicable and must be rerun after code changes.

Upstream semantic edits that do not change workflow flags still require the active agent to keep Requirements/Design/Plan mutually consistent; stronger artifact-freshness enforcement is deferred to v0.2.
