# Mechanical Bootstrap

`aidlc init` is the lower-level **mechanical bootstrap** used by AI-DLC Slim. It is **not** the complete initialization experience and it does **not** call an AI agent.

For normal use, start from your coding agent instead of running this command yourself.

## Recommended initialization

Tell the coding agent that is already working in the repository:

```text
Initialize AI-DLC Slim in this repository.
```

The active parent agent should then own the entire setup flow:

```text
User
  ↓
"Initialize AI-DLC Slim in this repository"
  ↓
Active coding agent
  ├─ run mechanical bootstrap if AI-DLC Slim is not installed
  ├─ load the AI-DLC Slim Skill
  ├─ inspect the repository
  ├─ initialize/reconcile durable project context
  ├─ ask only for material intent or constraints it cannot safely infer
  └─ validate the resulting context
  ↓
Project ready
```

This keeps AI-DLC Slim runtime-agnostic: the Skill defines the methodology, while whatever coding agent/runtime the user is already using performs the semantic work.

## Important: `aidlc init` does not call an agent

This command:

```bash
npm exec --yes --package=github:LiangRVR/aidlc-skills-slim -- aidlc init --yes
```

runs a Node.js CLI only. It cannot invoke a universal "current coding agent" because no runtime-agnostic agent API exists across OpenCode, OMO Slim, Claude Code, Codex, and other hosts.

The command performs only the safe mechanical portion of setup. If a user runs it manually, they must still return to their coding agent and ask it to initialize/reconcile the AI-DLC project context.

A suitable follow-up is:

```text
Initialize/reconcile the AI-DLC Slim project context from this repository.
Inspect first and ask me only for material intent or constraints you cannot safely infer.
```

## Responsibility split

```text
aidlc init                 mechanical bootstrap only
active parent agent        semantic project initialization/reconciliation
aidlc-engine init          initialize one software change
```

Project bootstrap and semantic project initialization are **not** lifecycle stages. They do not create, advance, or reset an AI-DLC change.

## What the mechanical bootstrap does

The CLI:

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

## What the agent does

After mechanical bootstrap, the active parent agent loads `references/project-context.md` and inspects the repository before asking questions.

For an existing project, it should usually infer most of the baseline from README/docs, manifests, source boundaries, schemas, CI/deployment configuration, tests, and other repository evidence.

For a greenfield project, it should ask only high-value questions such as product purpose, primary users, and hard constraints. It must not invent an undecided architecture or stack.

Fresh templates contain:

```text
<!-- AI-DLC-CONTEXT: PENDING -->
```

The agent removes that marker only after it has semantically reconciled that document against repository evidence and material user intent.

## Manual use of the bootstrap CLI

Manual execution is supported for advanced/offline setup or troubleshooting:

```bash
npm exec --yes --package=github:LiangRVR/aidlc-skills-slim -- aidlc init
```

For non-interactive mechanical bootstrap:

```bash
aidlc init --yes
```

A different target can be supplied with:

```bash
aidlc init --root /path/to/project
```

`--yes` uses conservative mechanical defaults: detected required checks are configured, optional checks are not automatically promoted to required, and existing project-owned files remain untouched.

## Existing setup and repair

`aidlc init` is idempotent. Running it again preserves existing project-owned context and repairs missing setup files only when the installed Skill carries the same installation version marker as the initializer.

This restriction prevents an old engine/runtime from being silently mixed with files from a newer Skill. If an existing Skill has no version marker or reports a different version, `aidlc init` stops and tells you to back up/remove that Skill before installing the new one.

If an AI-DLC workflow is already active, its state is preserved.

## Result of mechanical bootstrap

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

At this point the project is **mechanically bootstrapped, not semantically initialized**. The active coding agent must turn those templates into useful durable context and will continue maintaining them as the project grows.
