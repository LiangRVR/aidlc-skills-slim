# AI-DLC Slim Engine Contract

The active agent owns semantic judgment. The deterministic engine owns bookkeeping, integrity, freshness, and machine evidence.

## Agent-owned judgment

Risk classification, workflow flags, requirements/design quality, implementation choices, delegation, independent-review judgment, which project checks are appropriate to configure, manual/runtime observations, and verification meaning remain outside the engine.

## Engine-owned guarantees

Engine v0.2 enforces:

- schema-v3 state validation and conservative migration from v1/v2;
- monotonic revisions, exclusive mutation locking, and write-ahead transaction recovery;
- legal lifecycle transitions and `approve != continue`;
- completion predicates and risk/workflow invariants;
- blocker/reclassification/cancellation semantics;
- artifact fingerprints and dependency-bound approval receipts;
- Git-backed source snapshots and change manifests;
- source-bound Review receipts;
- executable Verification check receipts and required-check enforcement;
- Verification receipts bound to source, verification artifact, selected evidence, and checks configuration;
- source/evidence-bound Final Acceptance;
- read-only freshness detection and explicit deterministic downstream invalidation;
- repository-contained, size-limited reads/writes;
- a zero-setup JavaScript runtime tested behaviorally against the TypeScript implementation.

A rejected mutation must not advance revision or mutate workflow files. A crash during a transaction must leave enough journal information for deterministic repair or an explicit recovery conflict.

## Control and evidence files

```text
aidlc-docs/aidlc-state.json                 canonical workflow state
aidlc-docs/.aidlc.lock                      ephemeral exclusive mutation lock
aidlc-docs/.aidlc-txn.json                  ephemeral write-ahead journal
aidlc-docs/changes/<change>/evidence.json   source/check evidence owned by engine
aidlc-docs/project/checks.json              trusted project-owned check definitions
```

`checks.json` is project configuration, not untrusted input. Commands execute without a shell. The engine stores compact result metadata/hashes rather than full stdout/stderr.

## Freshness rule

The engine does not infer that an old approval/review/verification still applies after its bound inputs change. `next` reports stale dependencies; `refresh` is the only normal operation that converts that observation into workflow invalidation/reopening.

Markdown artifacts explain intent and results. Machine receipts prove which exact artifact/source/configuration versions those lifecycle decisions referred to.
