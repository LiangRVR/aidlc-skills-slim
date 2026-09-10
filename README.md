# AI-DLC Skills Slim

A slim, runtime-agnostic adaptation of AWS AI-DLC v1 for structured AI-assisted software development, backed by a deterministic lifecycle and evidence engine.

This fork keeps the useful AI-DLC discipline from `qtalen/aidlc-skills` while removing overlapping stages, duplicate state, verbose ceremony, and runtime-specific orchestration assumptions.

## Lifecycle

```text
Preflight (automatic)
  ↓
Requirements
  ↓
Design (only when required)
  ↓
Plan
  ↓
Planning Gate (when required)
  ↓
Implementation
  ↓
Independent Review (when required)
  ↓
Verification
  ↓
Final Acceptance (when required)
  ↓
Complete
```

The active agent decides semantic routing and how work is executed. The engine enforces state, sequencing, gates, recovery, freshness, and mechanically testable evidence. AI-DLC Slim never hardcodes OMO Slim, model names, providers, tools, or specialist routing.

## Engine v0.2

Normal use requires Node.js 20+ and Git; no npm install or TypeScript build is needed because a prebuilt runtime is included:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs status
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs next
```

Key commands:

```text
init
next / status               read-only
freshness                    read-only stale-evidence diagnostics
refresh                      deterministic downstream invalidation
doctor [--repair]
migrate                     schema v1/v2 -> v3
reclassify                   pre-Implementation routing change
check <name>                 trusted executable Verification check
report <event>
approve                      approve + HOLD
continue                     approve/continue
request-changes
block / unblock
cancel --reason "..."
```

## Freshness guarantees

Schema v3 binds lifecycle decisions to exact machine fingerprints:

```text
Requirements
   ↓ hash
Design (optional)
   ↓ hash
semantic Plan
   ↓ approval receipt
Implementation
   ↓ Git source digest + source manifest
Review (optional)
   ↓ source-bound review receipt
Verification
   ↓ artifact + executable-check evidence receipt
Final Acceptance (optional)
   ↓ exact verified source/evidence
```

If a bound input changes later, `next` stops normal progression and returns a freshness-reconciliation directive. `refresh` reopens the earliest stale dependency and clears downstream receipts; it does not delete source or user-authored artifacts.

Plan checkbox marks are intentionally excluded from the semantic Plan fingerprint, so checking an approved task from `[ ]` to `[x]` does not invalidate approval. Changing task text, scope, ordering, Requirements, or Design does.

Each change owns `evidence.json`, which stores a Git source baseline, latest source snapshot, change manifest, and compact verification receipts. Source tracking includes committed and uncommitted changes while excluding workflow files under `aidlc-docs/`.

## Executable verification

Projects may define trusted checks in `aidlc-docs/project/checks.json`:

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

During Verification:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs check unit
```

Checks execute with `shell:false`. Receipts record command/cwd, exit code, timing, output hashes/byte counts, and source digests before/after execution; full stdout/stderr is not persisted. A check that modifies source is `STALE`, not PASS. Required checks need a current PASS receipt before Verification can complete.

## Hardening guarantees

Every mutation remains protected by an exclusive `aidlc-docs/.aidlc.lock` and the write-ahead `aidlc-docs/.aidlc-txn.json` journal. Interrupted transactions block progression until safe recovery through `doctor --repair` or an explicit recovery conflict is reported.

`cancel` provides a terminal path without deleting artifacts. Realpath containment protects artifact reads and control-file writes from path/symlink escapes. Workflow artifacts are capped at 2 MiB, per-change evidence at 4 MiB, and transaction journals at 16 MiB.

Migration from schema v1/v2 to v3 is conservative: historical completion/approval claims do not receive fabricated freshness receipts and must be reconciled normally.

## State and project context

The only workflow cursor is:

```text
aidlc-docs/aidlc-state.json
```

Durable project context belongs under:

```text
aidlc-docs/project/
├── brief.md
├── architecture.md
├── tech-stack.md
├── testing.md
├── checks.json             # optional executable verification contract
└── decisions/
```

Per-change artifacts belong under `aidlc-docs/changes/<date>-<slug>/`, including engine-owned `evidence.json`.

## Risk profiles

- **Low** — isolated/reversible. Usually Requirements → Plan → Implement → Verify.
- **Standard** — broader user/API/data impact. Planning gate and final acceptance required; Design/Review explicit.
- **High** — auth, sensitive data, migrations, public contracts, infrastructure, architecture boundaries, difficult rollback, or production-critical work. Design, planning gate, independent Review, and final acceptance required.

Security activates automatically when its trigger conditions apply.

## Verification philosophy

Completion is evidence-based. Unchecked behavior is `NOT VERIFIED`, not assumed to work. Tests/checks must not be weakened simply to obtain a passing result. Markdown explains the result; machine receipts establish what source/configuration/evidence the result actually applied to.

## Development

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm test
npm run test-runtime
```

CI runs the full suite against both compiled TypeScript and the committed runtime on Node 20 across Linux, macOS, and Windows, then smoke-tests the packaged CLI.

## Attribution

This project is based on `qtalen/aidlc-skills`, an MIT-licensed Skill-form adaptation of AWS AI-DLC v1. Selected context-organization ideas were also informed by `KhazP/vibe-coding-prompt-template`.

See `ATTRIBUTION.md` and `LICENSE`.
