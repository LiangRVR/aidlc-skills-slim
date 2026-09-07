# Context Checkpointing — Opt-In

**Extension**: Context Checkpointing

## Opt-In Prompt

The following question is automatically included in the Requirements Analysis clarifying questions when this extension is loaded:

```markdown
## Question: Context Checkpointing Extension
This extension controls how much the AI reloads into its context when a session is resumed. If enabled, the workflow writes a short checkpoint file (key decisions, core constraints, artifact inventory, open items) at the end of each phase/unit. New sessions then reload only these checkpoints plus the current stage's documents, instead of re-reading all previously generated documents and the full audit log — keeping the AI fast and focused as the project grows.

Should context checkpointing rules (CTX) be enforced for this project?

A) Yes — write checkpoints at each phase/unit boundary and reload only them on session resumption (recommended for long-running, multi-session, or multi-unit projects)

B) No — no checkpoints; each new session reloads all previous stage documents as needed (suitable for small projects completable within a single session)

X) Other (please describe after [Answer]: tag below)

[Answer]: 
```

## Session Resumption Trigger

**Checkpoint-first loading must take effect at session start — before session-continuity.md's loading instructions are followed. Therefore, at workflow start or session resumption (BEFORE applying `references/common/session-continuity.md` loading steps), check `aidlc-docs/aidlc-state.md`:**

- **If** `## Extension Configuration` shows this extension **Enabled** (opted in during a prior session): load the full rules file `checkpointing.md` (same directory) IMMEDIATELY, and apply CTX-02 checkpoint-first loading — which **takes precedence over** the full-artifact loading in session-continuity.md. Enabled extension rules are hard constraints (see SKILL.md Extensions Loading); in case of conflict between an enabled extension rule and a common rule, the enabled extension rule wins for its stated scope.
- **If** the extension is disabled, not configured, or no aidlc-state.md exists: take NO checkpointing action — proceed with standard session-continuity loading, and the opt-in prompt above is presented during Requirements Analysis as usual.
