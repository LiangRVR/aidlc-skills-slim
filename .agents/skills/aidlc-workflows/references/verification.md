# Verification

Verification proves the change against **current** source and evidence.

Create `<change>/verification.md` with:

```markdown
# Verification

## Requirement Coverage
| Requirement | Evidence | Result |
|---|---|---|
| R1 | command / test / manual action | PASS / FAIL / NOT VERIFIED |

## Automated Checks
- `<check or command>` → PASS/FAIL with concise result

## Runtime / User-Surface Checks
- action performed → observed result

## Review Findings
Independent review summary when required.

## Baseline Consistency
Project docs updated or confirmed unchanged.

## Limitations / Residual Risk
Anything not verified, environment limitations, known issues.
```

## Executable project checks

Project-owned trusted checks may be defined in `aidlc-docs/project/checks.json` using `schemas/checks.schema.json`.

Run them only during active Verification:

```bash
aidlc-engine check <name>
```

A receipt records:
- exact command array and working directory;
- started time, duration, exit code, and timeout status;
- SHA-256 and byte counts for stdout/stderr, not full output;
- source digest before and after the command;
- PASS, FAIL, or STALE.

Checks execute directly with `shell:false` by default. On Windows only, known package-manager `.cmd` shims (`npm`/`npx`/`pnpm`/`yarn` families) use a narrowly scoped command-shell adapter because Windows cannot execute those shim files directly. That adapter accepts only a strict shell-safe token set; arguments with spaces or command-shell metacharacters are rejected and complex logic must live behind a package script. Arbitrary project commands are never routed through this adapter. `checks.json` is trusted project configuration and must not be populated from untrusted input.

If a check changes source, its receipt is `STALE` even when exit code is zero. A configured `required:true` check must have a PASS receipt for the exact current source and current command definition before `verification_complete` succeeds.

## Freshness

At `verification_complete`, the engine binds Verification to:
- current Implementation source digest;
- `verification.md` hash;
- current `checks.json` hash when present;
- the selected current executable check receipts.

Changing source, verification.md, selected structured evidence, or check configuration after completion makes Verification stale. `next` then requests freshness reconciliation; `refresh` reopens Verification or an earlier stale dependency.

Rules:
- Execute the narrowest checks that provide adequate evidence, then broader checks when risk/integration impact requires them.
- Relevant unit/integration tests, typecheck, lint/format, and build should run when applicable.
- User-visible changes should be exercised in a browser/device/runtime when possible.
- Auth, authorization, migrations, billing, infrastructure, destructive operations, and other high-risk behavior require focused verification beyond generic unit tests.
- Never report a check as passing unless it actually ran successfully against the relevant current source.
- A skipped, unavailable, or unexercised behavior is `NOT VERIFIED`, not PASS.
- Do not delete, weaken, skip, or rewrite failing checks merely to make the change appear green without explicit user authorization.
- Failures caused by the change must be fixed before completion. Pre-existing unrelated failures may be documented with evidence and scope.
- If source changes after a result, rerun checks after freshness reconciliation.

Verification is complete only when every acceptance criterion is PASS or explicitly NOT VERIFIED with reason/residual risk, and every configured required executable check has current PASS evidence.
