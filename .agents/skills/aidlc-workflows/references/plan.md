# Plan

Create `<change>/plan.md` as the executable contract for implementation.

Required shape:

```markdown
# Implementation Plan

## Scope
What this plan changes and what it does not.

## Work
1. [ ] Concrete step with affected area/file/component.
2. [ ] Concrete step.
3. [ ] Concrete step.

## Dependencies
Ordering constraints and safe parallel work, if any.

## Verification Strategy
Map requirements to tests/checks that will prove them.

## Migration / Rollback
Only when applicable.

## Risks
Only material implementation risks not already resolved in design.
```

Rules:

- Steps must be specific enough to execute without redesigning the solution mid-build.
- Name expected files/components when they are known; do not invent exact paths before repository inspection supports them.
- Keep work units independent where practical so the active runtime may parallelize them.
- Do not assign work to named agents or models. Execution routing belongs to the active runtime.
- Every acceptance criterion must have a planned verification path or be explicitly marked as requiring manual verification.
- If planning exposes a consequential unresolved decision, return to Requirements or Design before implementation.
- Update checkboxes as work completes. If implementation legitimately changes scope, update the plan and record the material deviation in the change audit.

For Standard and High-risk work, implementation may not begin until the planning gate is satisfied. Low-risk work may proceed directly unless the plan introduces a consequential decision not already authorized by the user.
