# Design

Create `<change>/design.md` only when design is necessary.

Use only applicable sections:

```markdown
# Design

## Context
The structural problem this change must solve.

## Proposed Design
The chosen approach and why it fits the requirements and current architecture.

## Components / Boundaries
Only affected components, ownership, interfaces, and dependencies.

## Contracts / Data Model
APIs, schemas, events, types, persistence, compatibility rules.

## Data / Control Flow
Only when flow is non-trivial.

## Security / Privacy
Trust boundaries, authorization, validation, secrets, sensitive data.

## Failure / Recovery
Failure modes, retries, rollback, idempotency, recovery where relevant.

## Infrastructure / Deployment
Only when runtime topology, infrastructure, deployment, or migration changes.

## Alternatives and Trade-offs
Only consequential alternatives that a maintainer may otherwise revisit later.

## Project Baseline Impact
Which durable project docs or ADRs must change if this design is implemented.
```

Rules:

- Do not create architecture diagrams or design sections that add no decision value.
- Prefer existing project patterns unless requirements justify a change.
- Separate facts observed in the repository from new design decisions.
- A consequential choice should include alternatives and trade-offs; routine implementation details do not need an ADR.
- If the design changes durable architecture, stack, deployment, or an important invariant, update the project baseline after approval/implementation and create an ADR when the rationale should survive future refactors.

Design is complete when the implementation can be planned without inventing unresolved structural decisions.
