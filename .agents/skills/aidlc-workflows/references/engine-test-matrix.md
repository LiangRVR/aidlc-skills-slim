# Engine Test Matrix

Engine tests must cover lifecycle semantics, storage failure modes, and evidence freshness.

Existing coverage remains required: Low/Standard/High initialization, conditional Design, planning gates, approve/continue separation, reclassification, illegal transitions, Implementation predicates, Review pass/fail, Verification outcomes, Final Acceptance, blockers, cancellation, revisions, locking, transaction recovery, filesystem containment, size limits, doctor, migration, and read-only operations.

v0.2 additionally requires coverage for:

- Requirements/Design/Plan fingerprint creation;
- Plan checkbox completion does not invalidate semantic Plan approval;
- Plan task/scope changes do invalidate Plan/approval;
- `next` reports `reconcile_freshness` without mutating state;
- `refresh` reopens the earliest stale dependency and clears downstream receipts;
- source changes after Implementation invalidate Implementation onward;
- Review PASS is tied to the exact source and review artifact;
- required executable checks cannot be replaced by Markdown claims;
- PASS check receipts contain exact source-before/source-after identity;
- source-mutating checks become STALE and cannot satisfy required evidence;
- checks configuration changes stale completed Verification;
- verification.md changes stale completed Verification;
- selected evidence-receipt tampering stales Verification;
- Final Acceptance is tied to exact verified source/evidence;
- committed implementation changes remain in the source manifest;
- unchanged pre-existing dirty files are excluded from the change manifest;
- schema v1/v2 migration to v3 creates no fabricated freshness receipts;
- malformed/tampered evidence fails closed;
- production source receipt creation fails closed outside Git;
- check command execution remains `shell:false` and path/cwd configuration is validated.

The same complete suite must pass against both compiled TypeScript and the committed zero-setup runtime. The packaged CLI must smoke-test successfully. CI must pass on Node 20 across Linux, macOS, and Windows.

Rejected transitions, stale detection, and recovery conflicts must preserve persisted state unless the caller explicitly invokes a mutating recovery/invalidation command. Runtime parity is behavioral, not byte-format based.
