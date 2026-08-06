# Migration & Sync Guide: awslabs/aidlc-workflows → aidlc-workflows Skill

This guide documents how the `aidlc-workflows` agent skill in this repository was created from the upstream
[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) repository, and how to **re-sync** the skill
whenever the upstream documents are updated.

## Mapping Overview

| Upstream source | Local target |
|---|---|
| `aidlc-rules/aws-aidlc-rules/core-workflow.md` | `.agents/skills/aidlc-workflows/SKILL.md` (cleaned & rewritten, see §3) |
| `aidlc-rules/aws-aidlc-rule-details/` (all files) | `.agents/skills/aidlc-workflows/references/` (copied verbatim, then patched per §4) |

Everything else in the upstream repo (IDE setup files, evaluator scripts, docs, assets) is **not** part of the skill.

## Sync Procedure

### Step 1 — Fetch upstream sources

Use a sparse clone into a temp directory (faster than downloading files individually):

```bat
git clone --depth 1 --filter=blob:none --sparse https://github.com/awslabs/aidlc-workflows.git aidlc-tmp
cd aidlc-tmp
git sparse-checkout set aidlc-rules
```

Use `C:\Users\qianpeng\AppData\Local\Temp\opencode` (or any temp dir) as the parent directory for `aidlc-tmp`.

### Step 2 — Sync `references/`

Copy the rule-details tree over `references/`, preserving the subdirectory structure:

```bat
robocopy aidlc-tmp\aidlc-rules\aws-aidlc-rule-details ^
  D:\Documents\PythonProject\aidlc-skills\.agents\skills\aidlc-workflows\references /E /PURGE
```

`/PURGE` removes local files that were deleted upstream — review its output before committing.
Directories expected after sync (31 files as of the initial migration):

- `common/` (11 files), `inception/` (7 files), `construction/` (6 files), `operations/` (1 file), `extensions/` (6 files incl. `*.opt-in.md`)

### Step 3 — Regenerate `SKILL.md` from `core-workflow.md`

`SKILL.md` is **not** a verbatim copy. Apply these transformations to the upstream `core-workflow.md` content:

1. **Frontmatter**: prepend the skill frontmatter. Keep it stable across syncs. Note: **do NOT add
   `metadata.author`** — the content is migrated from AWS's upstream repo, so personal attribution is
   intentionally omitted to avoid copyright/attribution concerns:

   ```yaml
   ---
   name: aidlc-workflows
   description: AWS AI-DLC adaptive software development workflow (Inception / Construction / Operations). Use whenever the user requests any software development work — building features, requirements analysis, user stories, application/functional/NFR/infrastructure design, code generation, build & test planning, or reverse engineering an existing codebase. This workflow OVERRIDES other built-in workflows for software development requests.
   license: MIT
   ---
   ```

2. **Remove the multi-path resolution block**: delete the "check these paths in order" list
   (`.aidlc/aidlc-rules/aws-aidlc-rule-details/`, `.aidlc-rule-details/`, `.kiro/...`, `.amazonq/...`) and any
   IDE-specific mentions (Cursor, Cline, Claude Code, GitHub Copilot, OpenAI Codex, Kiro, Amazon Q Developer).
   Replace with a single statement: rule detail files live in the `references/` directory next to `SKILL.md`.

3. **Prefix all rule-detail references with `references/`**: every path like
   `` `common/xxx.md` ``, `` `inception/xxx.md` ``, `` `construction/xxx.md` ``, `` `operations/xxx.md` ``
   becomes `` `references/common/xxx.md` `` etc. The extensions scan path `extensions/` becomes `references/extensions/`.

4. **Keep runtime-artifact paths unchanged**: `aidlc-docs/...` paths (e.g. `aidlc-docs/aidlc-state.md`,
   `aidlc-docs/audit.md`) refer to the end-user's workspace, NOT the skill — never rewrite them.

5. **Preserve upstream formatting**: keep all original emoji decorations (phase heading markers 🟢/🟡,
   ✅/❌ in the audit.md section, ⚠️/📄 in the directory-structure diagram) exactly as upstream — this
   minimizes diff noise on future syncs. The ONLY structural rewrite is converting the leading
   `# PRIORITY:` / `# When user requests...` comment lines into a proper bold intro paragraph under the
   `# AI-DLC Adaptive Software Development Workflow` title.

6. **Bare filename references stay as-is**: upstream uses bare references like "see workspace-detection.md
   for message formats" or "as defined in functional-design.md". These were verified to be unambiguous —
   each appears in the same stage block right after a full `references/...` path pointing at the same file.
   Do NOT rewrite them; only the "Load all steps from ..."-style references get the `references/` prefix (rule 3).

### Step 4 — Re-apply patches to `references/` cross-references

Upstream reference files contain cross-links written relative to the rule-details root, which break inside the
skill layout. After every sync, grep for broken patterns and fix as follows (these are the fixes applied in the
initial migration — re-check each sync, upstream may add new ones):

| File | Upstream text | Patched to |
|---|---|---|
| `references/common/content-validation.md` | `` `common/ascii-diagram-standards.md` `` (2 occurrences) | `` `ascii-diagram-standards.md` `` (same dir) |
| `references/inception/user-stories.md` | `` `common/question-format-guide.md` `` | `` `../common/question-format-guide.md` `` |
| `references/inception/requirements-analysis.md` | `` `extensions/` subdirectories `` | `` `../extensions/` subdirectories `` |
| `references/common/terminology.md` | `Location: \`inception/\``, `` `construction/\``, `` `operations/\`` | prefix each with `aidlc-docs/` (they describe runtime artifact dirs) |

Patterns to grep for in `references/` after each sync:

- `` `(common|inception|construction|operations|extensions)/[^`]*\.md` `` — root-relative links that may need
  conversion to file-relative (`../...` or same-dir) form. Note: `../common/depth-levels.md`-style links are
  already correct and must be left alone.
- `aws-aidlc-rule-details`, `.aidlc-rule-details`, `.aidlc/`, `.kiro`, `.amazonq`, `core-workflow` — must yield
  **zero** matches across the whole skill directory.
- `aidlc-docs/` — expected and correct; do NOT touch.

### Step 5 — Verify

1. Grep the entire skill directory (`.agents/skills/aidlc-workflows/`) for the forbidden patterns above; expect zero matches.
2. Check that every file path mentioned in `SKILL.md` with a `references/` prefix actually exists on disk.
3. Delete the temp clone: `rmdir /s /q aidlc-tmp`.

### Step 6 — Commit

Commit `SKILL.md` and `references/` together with a message noting the upstream commit SHA synced from
(record it via `git -C aidlc-tmp rev-parse HEAD` before deleting the temp clone).
