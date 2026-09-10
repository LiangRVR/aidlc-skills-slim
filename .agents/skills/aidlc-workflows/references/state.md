# State Contract

`aidlc-docs/aidlc-state.json` is the only workflow cursor. Do not maintain a parallel Markdown state or `MEMORY.md`.

Schema v3 keeps `engine_version` and monotonic `revision` and adds:

- `evidence_path` — engine-owned per-change structured evidence document.
- `freshness` — compact receipts for Requirements, Design, Plan, planning approval, Implementation, Review, Verification, and Final Acceptance.

The canonical schema is `schemas/aidlc-state.schema.json`. Schema-v1/v2 state must be migrated with `aidlc-engine migrate` or safe engine recovery before normal progression. Migration never invents historical freshness receipts.

## Ownership

- The active parent agent owns semantic decisions and user-authored workflow artifacts.
- The deterministic engine owns state, freshness receipts, evidence.json, lock, and transaction mutations.
- Delegated workers never edit engine-owned control/evidence files.
- Direct state/evidence edits are recovery-only and should be followed by `doctor` plus a material audit note.

## Freshness receipts

Receipts establish dependency identity, not semantic correctness:

```text
Requirements: request + requirements hashes
Design: current requirements + design hashes
Plan: current requirements + optional design + semantic Plan hash
Planning Approval: exact Plan bundle
Implementation: exact Plan bundle + Git source digest + manifest digest
Review: exact source digest + review.md hash
Verification: exact source + verification.md + selected check evidence + checks config
Final Acceptance: exact verified source/evidence
```

Plan checkbox completion marks are normalized before hashing; task content is not.

`next`/`freshness` only inspect. If a dependency is stale, normal lifecycle mutation is blocked. `refresh` reopens the earliest stale dependency and clears downstream receipts without deleting source or authored artifacts.

## Evidence document

`aidlc-docs/changes/<change>/evidence.json` stores the Git source baseline/latest snapshot, source manifest, and executable-check receipts. It is engine-owned and capped at 4 MiB.

Production source freshness requires a Git worktree. Source snapshots exclude `aidlc-docs/**` so workflow bookkeeping does not stale implementation source.

## Concurrency

Every mutation acquires `aidlc-docs/.aidlc.lock` using exclusive file creation. A competing mutation fails with `WORKFLOW_LOCKED`; it never waits and never silently overwrites another mutation. The lock records pid, host, operation, engine version, timestamp, and nonce.

## Transactions and recovery

Multi-file mutations use `aidlc-docs/.aidlc-txn.json` as a write-ahead journal containing before/after images. A pending journal blocks normal progression with `RECOVERY_REQUIRED`.

`doctor --repair` rolls a valid interrupted transaction forward only when every tracked file still equals either its recorded before or after image. Any third value is a recovery conflict requiring inspection.

## Terminal states

`complete/complete` and `cancelled/cancelled` are lifecycle-terminal, but Complete remains freshness-observable: changing source/evidence after acceptance makes `next` request reconciliation. `cancelled` ignores freshness and remains terminal.
