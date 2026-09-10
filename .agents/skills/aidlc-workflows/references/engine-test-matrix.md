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
- symlink escape rejection;
- oversized artifact rejection;
- healthy-workflow `doctor` output;
- committed runtime matches generated TypeScript output;
- Node 20 CI on Linux, macOS, and Windows.

Rejected transitions and recovery conflicts must preserve persisted state rather than guessing.
