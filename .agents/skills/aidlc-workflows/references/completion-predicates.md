# Completion Predicates

A stage may report completion only when its predicate is satisfied. Predicates define the minimum deterministic conditions a future engine can check. Semantic quality still belongs to the active agent or independent reviewer.

## Requirements

Required:

- `request.md` exists and preserves the original user request.
- `requirements.md` exists.
- `requirements.md` contains:
  - intended behavior/change;
  - acceptance criteria;
  - constraints/invariants when applicable;
  - explicit non-goals or a statement that none were identified.
- no unresolved blocker is recorded.
- workflow routing flags have been decided and persisted.

The engine checks presence and state. The active agent is responsible for semantic completeness.

## Design

Applies only when `workflow.design_required=true`.

Required:

- `design.md` exists.
- the document addresses every design-impact category that triggered Design, or explicitly marks the category not applicable with a reason.
- consequential architecture decisions that change durable project truth are identified for baseline/ADR updates.
- no unresolved blocker is recorded.

If `design_required=false`, Design progress must be `not_applicable`; a `design_complete` event is illegal.

## Plan

Required:

- `plan.md` exists.
- it contains at least one concrete implementation step.
- all acceptance criteria have a verification path or are explicitly marked manual/not currently verifiable.
- dependencies/order constraints are stated when relevant.
- migration/rollback notes exist when the change can alter persistent data, deployment, public contracts, or difficult-to-reverse behavior.
- no consequential unresolved decision remains in the plan.
- no unresolved blocker is recorded.

If `planning_gate_required=true`, `plan_complete` opens the gate and does not authorize Implementation.

## Implementation

Required:

- every in-scope Plan work item is complete, removed with an explicit scope decision, or blocked.
- no in-scope item remains silently unchecked.
- source/config/documentation changes are reconciled by the active parent agent.
- project-baseline files are updated when the change materially alters durable project truth.
- no unresolved implementation blocker is recorded.

Implementation completion does not imply correctness; it only means planned work is ready for Review/Verification.

## Review

Applies only when `workflow.review_required=true`.

Required for `review_pass`:

- `review.md` exists.
- reviewer examined the actual implementation plus relevant Requirements/Design/Plan.
- all blocking findings are resolved.
- review verdict is explicitly `PASS`.

Required for `review_fail`:

- `review.md` records at least one blocking finding and verdict `FAIL` or `CHANGES_REQUIRED`.

If implementation changes after a passing review, the review is stale and Review must run again. Hash-based freshness enforcement is deferred to engine v0.2; v0.1 must conservatively reset Review progress when implementation is reopened.

## Verification

Required:

- `verification.md` exists.
- every acceptance criterion maps to `PASS`, `FAIL`, or `NOT VERIFIED` with evidence/rationale.
- applicable project checks from `aidlc-docs/project/testing.md` were run, or each omitted check has an explicit reason.
- failing checks caused by the change are not hidden by weakening/skipping tests without explicit user authorization.
- user-visible behavior was exercised in the real product surface when feasible, otherwise marked `NOT VERIFIED`.
- known limitations and residual risks are recorded.
- no unresolved verification blocker is recorded.

`verification_complete` is allowed with `NOT VERIFIED` items only when they are explicitly surfaced as residual limitations and do not contradict a mandatory acceptance criterion. A mandatory acceptance criterion that is `FAIL` blocks completion.

## Final Acceptance

Applies only when `workflow.final_acceptance_required=true`.

Required:

- Verification is complete.
- final-acceptance gate is open.
- user explicitly accepts the implementation/evidence.

If the user requests changes, return to Implementation and invalidate Review/Verification as applicable.

## Complete

A workflow may enter `complete` only when:

- Requirements, Plan, Implementation, and Verification are complete;
- Design is complete or `not_applicable` according to `design_required`;
- Review is complete or `not_applicable` according to `review_required`;
- all required gates are satisfied;
- there are no blockers;
- `active_change` remains the completed change identifier for traceability until a later initialization explicitly archives/clears it.
