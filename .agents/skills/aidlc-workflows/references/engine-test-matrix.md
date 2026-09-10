# Engine v0.1 Test Matrix

Before the state-machine implementation is considered complete, automated tests must cover every legal and illegal transition in `transition-contract.md`.

## Initialization

- initializes a Low-risk workflow with valid explicit flags;
- initializes Standard and High workflows only when risk invariants hold;
- rejects High-risk initialization without required Design/Gate/Review/Acceptance flags;
- rejects a second active change;
- rejects invalid state schema.

## Requirements / Design / Plan

- Requirements complete routes to Design when required;
- Requirements complete skips Design when not required;
- Design completion is illegal when `design_required=false`;
- Plan completion opens a planning gate when required;
- Plan completion routes directly to Implementation when no gate is required;
- missing completion-predicate artifacts reject the report without state mutation.

## Planning gate

- `approve` opens approved-hold and does not advance;
- `continue` from open gate approves and enters Implementation;
- `continue` from approved-hold enters Implementation without reapproval;
- `request_changes` returns to Plan;
- `approve`/`continue` are rejected outside a planning gate.

## Implementation / Review

- Implementation complete routes to Review when required;
- Implementation complete routes to Verification when Review is not required;
- Review pass routes to Verification;
- Review fail returns to Implementation;
- Review events are illegal when Review is not required;
- reopening Implementation invalidates prior Review/Verification progress.

## Verification / Acceptance

- Verification completion opens Final Acceptance when required;
- Verification completion completes directly when acceptance is not required;
- mandatory failed acceptance criterion blocks verification completion;
- explicitly surfaced `NOT VERIFIED` evidence follows completion-predicate rules;
- `accept` completes only from an open Final Acceptance gate;
- final `request_changes` returns to Implementation and invalidates downstream evidence.

## Blocking

- `block` requires at least one blocker;
- blocked stages reject normal completion events;
- `unblock` succeeds only when blockers are resolved;
- unblock returns the same lifecycle stage to active.

## Atomicity

For every rejected event:

- exit/result is failure;
- persisted state is byte-for-byte unchanged;
- no success audit event is appended.

For every accepted event:

- resulting state validates against `schemas/aidlc-state.schema.json`;
- risk/workflow invariants remain valid;
- exactly one deterministic state transition occurs.
