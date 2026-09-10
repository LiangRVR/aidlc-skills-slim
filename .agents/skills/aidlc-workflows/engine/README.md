# AI-DLC Slim Engine v0.1.1

Deterministic lifecycle bookkeeping for AI-DLC Slim. The engine owns sequencing, gates, state integrity, locking, recovery, and mechanically testable predicates. The active agent still owns risk judgment, requirements/design quality, implementation strategy, delegation, review judgment, and verification meaning.

## Zero-setup runtime

Node.js 20+ is the only runtime requirement. The repository includes prebuilt JavaScript under `runtime/`, so normal use does **not** require npm install or TypeScript compilation.

From the managed project:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs status
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs next
```

When the Skill is installed elsewhere, add `--root /path/to/project`.

## Commands

```text
init
next                         read-only
status                       read-only
doctor [--repair]            diagnostics / safe recovery
migrate                      schema v1 -> v2
reclassify                   pre-Implementation routing change
report <lifecycle-event>
approve                      planning approval + HOLD
continue                     planning approval/continuation
request-changes
block --reason "..."
unblock --reason "..."
unblock --all
cancel --reason "..."       terminal cancellation
```

## State hardening

State schema v2 adds `engine_version` and a monotonically increasing `revision`. Every mutation is protected by the exclusive `aidlc-docs/.aidlc.lock` lock and committed through the write-ahead `aidlc-docs/.aidlc-txn.json` transaction journal. Normal reads refuse to proceed while a transaction is pending.

`doctor --repair` can remove malformed locks, remove locks that are provably stale on the local host, roll a valid interrupted transaction forward, and migrate schema-v1 state. It refuses to remove an apparently live lock or resolve a transaction whose files differ from both recorded before/after images.

`cancel` preserves the change directory and audit, marks the workflow terminal, and allows a later change to initialize without direct state editing.

Artifact reads and control-file writes are repository-contained through real filesystem paths, including parent-directory symlink checks. Workflow artifacts have a 2 MiB size ceiling and transaction journals have a 16 MiB ceiling to prevent unbounded synchronous parsing/recovery records.

## Development

```bash
npm install
npm test
npm run test-runtime
```

`sync-runtime` remains available to regenerate the committed JavaScript from `src/`. CI does not rely on emitted formatting as a correctness signal: on Linux, macOS, and Windows it runs the same full contract/hardening suite against both the compiled TypeScript implementation and the committed zero-setup runtime, then smoke-tests the CLI. This catches semantic runtime drift while remaining stable across harmless compiler-format changes.

## Deferred to v0.2

Artifact/source hashes, approval freshness, source manifests, review freshness receipts, executable verification receipts, and hash-driven downstream invalidation remain intentionally separate from v0.1.1.
