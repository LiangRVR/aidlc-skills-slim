import { EngineError } from './errors.js';
import { checkExistingArtifactPath, MAX_ARTIFACT_BYTES, readTextIfExists } from './storage.js';
function readArtifact(root, path, label) {
    if (!path)
        throw new EngineError('PREDICATE_FAILED', `${label} artifact path is missing`);
    try { checkExistingArtifactPath(root, path); }
    catch (error) {
        if (error instanceof EngineError)
            throw new EngineError('PREDICATE_FAILED', `${label} artifact path is unsafe: ${error.message}`);
        throw error;
    }
    const text = readTextIfExists(root, path, MAX_ARTIFACT_BYTES);
    if (text === null)
        throw new EngineError('PREDICATE_FAILED', `${label} artifact does not exist: ${path}`);
    if (!text.trim())
        throw new EngineError('PREDICATE_FAILED', `${label} artifact is empty: ${path}`);
    return text;
}
function hasHeading(text, heading) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^#{2,6}\\s+${escaped}\\s*$`, 'im').test(text);
}
function sectionBody(text, heading) {
    const lines = text.split(/\r?\n/);
    const target = heading.trim().toLowerCase();
    let start = -1;
    let level = 0;
    for (let i = 0; i < lines.length; i += 1) {
        const match = lines[i].match(/^(#{2,6})\s+(.+?)\s*$/);
        if (match && match[2].trim().toLowerCase() === target) {
            start = i + 1;
            level = match[1].length;
            break;
        }
    }
    if (start < 0) return null;
    const body = [];
    for (let i = start; i < lines.length; i += 1) {
        const next = lines[i].match(/^(#{1,6})\s+/);
        if (next && next[1].length <= level) break;
        body.push(lines[i]);
    }
    return body.join('\n').trim();
}
function requirementIds(requirements) {
    const body = sectionBody(requirements, 'Acceptance Criteria') ?? '';
    const ids = new Set();
    for (const line of body.split(/\r?\n/)) {
        const match = line.match(/^\s*[-*]\s+(R[0-9A-Za-z_.-]+)\s*:/i);
        if (match) ids.add(match[1].toUpperCase());
    }
    return [...ids];
}
function requireNoBlockers(state) {
    if (state.blockers.length || state.status === 'blocked')
        throw new EngineError('PREDICATE_FAILED', 'Stage cannot complete while blockers remain', state.blockers);
}
export function checkRequirements(root, state) {
    requireNoBlockers(state);
    readArtifact(root, state.artifacts.request, 'request');
    const text = readArtifact(root, state.artifacts.requirements, 'requirements');
    for (const heading of ['Intent', 'Acceptance Criteria', 'Must Preserve', 'Constraints', 'Out of Scope'])
        if (!hasHeading(text, heading))
            throw new EngineError('PREDICATE_FAILED', `requirements.md is missing required section: ${heading}`);
    if (requirementIds(text).length === 0)
        throw new EngineError('PREDICATE_FAILED', 'requirements.md must contain at least one acceptance criterion ID such as R1:');
}
export function checkDesign(root, state) {
    requireNoBlockers(state);
    if (!state.workflow.design_required)
        throw new EngineError('ILLEGAL_TRANSITION', 'Design is not required for this workflow');
    const text = readArtifact(root, state.artifacts.design, 'design');
    for (const heading of ['Context', 'Proposed Design', 'Project Baseline Impact'])
        if (!hasHeading(text, heading))
            throw new EngineError('PREDICATE_FAILED', `design.md is missing required section: ${heading}`);
}
export function checkPlan(root, state) {
    requireNoBlockers(state);
    const text = readArtifact(root, state.artifacts.plan, 'plan');
    for (const heading of ['Scope', 'Work', 'Verification Strategy'])
        if (!hasHeading(text, heading))
            throw new EngineError('PREDICATE_FAILED', `plan.md is missing required section: ${heading}`);
    const work = sectionBody(text, 'Work') ?? '';
    if (!/^\s*(?:\d+\.\s*)?-\s*\[[ xX]\]/m.test(work) && !/^\s*\d+\.\s*\[[ xX]\]/m.test(work))
        throw new EngineError('PREDICATE_FAILED', 'plan.md Work must contain at least one checkbox item');
    const requirements = readArtifact(root, state.artifacts.requirements, 'requirements');
    const ids = requirementIds(requirements);
    const strategy = sectionBody(text, 'Verification Strategy') ?? '';
    const missing = ids.filter((id) => !new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(strategy));
    if (missing.length)
        throw new EngineError('PREDICATE_FAILED', 'Verification Strategy does not reference every acceptance criterion', missing);
}
export function checkImplementation(root, state) {
    requireNoBlockers(state);
    const text = readArtifact(root, state.artifacts.plan, 'plan');
    const work = sectionBody(text, 'Work') ?? '';
    const checkboxes = [...work.matchAll(/\[[ xX]\]/g)].map((m) => m[0]);
    if (checkboxes.length === 0)
        throw new EngineError('PREDICATE_FAILED', 'Plan Work has no implementation checkboxes');
    if (checkboxes.some((box) => box === '[ ]'))
        throw new EngineError('PREDICATE_FAILED', 'Implementation cannot complete while Plan Work contains unchecked items');
}
export function checkReviewPass(root, state) {
    requireNoBlockers(state);
    if (!state.workflow.review_required)
        throw new EngineError('ILLEGAL_TRANSITION', 'Review is not required for this workflow');
    const text = readArtifact(root, state.artifacts.review, 'review');
    if (!/^\s*(?:\*\*)?Verdict(?:\*\*)?\s*:\s*PASS\s*$/im.test(text))
        throw new EngineError('PREDICATE_FAILED', 'review.md must contain an explicit `Verdict: PASS`');
}
export function checkReviewFail(root, state) {
    if (!state.workflow.review_required)
        throw new EngineError('ILLEGAL_TRANSITION', 'Review is not required for this workflow');
    const text = readArtifact(root, state.artifacts.review, 'review');
    if (!/^\s*(?:\*\*)?Verdict(?:\*\*)?\s*:\s*(?:FAIL|CHANGES_REQUIRED)\s*$/im.test(text))
        throw new EngineError('PREDICATE_FAILED', 'review.md must contain `Verdict: FAIL` or `Verdict: CHANGES_REQUIRED`');
}
export function checkVerification(root, state) {
    requireNoBlockers(state);
    const text = readArtifact(root, state.artifacts.verification, 'verification');
    for (const heading of ['Requirement Coverage', 'Automated Checks', 'Runtime / User-Surface Checks', 'Baseline Consistency', 'Limitations / Residual Risk'])
        if (!hasHeading(text, heading))
            throw new EngineError('PREDICATE_FAILED', `verification.md is missing required section: ${heading}`);
    const requirements = readArtifact(root, state.artifacts.requirements, 'requirements');
    const ids = requirementIds(requirements);
    const coverage = sectionBody(text, 'Requirement Coverage') ?? '';
    const missing = [];
    let hasNotVerified = false;
    for (const id of ids) {
        const row = coverage.split(/\r?\n/).find((line) => new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line));
        if (!row) { missing.push(id); continue; }
        if (/\bFAIL\b/i.test(row))
            throw new EngineError('PREDICATE_FAILED', `Acceptance criterion ${id} is FAIL`);
        if (/\bNOT\s+VERIFIED\b/i.test(row))
            hasNotVerified = true;
        else if (!/\bPASS\b/i.test(row))
            missing.push(id);
    }
    if (missing.length)
        throw new EngineError('PREDICATE_FAILED', 'Every acceptance criterion must map to PASS or NOT VERIFIED', missing);
    if (hasNotVerified) {
        const limitations = sectionBody(text, 'Limitations / Residual Risk') ?? '';
        if (!limitations.trim() || /^none\.?$/i.test(limitations.trim()))
            throw new EngineError('PREDICATE_FAILED', 'NOT VERIFIED criteria require an explicit residual-risk explanation');
    }
}
