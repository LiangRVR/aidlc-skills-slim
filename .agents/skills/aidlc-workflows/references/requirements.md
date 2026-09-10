# Requirements

Create `<change>/requirements.md`. Keep it proportional to the change.

Required sections:

```markdown
# Requirements

## Intent
What behavior or outcome is changing and why.

## Acceptance Criteria
- R1: observable, testable outcome
- R2: observable, testable outcome

## Must Preserve
Existing behaviors/contracts/data that must not regress.

## Constraints
Technical, product, compatibility, privacy, operational, or timing constraints.

## Out of Scope
Explicit exclusions.

## User Scenarios
Only when they clarify behavior.

## Non-Functional Requirements
Only when relevant; use stable IDs such as NFR1.

## Open Questions
Only unresolved questions that materially affect the work.
```

Rules:

- Prefer observable acceptance criteria over implementation instructions.
- Do not manufacture requirements from convention or preference.
- Ask questions only when the answer can materially change behavior, architecture, risk, or verification.
- If an answer is available from the repository or durable project baseline, inspect it instead of asking the user.
- For brownfield work, identify compatibility obligations and existing behavior that must be preserved.
- Requirements are current intent, not an audit log. Historical decisions belong in the change audit.
- Security-sensitive requirements are mandatory when `security.md` triggers.

Completion: every material ambiguity is resolved or explicitly recorded as an accepted open constraint, and the acceptance criteria are specific enough to drive the plan and Verification.
