# Independent Review

Create `<change>/review.md` only when `workflow.review_required=true`.

Required shape:

```markdown
# Independent Review

Verdict: PASS | FAIL | CHANGES_REQUIRED

## Scope Reviewed
What implementation and which Requirements/Design/Plan artifacts were reviewed.

## Findings
- Blocking findings first.
- Non-blocking observations only when useful.

## Residual Risk
Known risk that remains after review, or `None`.
```

Rules:

- Review the actual implementation, not only the builder's summary.
- A review must be independent of the implementation pass when the runtime provides an independent reviewer capability.
- `PASS` means no blocking finding remains.
- `FAIL` or `CHANGES_REQUIRED` must identify at least one concrete blocking finding.
- Do not approve by lowering requirements or ignoring failed checks.
- If implementation changes after a passing review, the review becomes stale and must run again.
- The state engine decides whether Review is required and owns the transition; the reviewer does not edit workflow state directly.
