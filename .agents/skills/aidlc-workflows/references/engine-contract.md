# AI-DLC Slim Engine Contract

The active agent owns semantic judgment. The deterministic engine owns bookkeeping and integrity.

## Agent-owned judgment

Risk classification, workflow flags, requirements/design quality, implementation choices, delegation, independent-review judgment, and verification meaning remain outside the engine.

## Engine-owned guarantees

Engine v0.1.1 enforces:

- schema-v2 state validation and migration from v1;
- monotonic state revisions;
- exclusive mutation locking;
- write-ahead transaction recovery;
- legal lifecycle transitions and `approve != continue`;
- completion predicates and risk/workflow invariants;
- blocker state and conservative rework invalidation;
- pre-Implementation `reclassify`;
- terminal `cancel`;
- `doctor` diagnostics/repair;
- repository-contained, size-limited artifact reads;
- a committed zero-setup JavaScript runtime generated from TypeScript source.

A rejected mutation must not advance revision or mutate workflow files. A crash during a committed transaction must leave enough journal information for deterministic repair or an explicit recovery conflict.

## Control files

```text
aidlc-docs/aidlc-state.json   canonical workflow state
aidlc-docs/.aidlc.lock        ephemeral exclusive mutation lock
aidlc-docs/.aidlc-txn.json    ephemeral write-ahead transaction journal
```

## Deferred evidence contract

v0.1.1 still validates artifact structure rather than freshness. v0.2 will bind approvals, review, and verification to hashes/source snapshots without changing lifecycle stages or approval semantics.
