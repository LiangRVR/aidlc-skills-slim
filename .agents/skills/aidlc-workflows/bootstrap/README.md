# Guided Bootstrap

`aidlc init` is the user-facing project setup layer for AI-DLC Slim. It is intentionally separate from the deterministic lifecycle engine and does **not** create, advance, or reset an AI-DLC change.

Use the two commands for different jobs:

```text
aidlc init          configure/bootstrap a project for AI-DLC

aidlc-engine init   initialize one software change inside an already configured project
```

## First run

From the project directory:

```bash
aidlc init
```

The initializer inspects before it asks. It:

- requires Node.js 20+ and Git;
- resolves the containing Git project root, even when run from a nested directory;
- offers to initialize Git when no repository exists;
- distinguishes greenfield from existing/brownfield projects;
- detects common stacks, package managers, repository configuration, and verification scripts;
- ignores placeholder test commands that should not become verification evidence;
- asks only for important information that is still missing or cannot be safely inferred;
- keeps undecided greenfield stack/architecture choices explicitly undecided rather than inventing them;
- installs or repairs the repository-local `.agents/skills/aidlc-workflows/` tree without overwriting existing Skill files;
- preserves existing `AGENTS.md` and `aidlc-docs/project/*` context;
- creates only missing durable project files and `checks.json`;
- validates an existing `checks.json` instead of silently replacing an invalid one;
- runs the existing engine `doctor` after setup without inventing workflow state.

Typical interactive questions include project purpose, primary users/operators, whether the project is already used by real users, whether sensitive/security-critical information is involved, confirmation of an inferred stack, and which detected verification commands should be part of the project contract.

For a greenfield project where the technology stack has not been decided, the generated baseline records that decision as pending so Requirements/Design can make it later.

## Existing setup

`aidlc init` is intended to be idempotent. Running it again preserves existing project-owned context and repairs only missing setup files.

If an AI-DLC workflow is already active, its state is preserved. Bootstrap never uses project initialization as a lifecycle stage.

## Automation

For non-interactive/default-accepting setup:

```bash
aidlc init --yes
```

`--yes` selects conservative defaults: detected required checks are configured, optional checks are not automatically promoted to required, existing files remain untouched, and an undecided greenfield stack stays undecided.

A different target can be supplied with:

```bash
aidlc init --root /path/to/project
```

## Result

A successful bootstrap leaves the project with the repository-local Skill plus durable context similar to:

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

It then runs `doctor` and prints the next action:

```text
Tell your coding agent:
"Use AI-DLC Slim to implement <your change>."
```

The coding agent should review/refine repository-derived baseline information when the first real change reveals additional durable project truth.
