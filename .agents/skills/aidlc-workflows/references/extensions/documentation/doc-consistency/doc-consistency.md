# Documentation Consistency Rules

## Overview
These documentation consistency rules are MANDATORY cross-cutting constraints that apply across all AI-DLC phases. They exist because incremental change rounds (especially small feature additions and UI tweaks) silently invalidate artifacts produced in earlier stages — requirements, user stories, domain entities, component method signatures, business rules, and summary documents drift out of sync with the code unless every change is systematically propagated.

**Enforcement**: At each applicable stage, and after every change request, the model MUST verify compliance with these rules before presenting the completion message to the user.

### Blocking Documentation Finding Behavior
A **blocking documentation finding** means:
1. The finding MUST be listed in the stage completion message under a "Documentation Findings" section with the DOC rule ID and description
2. The stage MUST NOT present the "Continue to Next Stage" option until all blocking findings are resolved
3. The model MUST present only the "Request Changes" option with a clear explanation of what needs to change
4. The finding MUST be logged in `aidlc-docs/audit.md` with the DOC rule ID, description, and stage context

If a DOC rule is not applicable to the current change (e.g., DOC-01 when no artifacts reference the changed concept), mark it as **N/A** in the compliance summary — this is not a blocking finding.

### Default Enforcement
All rules in this document are **blocking** by default. If any rule's verification criteria are not met, it is a blocking documentation finding — follow the blocking finding behavior defined above.

### Verification Criteria Format
Verification items in this document are plain bullet points describing compliance checks. They are distinct from the `- [ ]` / `- [x]` progress-tracking checkboxes used in stage plan files. Each item should be evaluated as compliant or non-compliant during review.

---

## Rule DOC-01: Change-to-Artifact Impact Analysis

**Rule**: After any approved change (new requirement, feature modification, UI tweak, signature change, enum/value-range change), and BEFORE presenting the completion message, the model MUST:
1. List the keywords, numeric ranges, type signatures, component names, and counts affected by the change
2. Search the entire `aidlc-docs/` tree for occurrences of those terms (including superseded values)
3. Update every artifact that contains stale references, marking the change with its round/origin where the artifact format supports it

Typical impact mapping:
- New or modified functionality → requirements, user stories, business rules
- Enum or value-range changes → domain entities, business logic model, component methods, logic summaries
- Method signature changes → component methods, logic summaries, interaction flows in frontend component docs
- New components → component inventory, frontend component structure trees, frontend summaries
- Test count changes → test coverage sections of summaries

**Verification**:
- A grep/search of `aidlc-docs/` for the changed terms returns no stale (pre-change) values in maintained artifacts
- Newly introduced concepts appear in all artifacts that enumerate the affected category (e.g., a new enum value appears in every document listing that enum)
- Cross-reference and coverage tables (requirements-to-stories, stories-to-rules) include the new or changed items

---

## Rule DOC-02: Same-Interaction Plan Tracking

**Rule**: Every change request — including small fixes and visual tweaks — MUST be appended as a step to the relevant stage plan file and marked `[x]` in the same interaction where the work is completed. This extends the plan-level checkbox enforcement rules: unplanned work is still plan work once it happens.

**Verification**:
- The plan file contains a step describing the change request, with story/requirement traceability
- The step checkbox is marked `[x]` in the same interaction as the implementation
- No completed code change exists without a corresponding checked plan step

---

## Rule DOC-03: Documentation Gate in Completion Verification

**Rule**: The verification performed before presenting any stage or change completion MUST include a documentation consistency sweep in addition to code-level verification (compile, lint, tests, build). Code-green is not completion-green.

**Verification**:
- The completion message is preceded by both code verification (per project tooling) and the DOC-01 impact sweep
- Verification results stated in summaries and completion messages reflect the latest run (e.g., test counts are current, not copied from earlier rounds)

---

## Rule DOC-04: Historical Records Are Append-Only

**Rule**: Question-and-answer files, clarification sections of plan files, and `audit.md` entries are historical process records. They MUST NOT be retroactively rewritten to reflect later changes; corrections and new decisions are appended as new entries. This preserves the audit trail's integrity.

**Verification**:
- No historical Q&A answer or audit entry has been edited in place to change its original meaning
- Superseded decisions are followed by newer entries documenting the change, with timestamps

---

## Rule DOC-05: Generic Artifacts, No Cross-Project Leakage

**Rule**: When workflow rules or common artifacts are updated, they MUST be written generically — free of project-specific identifiers (project names, specific requirement/story/rule numbering from one project). Project-specific content belongs in the project's `aidlc-docs/` artifacts, never in shared workflow rules.

**Verification**:
- Shared rule files contain no references to any single project's artifacts, identifiers, or file names
- Examples in shared rules are illustrative and abstract
