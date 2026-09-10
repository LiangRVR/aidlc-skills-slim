# State

`aidlc-docs/aidlc-state.md` is the only workflow cursor. Keep it small and mechanically readable.

Use this schema:

```markdown
# AI-DLC State

Active Change: <date>-<slug>
Risk: low | standard | high
Risk Rationale: <one sentence>

Current Stage: requirements | design | plan | implementation | verification | complete
Status: active | awaiting-approval | approved-hold | blocked | complete
Next Stage: <stage or none>

## Artifacts
Request: aidlc-docs/changes/<change>/request.md
Requirements: <path or none>
Design: <path or none>
Plan: <path or none>
Verification: <path or none>

## Progress
- [ ] Requirements
- [ ] Design (N/A allowed)
- [ ] Plan
- [ ] Implementation
- [ ] Verification

## Gate
Planning Approved: yes | no | n/a
Continue Authorized: yes | no | n/a

## Blockers
None | <concise blocker>
```

Rules:

- Never maintain a second `MEMORY.md` or duplicate current-stage tracker.
- The active parent agent owns state updates; delegated workers do not edit state.
- On `approve` at a planning gate: set `Status: approved-hold`, `Planning Approved: yes`, `Continue Authorized: no`, and stop.
- On `continue`/`proceed`: set approval as needed, set `Continue Authorized: yes`, move to Implementation, and proceed.
- On requested changes while held: keep the gate held, revise the relevant artifact, and require a fresh approval if the approved plan materially changed.
- On completion: set `Current Stage: complete`, `Status: complete`, `Next Stage: none`, and clear the active gate.
- If state conflicts with actual artifacts/source, do not guess. Inspect the change directory and Git state, repair the cursor conservatively, and record material recovery in the change audit.

## Audit

Each change owns `audit.md`. Log only:

- original user request;
- material answers that alter requirements/design;
- planning approval/hold/continue/rejection;
- consequential design or risk decisions;
- explicit risk acceptance;
- final acceptance.

Use timestamps. Preserve original historical entries; corrections are appended, not rewritten. Git remains the source of history for normal file/code edits.
