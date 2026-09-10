# Implementation

Implementation executes the current `plan.md`; it does not create a second lifecycle.

Rules:

- The active parent agent owns the stage and may work directly, delegate, parallelize independent work, or use specialist tools.
- AI-DLC never prescribes agent names, models, providers, MCPs, or orchestration frameworks.
- Delegated workers cannot advance AI-DLC state or self-certify workflow completion.
- Preserve unrelated working-tree changes and existing project conventions.
- Modify existing files in place when that is the correct change; do not create duplicate "new" or "modified" copies.
- Mark plan steps complete only after the corresponding work is actually present.
- Add or update tests with the implementation when appropriate; tests are executed in Verification.
- Do not silently widen scope. If implementation exposes a consequential requirement/design decision, stop that branch of work, update the relevant artifact, and re-enter the planning gate when required by risk.
- Never weaken quality, security, test, lint, type, or build expectations merely to make checks pass.
- Keep durable project context current when the implementation changes architecture, stack, commands, deployment, testing conventions, or other long-lived truths.

## Independent review

High-risk changes require independent review before Verification when the active environment provides an independent review capability. Standard-risk changes should use independent review when the change is broad, cross-cutting, or difficult to validate from tests alone.

The reviewer should receive:

- requirements and design criteria;
- the implementation plan;
- actual changed source/configuration;
- relevant project baseline documents.

The reviewer should look for correctness, requirement gaps, regressions, security/privacy issues, architectural drift, and verification gaps. Do not treat the builder's summary as evidence. Resolve blocking findings and re-review affected material.

Implementation ends when planned work is present and ready for evidence-based Verification. Passing checks are not assumed at this stage.
