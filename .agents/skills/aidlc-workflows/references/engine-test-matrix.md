# Engine v0.1 Test Matrix

Automated tests must cover the legal/illegal transitions and deterministic behaviors in `transition-contract.md`.

## Initialization

- initializes a Low-risk workflow with explicit valid flags;
- initializes Standard and High workflows only when risk invariants hold;
- rejects High-risk initialization without required Design/Gate/Review/Acceptance flags;
- rejects a second active change;
- rejects invalid state structure/invariants.

## Requirements / Design / Plan

- Requirements completion routes to Design when required;
- Requirements completion skips Design when not required;
- Design completion is illegal when `design_required=false`;
- Plan completion opens a planning gate when required;
- Plan completion routes directly to Implementation when no gate is required;
- missing completion-predicate artifacts reject the report without state mutation.

## Planning gate

- `approve` produces approved-hold and does not advance;
- `continue` from an open gate approves and enters Implementation;
- `continue` from approved-hold enters Implementation without reapproval;
- `request_changes` returns to Plan;
- `approve`/`continue` are rejected outside a planning gate.

## Reclassification

- a pre-Implementation Low workflow can be promoted to High when all High invariants are supplied;
- newly required Design routes the workflow back through Design;
- reclassification at a planning gate clears approval and forces a fresh Plan;
- downstream Review/Verification/Acceptance progress is reset according to the new flags;
- reclassification is rejected after Implementation begins.

## Implementation / Review

- Implementation completion routes to Review when required;
- Implementation completion routes to Verification when Review is not required;
- unchecked Plan work blocks Implementation completion;
- Review pass routes to Verification;
- Review fail returns to Implementation;
- Review events are illegal when Review is not required;
- reopening Implementation invalidates prior Review/Verification progress.

## Verification / Acceptance

- Verification completion opens Final Acceptance when required;
- Verification completion completes directly when acceptance is not required;
- mandatory failed acceptance criterion blocks verification completion;
- explicitly surfaced `NOT VERIFIED` evidence requires residual-risk explanation;
- `accept` completes only from open Final Acceptance;
- final `request_changes` returns to Implementation and invalidates downstream evidence.

## Blocking

- `block` requires a non-empty blocker and an active stage;
- blocked stages reject normal completion events;
- `unblock` succeeds only when all blockers are resolved;
- unblock returns the same lifecycle stage to active.

## Read-only / atomicity

- `next` and `status` do not mutate state;
- rejected events leave persisted state byte-for-byte unchanged;
- rejected events do not append success audit records;
- accepted resulting state satisfies the v1 schema-equivalent validator and workflow invariants;
- gated audit-write failures restore prior lifecycle state.
