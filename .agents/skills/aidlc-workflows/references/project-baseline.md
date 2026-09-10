# Project Baseline

`aidlc-docs/project/` is durable project truth. Keep it concise, current, and expensive-to-rediscover.

Create or maintain:

- `brief.md` — product purpose, users, scope, permanent constraints.
- `architecture.md` — major boundaries, data/control flow, integrations, security boundaries, deployment shape.
- `tech-stack.md` — chosen stack, important versions, exact non-obvious commands, runtime/deployment setup.
- `testing.md` — project verification commands and minimum checks by change type.
- `decisions/ADR-*.md` — only consequential decisions whose rationale should survive future changes.

Do not duplicate facts that are obvious from source/configuration unless they are important constraints or easy to misinterpret. The repository remains authoritative for manifests, directory structure, and implementation details.

## Brownfield bootstrap

Inspect the existing repository and synthesize the minimum baseline. Prefer observed facts over assumptions. If architecture is uncertain, mark it as observed/unknown rather than inventing intent.

## Greenfield bootstrap

Populate the baseline from approved requirements/design decisions. Do not finalize undecided stack or architecture choices before the relevant approval gate.

## Maintenance rule

After any implemented change, ask whether it materially changes project purpose, durable architecture, stack/setup, verification conventions, or a consequential decision. If yes, update the baseline in the same change. If no, do not touch it merely for completeness.

## ADR rule

Create an ADR only when all are true:

1. the decision is consequential and durable;
2. plausible alternatives existed;
3. future maintainers/agents could reasonably reopen the question;
4. preserving rationale will reduce future mistakes.

Minimal ADR:

```markdown
# ADR-NNN: <decision>

Status: Accepted
Date: YYYY-MM-DD

## Context
Why a decision was required.

## Decision
What was chosen.

## Alternatives
Only serious alternatives considered.

## Consequences
Important trade-offs and constraints.
```

Avoid ADRs for routine library usage, obvious code organization, or reversible implementation details.
