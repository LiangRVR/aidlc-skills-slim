# AI-DLC Slim Engine v0.1

Deterministic lifecycle engine for AI-DLC Slim. It owns workflow bookkeeping only; the active agent owns risk judgment, technical decisions, implementation strategy, delegation, and semantic quality.

## Runtime

- Node.js 20+
- zero runtime dependencies
- TypeScript is a build/development dependency only

Build after installing the Skill source:

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm run build
```

Then run it from the managed project:

```bash
node .agents/skills/aidlc-workflows/engine/dist/src/cli.js status
node .agents/skills/aidlc-workflows/engine/dist/src/cli.js next
```

If the Skill is installed outside the project, invoke the same CLI from that installation and pass `--root /path/to/project`.

## Initialize

Preflight makes semantic routing decisions first and passes them explicitly:

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

Initialization creates `aidlc-docs/aidlc-state.json`, the per-change directory, `request.md`, and the initial audit entry. A second active change is rejected.

## Commands

```text
init
next                         read-only
status                       read-only
reclassify                   pre-Implementation routing change
report requirements_complete
report design_complete
report plan_complete
approve                      planning approval + HOLD
continue                     planning approval/continuation
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

`reclassify` accepts the same risk/routing flags as `init` except `--change` and `--request`. It is allowed only before Implementation. It clears any planning approval and conservatively resets Plan/downstream progress; newly required Design is routed through Design first.

Every rejected transition leaves persisted state unchanged. Gated/reclassification audit failures roll state back.

## Completion predicates

The engine checks mechanically testable requirements before accepting completion events: required artifact sections, acceptance-criterion IDs, Plan checkboxes, explicit review verdicts, and Verification coverage. Semantic quality remains the active agent/reviewer's responsibility.

The JSON Schema remains the canonical external state format. v0.1 uses a built-in schema-equivalent validator so runtime has no JSON Schema package dependency; schema changes must update validator and tests together.

## Development

```bash
npm install
npm test
```

`npm test` compiles TypeScript and runs the state-machine tests with Node's built-in test runner.

## Deferred to v0.2

Artifact/source hashes, review freshness receipts, executable evidence receipts, source manifests, hash-driven downstream invalidation, and runtime-specific hooks/plugins remain intentionally out of v0.1.
