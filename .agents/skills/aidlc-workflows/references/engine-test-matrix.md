# Engine Test Matrix

Engine tests must cover both lifecycle semantics and storage failure modes.

Existing v0.1 coverage remains required: Low/Standard/High initialization, conditional Design, planning gates, approve/continue separation, reclassification, illegal transitions, Implementation predicates, Review pass/fail, Verification outcomes, Final Acceptance, blockers, and read-only operations.

v0.1.1 additionally requires coverage for:

- revision increments on every accepted mutation;
- cancellation is terminal and permits a later change;
- a held lock rejects a competing mutation;
- stale-lock diagnosis and safe repair;
- pending transaction blocks normal reads;
- interrupted transaction roll-forward through `doctor --repair`;
- schema-v1 migration to v2;
- artifact symlink escape rejection;
- parent-directory symlink write escape rejection;
- oversized artifact rejection;
- oversized transaction-journal rejection;
- healthy-workflow `doctor` output;
- the same full test suite passes against both compiled TypeScript and the committed zero-setup runtime;
- the packaged CLI smoke test passes;
- Node 20 CI passes on Linux, macOS, and Windows.

Rejected transitions and recovery conflicts must preserve persisted state rather than guessing. Runtime parity is behavioral: harmless compiler formatting differences are not treated as correctness failures, while semantic drift is caught by executing the same contract/hardening suite against both implementations.
