# AI-DLC Skills Slim

A slim, runtime-agnostic AI-DLC workflow for structured AI-assisted software development.

This project is based on [qtalen/aidlc-skills](https://github.com/qtalen/aidlc-skills), a Skill-form adaptation of AWS AI-DLC v1. This fork deliberately removes most lifecycle ceremony and keeps only the parts that improve correctness: durable project context, explicit requirements, conditional design, a concrete implementation plan, evidence-based verification, and human approval where risk justifies it.

## Core idea

AI-DLC owns the **development lifecycle**. The currently selected agent owns **execution**.

The Skill does not prescribe agent names, models, providers, MCPs, or orchestration frameworks. A capable runtime may work directly, delegate to subagents, run tasks in parallel, or use specialist reviewers. Delegation never transfers responsibility for AI-DLC state, artifacts, or completion.

## Workflow

```text
Preflight (automatic)
    ↓
Requirements
    ↓
Design (only when needed)
    ↓
Plan
    ↓
Planning gate for Standard/High-risk work
    ↓
Implementation
    ↓
Independent review when required by risk
    ↓
Verification
    ↓
Final acceptance
```

Risk profiles:

- **Low** — Requirements → Plan → Implement → Verify. The user's implementation request is sufficient authorization unless a consequential decision appears.
- **Standard** — Requirements → optional Design → Plan → approval gate → Implement → Verify.
- **High** — Requirements → Design → Plan → approval gate → Implement → independent review → Verify.

At any approval gate, `approve` means **approve and hold**. `continue`, `proceed`, or equivalent means **approve and continue**. Ambiguity defaults to hold.

## Project layout

```text
<project>/
├── AGENTS.md                         # thin context map; preserve existing file if present
└── aidlc-docs/
    ├── project/                      # durable project truth
    │   ├── brief.md
    │   ├── architecture.md
    │   ├── tech-stack.md
    │   ├── testing.md
    │   └── decisions/                # ADRs only when consequential
    ├── changes/
    │   └── <date>-<slug>/            # one isolated workflow per change
    │       ├── request.md
    │       ├── requirements.md
    │       ├── design.md              # conditional
    │       ├── plan.md
    │       ├── verification.md
    │       └── audit.md
    └── aidlc-state.md                # the only workflow cursor
```

The source code and configuration remain executable technical truth. `aidlc-docs/project/` is a concise, maintained summary of durable project decisions. Per-change artifacts never become a second permanent knowledge base.

## Installation

Copy `.agents/` into a project root, or install the skill globally using the mechanism supported by your agent runtime. The workflow itself is runtime-agnostic.

For a project using the Skill for the first time, the active agent should create the minimal `aidlc-docs/project/` baseline from the existing repository (brownfield) or from approved design decisions (greenfield). Templates are included under the Skill directory.

## Deliberate non-goals

This fork does not include a deterministic state engine, multi-agent routing, a second planning system, or a large compliance framework. Do not run a competing end-to-end lifecycle inside an active AI-DLC change. Normal delegation and specialist work inside a stage are expected.

If experience later shows that agents skip gates or stale artifacts cause real failures, a small deterministic state/evidence engine can be added without changing this workflow model.

## Attribution

See `ATTRIBUTION.md`. The upstream repository and this fork are distributed under the MIT License.
