# AI-DLC Slim Engine Contract

This document defines the boundary between semantic agent judgment and the implemented deterministic engine v0.1.

## Judgment owned by the active agent

The active parent agent decides:

- risk level;
- whether Design is required;
- whether a planning gate is required;
- whether independent Review is required;
- whether final acceptance is required;
- whether automatic security rules apply;
- semantic quality of Requirements, Design, Plan, implementation, Review, and Verification;
- how implementation work is executed or delegated.

These routing decisions are persisted at initialization and are not repeatedly inferred afterward.

## Bookkeeping owned by the engine

The engine owns:

- state validation against the version-1 contract;
- legal/illegal transition enforcement;
- gate state and approval/continue separation;
- stage sequencing;
- mechanically testable completion predicates;
- workflow invariants;
- blocker state;
- conservative downstream invalidation after rework;
- atomic state writes and lifecycle-audit mutations.

The engine never selects models, agents, providers, tools, architecture, or product decisions.

## Implementation

Engine source lives at `engine/src/`. Its CLI is built to `engine/dist/src/cli.js`.

Runtime requirements:

- Node.js 20+
- zero runtime dependencies
- TypeScript only as a build/development dependency

Build/test:

```bash
cd .agents/skills/aidlc-workflows/engine
npm install
npm test
```

## v0.1 command surface

- `init` — create validated state from explicit routing decisions and preserve the original request.
- `next` — read-only; return the single current workflow directive.
- `status` — read-only; return validated state.
- `report <event>` — apply a stage/review/verification event after predicates pass.
- `approve` — planning approval with hold.
- `continue` — planning approval/continuation into Implementation.
- `request-changes` — reopen the applicable gate/stage.
- `block` / `unblock` — manage blocker state.

`next` and `status` never mutate state. Lifecycle mutation must go through the engine; direct edits to `aidlc-state.json` are recovery-only.

## Atomicity

A mutation:

1. reads and validates current state;
2. validates event legality and applicable completion predicates;
3. computes next state in memory;
4. validates next-state schema-equivalent rules and workflow invariants;
5. atomically replaces the state file;
6. appends an audit record when required by the audit policy.

Rejected events leave state byte-for-byte unchanged. For audited gate mutations, an audit-write failure restores the prior state.

## JSON Schema

`schemas/aidlc-state.schema.json` remains the canonical external state format. v0.1 uses an internal schema-equivalent validator to avoid a runtime JSON Schema dependency. Any schema change must update both validator and tests in the same change.

## Deferred to v0.2

- artifact SHA-256 receipts;
- review freshness tied to artifact/source hashes;
- executable verification receipts;
- source manifests;
- hash-driven downstream invalidation;
- runtime-specific hooks/plugins.

These additions must not change the lifecycle stages or approval semantics without a new schema/contract version.
