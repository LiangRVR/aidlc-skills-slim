# Transition Contract

AI-DLC Slim lifecycle remains Requirements → optional Design → Plan → Implementation → optional Review → Verification → optional Final Acceptance. Engine v0.2 adds evidence freshness without adding methodology stages.

## Lifecycle events

`requirements_complete`, `design_complete`, `plan_complete`, `approve`, `continue`, `request_changes`, `implementation_complete`, `review_pass`, `review_fail`, `verification_complete`, and `accept` retain the lifecycle semantics. `block`/`unblock` manage temporary blockers. `reclassify` may replace risk/routing only before Implementation.

`freshness` and `next` are read-only. `refresh` is a controlled mutation that is legal only when stale dependencies exist and the workflow is not blocked/cancelled.

## Freshness dependency order

```text
Requirements
  → Design
  → Plan
  → Planning Approval
  → Implementation
  → Review
  → Verification
  → Final Acceptance
```

Conditional nodes that are not required are skipped. A stale dependency invalidates itself and everything downstream; upstream receipts remain intact.

Examples:
- Requirements artifact changed → reopen Requirements and clear all downstream receipts.
- Design changed → preserve completed Requirements, reopen Design, clear Plan onward.
- Plan semantic content changed → reopen Plan, clear approval onward.
- Source changed after Implementation → reopen Implementation, clear Review/Verification/Acceptance.
- Review artifact changed after PASS → reopen Review, clear Verification/Acceptance.
- checks.json, verification.md, or selected check evidence changed → reopen Verification and clear Acceptance.
- accepted source/evidence changed → an earlier source/verification dependency will normally be the first stale dependency and drives the reroute.

Plan checkbox marks `[ ]`/`[x]` are normalized for the Plan fingerprint because they represent execution progress. Other Plan content remains freshness-significant.

## Approval invariant

A planning approval receipt contains the exact completed Plan bundle fingerprint. `approve` records approval and holds. `continue` records continuation and advances only if the current Plan fingerprint still matches. A stale approval cannot authorize Implementation.

## Implementation/Review invariant

`implementation_complete` binds the current Plan bundle to a Git source digest and source-manifest digest. Review PASS binds `review.md` to that exact source. Any later source change makes those downstream claims stale.

## Verification invariant

Configured required checks must have current PASS receipts. A receipt is current only when its command/cwd definition matches and its before/after source digests both equal the current Implementation source. A check that changes source is STALE.

Verification completion binds source, verification.md, selected structured check evidence, and the current checks configuration fingerprint.

## Cancellation

`cancel --reason <text>` is legal from any non-terminal workflow state, including blocked/gated states. It clears the gate/blockers, records audit, and transitions to `cancelled/cancelled` without deleting artifacts/source/evidence. Cancelled workflows ignore freshness.

## Revision invariant

Initialization without prior state starts at revision 1. Every accepted mutation increments revision exactly once. Starting a new change after completed/cancelled work continues the monotonic sequence. Rejected/read-only operations do not increment revision.

## Concurrency and recovery

Every mutating command holds the exclusive workflow lock for read → validate → compute → transact. A competing mutator receives `WORKFLOW_LOCKED`.

A pending transaction blocks normal progression. `doctor --repair` rolls it forward only when each tracked file matches its recorded before or after image; otherwise it reports `RECOVERY_CONFLICT`.

## Workflow invariants

High risk requires Design, Planning Gate, Review, and Final Acceptance. Standard risk requires Planning Gate and Final Acceptance. Security remains automatic whenever security triggers apply.
