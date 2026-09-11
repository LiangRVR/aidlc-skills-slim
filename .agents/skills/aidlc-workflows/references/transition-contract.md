# Transition Contract

AI-DLC Slim lifecycle remains Requirements → optional Design → Plan → Implementation → optional Review → Verification → optional Final Acceptance. Engine v0.1.1 hardens the state store without adding methodology stages.

## Lifecycle events

`requirements_complete`, `design_complete`, `plan_complete`, `approve`, `continue`, `request_changes`, `implementation_complete`, `review_pass`, `review_fail`, `verification_complete`, and `accept` retain the v0.1 transition semantics. `block`/`unblock` manage temporary blockers. `reclassify` may replace risk/routing only before Implementation.

## Cancellation

`cancel --reason <text>` is legal from any non-terminal workflow state, including blocked or gated states. It clears the current gate and blockers, records an audit entry, and transitions to `cancelled/cancelled`. It does not delete per-change artifacts or source changes. `cancel` is illegal from `complete` or `cancelled`.

## Revision invariant

Initialization without prior state starts at revision 1. Every accepted mutation increments revision exactly once. Starting a new change after a completed/cancelled workflow continues the monotonic revision sequence. Rejected operations do not increment revision.

## Concurrency invariant

Every mutating command must hold the exclusive workflow lock for the complete read → validate → compute → transact sequence. A second mutator receives `WORKFLOW_LOCKED`; there is no last-writer-wins behavior.

## Recovery invariant

A pending transaction makes normal progression illegal. `doctor --repair` may roll the transaction forward only if each recorded file matches its before or after image. Otherwise it reports `RECOVERY_CONFLICT` and leaves files unchanged.

## Workflow invariants

High risk requires Design, Planning Gate, Review, and Final Acceptance. Standard risk requires Planning Gate and Final Acceptance. Security remains automatic whenever security triggers apply.

`approve` means approve-and-hold. `continue` on an open planning gate approves and advances; `continue` on approved-hold advances without reapproval. Ambiguous natural language is classified as `approve`, not `continue`.
