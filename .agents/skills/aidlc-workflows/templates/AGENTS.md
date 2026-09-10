# AGENTS.md — Project Context Map

Keep this file short. Include only project-specific information that is expensive, ambiguous, or unsafe to rediscover from the repository.

## Read when relevant

- Product purpose and durable constraints: `aidlc-docs/project/brief.md`
- Architecture and integration choices: `aidlc-docs/project/architecture.md`
- Stack, setup, and important commands: `aidlc-docs/project/tech-stack.md`
- Verification expectations: `aidlc-docs/project/testing.md`
- Consequential architectural decisions: `aidlc-docs/project/decisions/`
- Active structured change: `aidlc-docs/aidlc-state.md`

Load only what the current task needs. Source code and configuration are authoritative for mechanically discoverable details such as dependency manifests, file structure, and implementation specifics.

## Project-specific gotchas

- Add only non-obvious constraints or failure modes that future agents are likely to miss.

## Protected areas

- Never expose or commit secrets, credentials, private logs, or production data.
- Preserve unrelated working-tree changes.
- Before deployments, external sends, destructive production operations, charges, permission changes, or other consequential external actions, ensure the user's authorization covers the action and target.
