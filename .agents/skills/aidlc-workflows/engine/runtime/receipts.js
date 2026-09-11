import { canonicalDigest, hashArtifact, hashPlanArtifact } from './hashing.js';
export function emptyFreshness() {
    return {
        requirements: null,
        design: null,
        plan: null,
        planning_approval: null,
        implementation: null,
        review: null,
        verification: null,
        final_acceptance: null,
    };
}
export function buildRequirementsReceipt(root, state, at = new Date().toISOString()) {
    const request_sha256 = hashArtifact(root, state.artifacts.request, 'request');
    const requirements_sha256 = hashArtifact(root, state.artifacts.requirements, 'requirements');
    return { request_sha256, requirements_sha256, bundle_sha256: canonicalDigest({ request_sha256, requirements_sha256 }), completed_at: at };
}
export function buildDesignReceipt(root, state, at = new Date().toISOString()) {
    const requirements_sha256 = hashArtifact(root, state.artifacts.requirements, 'requirements');
    const design_sha256 = hashArtifact(root, state.artifacts.design, 'design');
    return { requirements_sha256, design_sha256, bundle_sha256: canonicalDigest({ requirements_sha256, design_sha256 }), completed_at: at };
}
export function buildPlanReceipt(root, state, at = new Date().toISOString()) {
    const requirements_sha256 = hashArtifact(root, state.artifacts.requirements, 'requirements');
    const design_sha256 = state.workflow.design_required ? hashArtifact(root, state.artifacts.design, 'design') : null;
    const plan_sha256 = hashPlanArtifact(root, state.artifacts.plan);
    return { requirements_sha256, design_sha256, plan_sha256, bundle_sha256: canonicalDigest({ requirements_sha256, design_sha256, plan_sha256 }), completed_at: at };
}
export function buildPlanningApprovalReceipt(plan, existing, continueNow, at = new Date().toISOString()) {
    return {
        plan_bundle_sha256: plan.bundle_sha256,
        approved_at: existing?.approved_at ?? at,
        continued_at: continueNow ? at : existing?.continued_at ?? null,
    };
}
export function buildImplementationReceipt(plan, sourceDigest, manifestDigest, at = new Date().toISOString()) {
    return { plan_bundle_sha256: plan.bundle_sha256, source_digest: sourceDigest, source_manifest_digest: manifestDigest, captured_at: at };
}
export function buildReviewReceipt(root, state, sourceDigest, at = new Date().toISOString()) {
    return { source_digest: sourceDigest, review_sha256: hashArtifact(root, state.artifacts.review, 'review'), reviewed_at: at };
}
export function buildVerificationReceipt(root, state, sourceDigest, checksConfigSha256, evidenceDigest, receiptIds, outcome, at = new Date().toISOString()) {
    return {
        source_digest: sourceDigest,
        verification_sha256: hashArtifact(root, state.artifacts.verification, 'verification'),
        checks_config_sha256: checksConfigSha256,
        evidence_digest: evidenceDigest,
        check_receipt_ids: [...receiptIds].sort(),
        outcome,
        verified_at: at,
    };
}
export function buildFinalAcceptanceReceipt(verification, at = new Date().toISOString()) {
    return { source_digest: verification.source_digest, verification_evidence_digest: verification.evidence_digest, accepted_at: at };
}
