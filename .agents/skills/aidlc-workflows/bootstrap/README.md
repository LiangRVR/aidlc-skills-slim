# Guided Bootstrap

`aidlc init` is the user-facing project setup layer for AI-DLC Slim. It is intentionally separate from the deterministic lifecycle engine and does not create a workflow change.

The initializer:

- requires Node.js 20+ and Git;
- resolves the Git project root;
- distinguishes greenfield from existing projects;
- detects common stacks and package scripts;
- asks only for information that cannot be safely inferred;
- installs the repository-local Skill when needed;
- preserves existing `AGENTS.md` and `aidlc-docs/project/*` files;
- creates missing durable project context and `checks.json`;
- runs the engine doctor without inventing workflow state.

Normal use:

```bash
aidlc init
```

Non-interactive/default-accepting mode for automation and tests:

```bash
aidlc init --yes
```

The initializer never treats setup as an AI-DLC lifecycle stage.
