# Verification

Verification proves the change against current evidence.

Create `<change>/verification.md` with:

```markdown
# Verification

## Requirement Coverage
| Requirement | Evidence | Result |
|---|---|---|
| R1 | command / test / manual action | PASS / FAIL / NOT VERIFIED |

## Automated Checks
- `<command>` → PASS/FAIL with concise result

## Runtime / User-Surface Checks
- action performed → observed result

## Review Findings
Independent review summary when required.

## Baseline Consistency
Project docs updated or confirmed unchanged.

## Limitations / Residual Risk
Anything not verified, environment limitations, known issues.
```

Rules:

- Execute the narrowest checks that provide adequate evidence, then broader checks when risk or integration impact requires them.
- Relevant unit/integration tests, typecheck, lint/format, and build should run when applicable to the changed area.
- User-visible changes should be exercised in a browser/device/runtime when the environment permits it.
- Auth, authorization, migrations, billing, infrastructure, destructive operations, and other high-risk behavior require focused verification beyond generic unit tests.
- Never report a check as passing unless it actually ran successfully against the relevant current code.
- If source changes after a verification result, rerun checks made stale by that change.
- A skipped, unavailable, or unexercised check is `NOT VERIFIED`, not PASS.
- Do not delete, weaken, skip, or rewrite failing checks merely to make the change appear green without explicit user authorization.
- Failures caused by the change must be fixed before completion. Pre-existing unrelated failures may be documented with evidence and scope.

Verification is complete only when every acceptance criterion is PASS or explicitly identified as NOT VERIFIED with the reason and residual risk.
