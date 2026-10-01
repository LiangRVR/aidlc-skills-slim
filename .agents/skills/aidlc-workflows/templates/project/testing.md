<!-- AI-DLC-CONTEXT: PENDING -->
# Testing

Last verified: Not yet semantically initialized.

## Project Testing Strategy
TBD — infer the real test layers, environments, runtime/manual checks, and known gaps from repository evidence. Do not invent a test framework for greenfield work.

## Required Before Completion
- Relevant tests pass.
- Typecheck/lint/build run when applicable.
- User-visible changes are exercised in the real runtime/browser/device when practical.
- Security-sensitive behavior receives focused checks.
- No failing check is weakened or skipped merely to obtain green status.
- Unchecked behavior is reported as `NOT VERIFIED`.

## Commands
- Unit: TBD / not configured
- Integration: TBD / not configured
- Typecheck: TBD / not configured
- Lint/format: TBD / not configured
- Build: TBD / not configured
- E2E/runtime: TBD / not configured

## Minimum Checks by Change Type
| Change | Minimum evidence |
|---|---|
| Pure logic | focused unit test when a test layer exists or can reasonably be added |
| API/data flow | integration/contract check |
| UI behavior | runtime/browser/device check |
| Auth/security | focused authorization/security check + review when high risk |
| Migration/infrastructure | validation + rollback/recovery evidence |

Remove the `AI-DLC-CONTEXT: PENDING` marker after this document has been reconciled by the active parent agent. Keep this file project-specific. Per-change evidence belongs in that change's `verification.md`.
