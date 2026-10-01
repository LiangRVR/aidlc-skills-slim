# Guided Bootstrap

`aidlc init` is the user-facing **mechanical project bootstrap** for AI-DLC Slim. It is intentionally separate from both semantic project understanding and the deterministic lifecycle engine.

Use the concepts for different jobs:

```text
aidlc init                 mechanical project bootstrap
active parent agent        semantic project initialization/reconciliation
aidlc-engine init          initialize one software change
```

Project bootstrap and semantic project initialization are **not** lifecycle stages. They do not create, advance, or reset an AI-DLC change.

## Recommended first run

The best experience is to let the current coding agent own the complete setup:

```text
Initialize AI-DLC Slim in this repository. Run the mechanical bootstrap if needed,
then inspect the repository and initialize/reconcile the durable project context.
Ask me only for material intent or constraints you cannot safely infer.
```

If the Skill is not installed yet, the agent can run the package bootstrap from the project directory:

```bash
npm exec --yes --package=github:LiangRVR/aidlc-skills-slim -- aidlc init --yes
```

The CLI can also be run manually:

```bash
aidlc init
```

After a manual CLI run, the active coding agent must still perform semantic project initialization before relying on placeholder project context.

## What the CLI does

The mechanical initializer:

- requires Node.js 20+ and Git;
- resolves the containing Git project root, even when run from a nested directory;
- offers to initialize Git when no repository exists;
- distinguishes greenfield from existing/brownfield repositories using bounded local signals;
- detects common stack signals only for bootstrap diagnostics and safe repository-defined check discovery;
- detects verification candidates such as npm scripts, `pytest`, `cargo test`, and `go test`;
- ignores placeholder test commands that should not become verification evidence;
- installs or repairs the repository-local `.agents/skills/aidlc-workflows/` tree without overwriting existing same-version Skill files;
- refuses mixed-version repair when an existing Skill has a missing, invalid, or different installation version marker;
- preserves existing `AGENTS.md` and `aidlc-docs/project/*` context;
- copies only missing durable project-context templates;
- creates a starter `checks.json` only from mechanically detected repository-defined commands;
- validates an existing `checks.json` instead of silently replacing an invalid one;
- performs bounded, project-contained reads of repository metadata used for detection;
- rejects managed/setup paths that resolve outside the project through symlinks;
- runs the existing engine `doctor` after setup without inventing workflow state.

The CLI intentionally does **not** decide or write project purpose, users, architecture, architecture rationale, security boundaries, deployment topology, or testing strategy. Those require semantic understanding and belong to the active parent agent.

## What the agent does next

After mechanical bootstrap, the Skill tells the active parent agent to load `references/project-context.md` and inspect the repository before asking questions.

For an existing project, the agent should usually be able to infer most of the baseline from README/docs, manifests, source boundaries, schemas, CI/deployment configuration, tests, and other repository evidence.

For a greenfield project, the agent should ask only high-value questions such as product purpose, primary users, and hard constraints. It must not invent an undecided architecture or stack.

Fresh templates contain:

```text
<!-- AI-DLC-CONTEXT: PENDING -->
```

The agent removes that marker only after it has semantically reconciled that document against repository evidence and material user intent.

## Existing setup and repair

`aidlc init` is idempotent. Running it again preserves existing project-owned context and repairs missing setup files only when the installed Skill carries the same installation version marker as the initializer.

This restriction prevents an old engine/runtime from being silently mixed with files from a newer Skill. If an existing Skill has no version marker or reports a different version, `aidlc init` stops and tells you to back up/remove that Skill before installing the new one.

If an AI-DLC workflow is already active, its state is preserved.

## Automation

For non-interactive bootstrap:

```bash
aidlc init --yes
```

`--yes` uses conservative mechanical defaults: detected required checks are configured, optional checks are not automatically promoted to required, and existing project-owned files remain untouched.

A different target can be supplied with:

```bash
aidlc init --root /path/to/project
```

## Result

A successful bootstrap leaves the project with the repository-local Skill plus durable-context templates similar to:

```text
.agents/skills/aidlc-workflows/
AGENTS.md
aidlc-docs/project/
├── brief.md
├── architecture.md
├── tech-stack.md
├── testing.md
├── checks.json
└── decisions/
```

The active coding agent then turns those templates into useful durable context and maintains them as the project grows. The user should not need to manually synchronize architecture, stack, testing, or other observable project facts after every change.
