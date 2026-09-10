# AI-DLC Slim Engine Contract

This document freezes the boundary between LLM judgment and deterministic workflow bookkeeping before engine implementation.

## Judgment owned by the active agent

The active parent agent decides:

- risk level;
- whether Design is required;
- whether a planning gate is required;
- whether independent Review is required;
- whether final acceptance is required;
- whether automatic security rules apply;
- semantic quality of requirements/design/plan;
- how implementation work is delegated or executed.

These decisions are persisted once in `aidlc-state.json`.

## Bookkeeping owned by the engine

The future engine owns:

- state-schema validation;
- legal/illegal transition enforcement;
- gate state;
- stage sequencing;
- stage completion predicate checks that are mechanically testable;
- workflow invariant validation;
- blocker state;
- deterministic reset of downstream progress after rework.

The engine must not select models, agents, providers, tools, implementation architecture, or product decisions.

## v0.1 command surface

The first engine should expose only:

- `init` — create validated state from explicit routing decisions.
- `next` — read-only; report the single legal next action/state directive.
- `report <event>` — apply a stage/review/verification event after validating predicates.
- `approve` — planning approval with hold.
- `continue` — planning approval/continuation into Implementation.
- `request-changes` — reopen the applicable gate/stage.
- `block` / `unblock` — manage blockers.
- `status` — read-only state summary.

Do not add workflow graphs, hooks, swarms, model routing, artifact hashing, source fingerprints, plugin adapters, or background orchestration to v0.1.

## Read-only vs mutating contract

`next` and `status` never mutate state.

All mutations occur through explicit mutating commands. A command must validate the current state and intended event before writing. On failure, state remains byte-for-byte unchanged.

## Atomicity requirement

A successful mutation should:

1. read and validate current state;
2. validate event legality and completion predicate;
3. compute next state in memory;
4. validate next state against the JSON schema and invariants;
5. write the new state atomically;
6. append a lifecycle audit entry only for events required by the audit policy.

A failed step must not leave partially updated state.

## Deferred to v0.2

- artifact SHA-256 receipts;
- review freshness tied to source/artifact hashes;
- automatic downstream staleness propagation based on hashes;
- executable check receipts;
- source manifests;
- stronger tamper resistance.

The v0.1 data model must leave room for these additions without changing the lifecycle stages or approval semantics.
