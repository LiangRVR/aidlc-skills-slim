# Completion Predicates

A stage may report completion only when its structural predicate is satisfied and its upstream dependencies are fresh. Semantic quality remains the responsibility of the active agent or independent reviewer; the engine establishes identity/freshness, not meaning.

## Requirements

Required:
- `request.md` exists and preserves the original request.
- `requirements.md` contains intent, acceptance criteria, preservation constraints, constraints, and out-of-scope content required by the Requirements contract.
- no unresolved blocker exists.
- workflow routing flags are persisted.

On completion the engine stores a fingerprint of `request.md` + `requirements.md`.

## Design

Applies only when `workflow.design_required=true`.

Required:
- `design.md` passes the Design structural predicate.
- consequential architecture impacts are identified.
- no unresolved blocker exists.
- current Requirements fingerprint remains fresh.

Completion stores a receipt bound to current Requirements + Design.

If Design is not required, progress is `not_applicable` and `design_complete` is illegal.

## Plan

Required:
- `plan.md` contains concrete Work checkboxes and verification strategy.
- acceptance criteria have verification paths.
- dependencies and migration/rollback content exist when applicable.
- no consequential unresolved decision/blocker remains.
- current Requirements/Design receipts remain fresh.

Completion stores a semantic Plan fingerprint. Checkbox completion marks are normalized because they are execution progress; task text/scope/order are freshness-significant.

If a planning gate is required, Plan completion only opens the gate. Approval/continuation receipts must match the exact Plan bundle before Implementation is authorized.

## Implementation

Required:
- every in-scope Plan checkbox is complete or has an explicit scope decision/blocker.
- source/config/docs are reconciled by the parent agent.
- durable project baseline is updated when needed.
- current Plan/approval receipts are fresh.
- no unresolved blocker exists.

Completion captures the current Git source digest and source-manifest digest relative to the change baseline. Implementation completion does not imply correctness; it establishes the exact implementation snapshot ready for Review/Verification.

## Review

Applies only when `workflow.review_required=true`.

For `review_pass`:
- `review.md` exists and passes the Review structural predicate.
- reviewer examined actual implementation plus relevant lifecycle artifacts.
- blocking findings are resolved.
- verdict is explicit PASS.
- current Implementation source receipt is fresh.

PASS stores a receipt binding `review.md` to the exact source digest. Source or review-artifact changes afterward make Review stale.

For `review_fail`, `review.md` records a blocking finding and FAIL/CHANGES_REQUIRED; the workflow returns to Implementation and clears downstream receipts.

## Verification

Required:
- `verification.md` exists and maps every acceptance criterion to PASS/FAIL/NOT VERIFIED with evidence/rationale.
- current Implementation source and required Review receipt are fresh.
- every configured `required:true` check in `aidlc-docs/project/checks.json` has a current PASS receipt for the exact source and current command definition.
- source-mutating checks do not count as PASS evidence.
- user-visible/runtime behavior is exercised when feasible or explicitly NOT VERIFIED.
- limitations/residual risks are recorded.
- no unresolved blocker exists.

Completion stores a receipt binding current source, verification.md, selected executable evidence receipts, and checks configuration. NOT VERIFIED is allowed only with explicit residual limitation/risk and no contradictory mandatory FAIL.

## Final Acceptance

Applies only when `workflow.final_acceptance_required=true`.

Required:
- Verification is complete and fresh.
- final-acceptance gate is open.
- user explicitly accepts the implementation/evidence.

Acceptance stores the exact verified source/evidence identity. Requested changes return to Implementation and clear downstream receipts.

## Complete

Lifecycle completion requires Requirements, Plan, Implementation, and Verification complete; conditional Design/Review complete or not applicable; required gates satisfied; no blockers; and current receipts for all completed dependencies.

`complete` is not immunity from later drift. `next`/`freshness` continue to detect changes to bound source/evidence after completion and require reconciliation when necessary.
