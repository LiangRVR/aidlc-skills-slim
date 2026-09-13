# AI-DLC Slim Engine v0.2

Deterministic lifecycle, freshness, and evidence bookkeeping for AI-DLC Slim. The engine owns sequencing, gates, state integrity, locking, recovery, machine fingerprints, source/evidence receipts, and mechanically testable predicates. The active agent still owns semantic judgment, implementation strategy, delegation, review judgment, and interpretation of verification results.

## Zero-setup runtime

Node.js 20+ and Git are the runtime requirements. The repository includes prebuilt JavaScript under `runtime/`; normal use does not require npm install or TypeScript compilation.

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs status
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs next
```

When the Skill is installed outside the managed project, add `--root /path/to/project`.

## Commands

```text
init
next                         read-only; returns freshness reconciliation when stale
status                       read-only
freshness                    read-only freshness diagnostics
refresh                      invalidate stale downstream receipts and reopen earliest dependency
doctor [--repair]            diagnostics / safe recovery
migrate                      schema v1/v2 -> v3
reclassify                   pre-Implementation routing change
check <name>                 execute a trusted configured Verification check
report <lifecycle-event>
approve                      planning approval + HOLD
continue                     planning approval/continuation
request-changes
block --reason "..."
unblock --reason "..."
unblock --all
cancel --reason "..."       terminal cancellation
```

## Freshness chain

State schema v3 stores compact receipts that bind lifecycle decisions to exact inputs:

```text
Requirements fingerprint
        ↓
Design fingerprint (when required)
        ↓
semantic Plan fingerprint
        ↓
Planning approval receipt
        ↓
Implementation source + manifest receipt
        ↓
Review receipt (when required)
        ↓
Verification artifact + executable-check evidence receipt
        ↓
Final acceptance receipt (when required)
```

Plan checkbox marks are normalized for fingerprinting: changing `[ ]` to `[x]` records execution progress without invalidating the approved Plan. Changing task text, scope, ordering, requirements, design, or other Plan content changes the fingerprint.

`next` and `freshness` detect stale dependencies without writing. Normal lifecycle mutations fail with `FRESHNESS_STALE` while stale dependencies exist. `refresh` is the explicit mutation that reopens the earliest stale dependency and clears only the downstream receipts that can no longer be trusted.

## Source evidence

Each change owns `aidlc-docs/changes/<change>/evidence.json`. At initialization the engine records a Git source baseline. At Implementation completion it records the current source digest and a manifest of files changed relative to that baseline, excluding `aidlc-docs/**` workflow files.

Source snapshots include Git tree identity plus changed/untracked file hashes, so both committed and uncommitted implementation changes remain freshness-visible. A pre-existing dirty file that remains unchanged from the workflow baseline is not attributed to the change manifest.

Production source freshness fails closed without a Git working tree. A synthetic non-Git snapshot exists only behind the engine test-harness environment flag and is not a supported production mode.

## Executable verification receipts

Trusted project checks are configured in `aidlc-docs/project/checks.json`:

```json
{
  "schema_version": 1,
  "checks": {
    "unit": {
      "command": ["npm", "test"],
      "required": true,
      "timeout_ms": 120000
    }
  }
}
```

Run a check only during active Verification:

```bash
aidlc-engine check unit
```

Commands are arrays and execute directly with `shell:false` by default. On Windows only, known package-manager `.cmd` shims (`npm`/`npx`/`pnpm`/`yarn` families) use a narrowly scoped shell adapter after every token passes a strict allowlist. Tokens with spaces or shell metacharacters are rejected; complex package-manager behavior should be placed behind a package script. Arbitrary project commands are never routed through that adapter.

Receipts record the exact configured command/cwd, start time, duration, exit code, timeout status, stdout/stderr hashes and byte counts, plus source digests before and after execution. Full command output is not persisted in evidence.json. If a check changes source, the receipt is `STALE`, not PASS.

A required check must have a current PASS receipt for the exact source and current command definition before `verification_complete` succeeds. The verification receipt is also bound to the hash of `checks.json`, so changing verification configuration after completion makes Verification stale.

`checks.json` is trusted project configuration: do not populate it from untrusted input and do not use it as an arbitrary command-execution API.

## State and recovery hardening

Every mutation remains protected by `aidlc-docs/.aidlc.lock` and the write-ahead `aidlc-docs/.aidlc-txn.json` journal. State revisions are monotonic. `doctor --repair` can recover non-conflicting interrupted transactions, remove only malformed/provably stale locks, and migrate legacy state conservatively.

Migration to schema v3 never fabricates historical fingerprints or approvals. Existing completed stages without v0.2 receipts are detected as stale and must pass through `refresh`/normal lifecycle work before they regain freshness.

Workflow Markdown artifacts are capped at 2 MiB, evidence.json at 4 MiB, and the transaction journal at 16 MiB. Artifact/control paths are repository-contained through realpath checks.

## Development

```bash
npm install
npm test
npm run test-runtime
```

CI runs the full suite against compiled TypeScript and the committed zero-setup runtime on Linux, macOS, and Windows across the supported Node compatibility matrix, then smoke-tests both CLIs and the packed guided-bootstrap flow. `sync-runtime` regenerates committed JavaScript from `src/`.
