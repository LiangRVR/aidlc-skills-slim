# AI-DLC Skills Slim

A slim, runtime-agnostic adaptation of AWS AI-DLC v1 for structured AI-assisted software development, with a deterministic lifecycle engine.

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

The active agent decides semantic routing and how work is executed. The engine enforces state, sequencing, gates, recovery, and mechanically testable completion predicates. AI-DLC Slim never hardcodes OMO Slim, model names, providers, tools, or specialist routing.

## Engine v0.1.1

The Skill includes a prebuilt Node.js 20+ runtime. Normal use requires no npm install or TypeScript build:

```bash
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs status
node .agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs next
```

Key commands:

```text
init
next / status               read-only
doctor [--repair]
migrate                     schema v1 -> v2
reclassify                   pre-Implementation routing change
report <event>
approve                      approve + HOLD
continue                     approve/continue
request-changes
block / unblock
cancel --reason "..."
```

## Hardening guarantees

State schema v2 stores `engine_version` and a monotonically increasing `revision`. Every mutation is protected by an exclusive `aidlc-docs/.aidlc.lock` and committed through `aidlc-docs/.aidlc-txn.json`, a write-ahead transaction journal. Interrupted transactions block normal progression until `doctor --repair` can safely roll them forward or reports a recovery conflict.

`cancel` provides a normal terminal path for abandoned work without deleting artifacts. Existing workflow artifacts are read through repository-containment and size checks, and control-file writes validate their real parent path so symlinked directories cannot redirect state outside the project. Workflow artifacts are capped at 2 MiB and transaction journals at 16 MiB.

The committed JavaScript runtime under `engine/runtime/` provides zero-setup execution while TypeScript remains the maintainable source. CI runs the same contract/hardening suite against both implementations on Linux, macOS, and Windows, then smoke-tests the packaged CLI.

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
└── decisions/
```

Per-change artifacts belong under `aidlc-docs/changes/<date>-<slug>/`.

## Risk profiles

- **Low** — isolated/reversible. Usually Requirements → Plan → Implement → Verify.
- **Standard** — broader user/API/data impact. Planning gate and final acceptance required; Design/Review explicit.
- **High** — auth, sensitive data, migrations, public contracts, infrastructure, architecture boundaries, difficult rollback, or production-critical work. Design, planning gate, independent review, and final acceptance required.

Security activates automatically when its trigger conditions apply.

## Verification philosophy

Completion is evidence-based. Unchecked behavior is `NOT VERIFIED`, not assumed to work. Tests/checks must not be weakened simply to obtain a passing result.

v0.1.1 hardens workflow storage, concurrency, recovery, distribution, and path safety. v0.2 will add artifact/source hashes, approval freshness, review freshness, executable verification receipts, and automatic hash-driven downstream invalidation.

## Development

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm test
npm run test-runtime
```

CI runs both the TypeScript implementation and committed runtime suites on Node 20 across Linux, macOS, and Windows.

## Attribution

This project is based on `qtalen/aidlc-skills`, an MIT-licensed Skill-form adaptation of AWS AI-DLC v1. Selected context-organization ideas were also informed by `KhazP/vibe-coding-prompt-template`.

See `ATTRIBUTION.md` and `LICENSE`.
