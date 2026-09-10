# AI-DLC Slim Engine v0.1

Deterministic lifecycle engine for AI-DLC Slim. It owns workflow bookkeeping only; the active agent still owns risk judgment, design decisions, implementation strategy, delegation, and semantic quality.

## Runtime

- Node.js 20+
- zero runtime dependencies
- TypeScript is a development/build dependency only

Build once after installing the Skill source:

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm run build
```

Then run it from the project being managed:

```bash
node .agents/skills/aidlc-workflows/engine/dist/src/cli.js status
node .agents/skills/aidlc-workflows/engine/dist/src/cli.js next
```

If the Skill is installed outside the project, invoke the same `dist/src/cli.js` from that installation and pass `--root /path/to/project`.

## Initialize

Preflight makes the semantic routing decisions first, then initializes them explicitly:

```bash
node .agents/skills/aidlc-workflows/engine/dist/src/cli.js init \
  --change 260910-auth \
  --risk high \
  --risk-rationale "Authentication changes affect authorization boundaries" \
  --design-required true \
  --planning-gate-required true \
  --review-required true \
  --final-acceptance-required true \
  --security-required true \
  --request "Add the requested authentication change"
```

Initialization creates `aidlc-docs/aidlc-state.json`, the per-change directory, `request.md`, and the initial audit entry. Starting a second active change is rejected.

## Commands

```text
init
next                         read-only
status                       read-only
report requirements_complete
report design_complete
report plan_complete
approve                       planning approval + HOLD
continue                      planning approval/continuation
request-changes
report implementation_complete
report review_pass
report review_fail
report verification_complete
report accept
block --reason "..."
unblock --reason "..."
unblock --all
```

Every rejected transition leaves persisted state unchanged. Gated audit writes roll state back if the audit append fails.

## Completion predicates

The engine checks mechanically testable requirements before accepting completion events: required artifact sections, acceptance-criterion IDs, Plan checkboxes, explicit review verdicts, and verification coverage. Semantic quality remains the responsibility of the active agent/reviewer.

The JSON Schema remains the canonical external state format. v0.1 uses a built-in schema-equivalent validator so the runtime has no dependency on a JSON Schema package; schema changes must update the validator and tests together.

## Development

```bash
npm install
npm test
```

`npm test` compiles the TypeScript implementation and runs the state-machine tests with Node's built-in test runner.

## Deferred to v0.2

Artifact/source hashes, review freshness receipts, executable evidence receipts, source manifests, and hash-driven downstream invalidation remain intentionally out of v0.1.
