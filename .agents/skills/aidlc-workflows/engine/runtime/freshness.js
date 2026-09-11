import { EngineError } from './errors.js';
import { checksConfigDigest } from './checks.js';
import { selectedEvidenceDigest } from './evidence.js';
import { hashArtifact } from './hashing.js';
import { buildDesignReceipt, buildPlanReceipt, buildRequirementsReceipt } from './receipts.js';
import { captureSourceSnapshot } from './source.js';
import { assertValidState } from './validation.js';
function same(a, b) { return a === b; }
function sourceDigest(root) {
    try {
        return { digest: captureSourceSnapshot(root).digest, error: null };
    }
    catch (error) {
        return { digest: null, error: error instanceof Error ? error.message : String(error) };
    }
}
export function inspectFreshness(root, state, evidence) {
    if (state.stage === 'cancelled')
        return [];
    const issues = [];
    if (state.progress.requirements === 'complete') {
        if (!state.freshness.requirements)
            issues.push({ dependency: 'requirements', message: 'Completed Requirements has no v0.2 fingerprint receipt' });
        else {
            try {
                const current = buildRequirementsReceipt(root, state, state.freshness.requirements.completed_at);
                if (!same(current.bundle_sha256, state.freshness.requirements.bundle_sha256))
                    issues.push({ dependency: 'requirements', message: 'request.md or requirements.md changed after Requirements completed' });
            }
            catch (error) {
                issues.push({ dependency: 'requirements', message: `Requirements fingerprint cannot be reproduced: ${error.message}` });
            }
        }
    }
    if (state.workflow.design_required && state.progress.design === 'complete') {
        if (!state.freshness.design)
            issues.push({ dependency: 'design', message: 'Completed Design has no v0.2 fingerprint receipt' });
        else {
            try {
                const current = buildDesignReceipt(root, state, state.freshness.design.completed_at);
                if (!same(current.bundle_sha256, state.freshness.design.bundle_sha256))
                    issues.push({ dependency: 'design', message: 'requirements.md or design.md changed after Design completed' });
            }
            catch (error) {
                issues.push({ dependency: 'design', message: `Design fingerprint cannot be reproduced: ${error.message}` });
            }
        }
    }
    if (state.progress.plan === 'complete') {
        if (!state.freshness.plan)
            issues.push({ dependency: 'plan', message: 'Completed Plan has no v0.2 fingerprint receipt' });
        else {
            try {
                const current = buildPlanReceipt(root, state, state.freshness.plan.completed_at);
                if (!same(current.bundle_sha256, state.freshness.plan.bundle_sha256))
                    issues.push({ dependency: 'plan', message: 'Requirements/Design/Plan artifact set changed after Plan completed' });
            }
            catch (error) {
                issues.push({ dependency: 'plan', message: `Plan fingerprint cannot be reproduced: ${error.message}` });
            }
        }
    }
    const implementationStarted = state.progress.implementation === 'active' || state.progress.implementation === 'complete' || ['review', 'verification', 'final_acceptance', 'complete'].includes(state.stage);
    if (state.workflow.planning_gate_required && implementationStarted) {
        if (!state.freshness.planning_approval)
            issues.push({ dependency: 'planning_approval', message: 'Implementation is authorized without a v0.2 planning-approval receipt' });
        else if (!state.freshness.plan || state.freshness.planning_approval.plan_bundle_sha256 !== state.freshness.plan.bundle_sha256)
            issues.push({ dependency: 'planning_approval', message: 'Planning approval does not match the current completed Plan fingerprint' });
    }
    let currentSource = null;
    const source = () => currentSource ??= sourceDigest(root);
    if (state.progress.implementation === 'complete') {
        if (!state.freshness.implementation)
            issues.push({ dependency: 'implementation', message: 'Completed Implementation has no source snapshot receipt' });
        else {
            if (!state.freshness.plan || state.freshness.implementation.plan_bundle_sha256 !== state.freshness.plan.bundle_sha256)
                issues.push({ dependency: 'implementation', message: 'Implementation is bound to a different Plan fingerprint' });
            const now = source();
            if (!now.digest)
                issues.push({ dependency: 'implementation', message: `Current source snapshot is unavailable: ${now.error}` });
            else if (now.digest !== state.freshness.implementation.source_digest)
                issues.push({ dependency: 'implementation', message: 'Source changed after Implementation completed' });
            if (evidence.source.manifest_digest !== state.freshness.implementation.source_manifest_digest)
                issues.push({ dependency: 'implementation', message: 'Source manifest evidence changed after Implementation completed' });
        }
    }
    if (state.workflow.review_required && state.progress.review === 'complete') {
        if (!state.freshness.review)
            issues.push({ dependency: 'review', message: 'Completed Review has no source-bound review receipt' });
        else {
            const now = source();
            if (!now.digest || now.digest !== state.freshness.review.source_digest)
                issues.push({ dependency: 'review', message: 'Review is stale because the source snapshot changed' });
            try {
                const reviewHash = hashArtifact(root, state.artifacts.review, 'review');
                if (reviewHash !== state.freshness.review.review_sha256)
                    issues.push({ dependency: 'review', message: 'review.md changed after Review passed' });
            }
            catch (error) {
                issues.push({ dependency: 'review', message: `Review fingerprint cannot be reproduced: ${error.message}` });
            }
        }
    }
    if (state.progress.verification === 'complete') {
        if (!state.freshness.verification)
            issues.push({ dependency: 'verification', message: 'Completed Verification has no evidence receipt' });
        else {
            const now = source();
            if (!now.digest || now.digest !== state.freshness.verification.source_digest)
                issues.push({ dependency: 'verification', message: 'Verification is stale because the source snapshot changed' });
            try {
                const verificationHash = hashArtifact(root, state.artifacts.verification, 'verification');
                if (verificationHash !== state.freshness.verification.verification_sha256)
                    issues.push({ dependency: 'verification', message: 'verification.md changed after Verification completed' });
                const evidenceDigest = selectedEvidenceDigest(evidence, state.freshness.verification.check_receipt_ids);
                if (evidenceDigest !== state.freshness.verification.evidence_digest)
                    issues.push({ dependency: 'verification', message: 'Structured check evidence changed after Verification completed' });
                const configDigest = checksConfigDigest(root);
                if (configDigest !== state.freshness.verification.checks_config_sha256)
                    issues.push({ dependency: 'verification', message: 'Verification check configuration changed after Verification completed' });
            }
            catch (error) {
                issues.push({ dependency: 'verification', message: `Verification evidence cannot be reproduced: ${error.message}` });
            }
        }
    }
    if (state.workflow.final_acceptance_required && state.progress.final_acceptance === 'complete') {
        if (!state.freshness.final_acceptance)
            issues.push({ dependency: 'final_acceptance', message: 'Completed Final Acceptance has no freshness receipt' });
        else {
            const now = source();
            if (!now.digest || now.digest !== state.freshness.final_acceptance.source_digest)
                issues.push({ dependency: 'final_acceptance', message: 'Final Acceptance is stale because source changed' });
            if (!state.freshness.verification || state.freshness.final_acceptance.verification_evidence_digest !== state.freshness.verification.evidence_digest)
                issues.push({ dependency: 'final_acceptance', message: 'Final Acceptance is bound to stale Verification evidence' });
        }
    }
    const order = ['requirements', 'design', 'plan', 'planning_approval', 'implementation', 'review', 'verification', 'final_acceptance'];
    return issues.sort((a, b) => order.indexOf(a.dependency) - order.indexOf(b.dependency));
}
function resetProgress(state, from) {
    const pending = (required) => required ? 'pending' : 'not_applicable';
    state.gate = null;
    state.blockers = [];
    state.status = 'active';
    switch (from) {
        case 'requirements':
            state.stage = 'requirements';
            state.progress.requirements = 'active';
            state.progress.design = pending(state.workflow.design_required);
            state.progress.plan = 'pending';
            state.progress.implementation = 'pending';
            state.progress.review = pending(state.workflow.review_required);
            state.progress.verification = 'pending';
            state.progress.final_acceptance = pending(state.workflow.final_acceptance_required);
            state.freshness = { requirements: null, design: null, plan: null, planning_approval: null, implementation: null, review: null, verification: null, final_acceptance: null };
            break;
        case 'design':
            state.stage = state.workflow.design_required ? 'design' : 'plan';
            state.progress.design = state.workflow.design_required ? 'active' : 'not_applicable';
            state.progress.plan = state.workflow.design_required ? 'pending' : 'active';
            state.progress.implementation = 'pending';
            state.progress.review = pending(state.workflow.review_required);
            state.progress.verification = 'pending';
            state.progress.final_acceptance = pending(state.workflow.final_acceptance_required);
            state.freshness.design = null;
            state.freshness.plan = null;
            state.freshness.planning_approval = null;
            state.freshness.implementation = null;
            state.freshness.review = null;
            state.freshness.verification = null;
            state.freshness.final_acceptance = null;
            break;
        case 'plan':
        case 'planning_approval':
            state.stage = 'plan';
            state.progress.plan = 'active';
            state.progress.implementation = 'pending';
            state.progress.review = pending(state.workflow.review_required);
            state.progress.verification = 'pending';
            state.progress.final_acceptance = pending(state.workflow.final_acceptance_required);
            state.freshness.plan = null;
            state.freshness.planning_approval = null;
            state.freshness.implementation = null;
            state.freshness.review = null;
            state.freshness.verification = null;
            state.freshness.final_acceptance = null;
            break;
        case 'implementation':
            state.stage = 'implementation';
            state.progress.implementation = 'active';
            state.progress.review = pending(state.workflow.review_required);
            state.progress.verification = 'pending';
            state.progress.final_acceptance = pending(state.workflow.final_acceptance_required);
            state.freshness.implementation = null;
            state.freshness.review = null;
            state.freshness.verification = null;
            state.freshness.final_acceptance = null;
            break;
        case 'review':
            state.stage = state.workflow.review_required ? 'review' : 'verification';
            state.progress.review = state.workflow.review_required ? 'active' : 'not_applicable';
            state.progress.verification = state.workflow.review_required ? 'pending' : 'active';
            state.progress.final_acceptance = pending(state.workflow.final_acceptance_required);
            state.freshness.review = null;
            state.freshness.verification = null;
            state.freshness.final_acceptance = null;
            break;
        case 'verification':
            state.stage = 'verification';
            state.progress.verification = 'active';
            state.progress.final_acceptance = pending(state.workflow.final_acceptance_required);
            state.freshness.verification = null;
            state.freshness.final_acceptance = null;
            break;
        case 'final_acceptance':
            if (!state.workflow.final_acceptance_required)
                throw new EngineError('INVALID_STATE', 'Cannot reopen Final Acceptance when it is not required');
            state.stage = 'final_acceptance';
            state.status = 'awaiting_acceptance';
            state.progress.final_acceptance = 'active';
            state.gate = { type: 'final_acceptance', status: 'open' };
            state.freshness.final_acceptance = null;
            break;
    }
}
export function refreshStaleState(current, issues) {
    if (current.status === 'blocked')
        throw new EngineError('ILLEGAL_TRANSITION', 'Resolve blockers before refreshing freshness');
    if (current.stage === 'cancelled')
        throw new EngineError('ILLEGAL_TRANSITION', 'Cancelled workflows are terminal');
    if (issues.length === 0)
        throw new EngineError('FRESHNESS_CURRENT', 'No stale workflow dependencies were detected');
    const next = JSON.parse(JSON.stringify(current));
    resetProgress(next, issues[0].dependency);
    assertValidState(next);
    return next;
}
