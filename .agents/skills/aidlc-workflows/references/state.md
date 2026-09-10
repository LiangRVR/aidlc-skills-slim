# State Contract

`aidlc-docs/aidlc-state.json` is the only workflow cursor. Do not maintain a parallel Markdown state or `MEMORY.md`.

Schema v2 adds two engine-owned fields:

- `engine_version` — engine version that last committed state.
- `revision` — monotonically increasing integer incremented by every accepted mutation, including a new change after a terminal workflow.

The canonical schema is `schemas/aidlc-state.schema.json`. Schema-v1 state must be migrated with `aidlc-engine migrate` or `aidlc-engine doctor --repair` before normal progression.

## Ownership

- The active parent agent owns semantic decisions and artifacts.
- The deterministic engine owns all lifecycle-state mutations.
- Delegated workers never edit `aidlc-state.json`, `.aidlc.lock`, or `.aidlc-txn.json`.
- Direct state edits are recovery-only and should be followed by `doctor` plus a material audit note.

## Concurrency

Every mutation acquires `aidlc-docs/.aidlc.lock` using exclusive file creation. A competing mutation fails with `WORKFLOW_LOCKED`; it never waits and never silently overwrites another mutation. The lock records pid, host, operation, engine version, timestamp, and a nonce used to prevent one process from deleting another process's lock.

## Transactions and recovery

Multi-file lifecycle mutations use `aidlc-docs/.aidlc-txn.json` as a write-ahead journal containing before/after images. If a crash leaves the journal behind, normal `status`/`next` progression stops with `RECOVERY_REQUIRED`.

`doctor --repair` rolls a valid interrupted transaction forward only when every tracked file still equals either its recorded before or after image. Any third value is a recovery conflict and requires human inspection.

## Terminal states

`complete/complete` and `cancelled/cancelled` are terminal. `cancel` requires a reason, clears gates/blockers, preserves artifacts/audit, and permits a later different change to initialize.
