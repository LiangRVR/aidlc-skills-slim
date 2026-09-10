# Testing

Last verified: [YYYY-MM]

## Required Before Completion
- Relevant tests pass.
- Typecheck/lint/build run when applicable.
- User-visible changes are exercised in the real runtime/browser/device when practical.
- Security-sensitive behavior receives focused checks.
- No failing check is weakened or skipped merely to obtain green status.
- Unchecked behavior is reported as `NOT VERIFIED`.

## Commands
- Unit: `[command]`
- Integration: `[command]`
- Typecheck: `[command]`
- Lint/format: `[command]`
- Build: `[command]`
- E2E/runtime: `[command or manual flow]`

## Minimum Checks by Change Type
| Change | Minimum evidence |
|---|---|
| Pure logic | focused unit test |
| API/data flow | integration/contract check |
| UI behavior | runtime/browser/device check |
| Auth/security | focused authorization/security check + review when high risk |
| Migration/infrastructure | validation + rollback/recovery evidence |

Keep this file project-specific. Per-change evidence belongs in that change's `verification.md`.
