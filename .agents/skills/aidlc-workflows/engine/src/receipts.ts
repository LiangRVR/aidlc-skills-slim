import { canonicalDigest, hashArtifact } from './hashing.js';
import type {
  AidlcState,
  DesignReceipt,
  FinalAcceptanceReceipt,
  FreshnessReceipts,
  ImplementationReceipt,
  PlanningApprovalReceipt,
  PlanReceipt,
  RequirementsReceipt,
  ReviewReceipt,
  VerificationOutcome,
  VerificationReceipt,
} from './types.js';

export function emptyFreshness(): FreshnessReceipts {
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

export function buildRequirementsReceipt(root: string, state: AidlcState, at = new Date().toISOString()): RequirementsReceipt {
  const request_sha256 = hashArtifact(root, state.artifacts.request, 'request');
  const requirements_sha256 = hashArtifact(root, state.artifacts.requirements, 'requirements');
  return { request_sha256, requirements_sha256, bundle_sha256: canonicalDigest({ request_sha256, requirements_sha256 }), completed_at: at };
}

export function buildDesignReceipt(root: string, state: AidlcState, at = new Date().toISOString()): DesignReceipt {
  const requirements_sha256 = hashArtifact(root, state.artifacts.requirements, 'requirements');
  const design_sha256 = hashArtifact(root, state.artifacts.design, 'design');
  return { requirements_sha256, design_sha256, bundle_sha256: canonicalDigest({ requirements_sha256, design_sha256 }), completed_at: at };
}

export function buildPlanReceipt(root: string, state: AidlcState, at = new Date().toISOString()): PlanReceipt {
  const requirements_sha256 = hashArtifact(root, state.artifacts.requirements, 'requirements');
  const design_sha256 = state.workflow.design_required ? hashArtifact(root, state.artifacts.design, 'design') : null;
  const plan_sha256 = hashArtifact(root, state.artifacts.plan, 'plan');
  return { requirements_sha256, design_sha256, plan_sha256, bundle_sha256: canonicalDigest({ requirements_sha256, design_sha256, plan_sha256 }), completed_at: at };
}

export function buildPlanningApprovalReceipt(plan: PlanReceipt, existing: PlanningApprovalReceipt | null, continueNow: boolean, at = new Date().toISOString()): PlanningApprovalReceipt {
  return {
    plan_bundle_sha256: plan.bundle_sha256,
    approved_at: existing?.approved_at ?? at,
    continued_at: continueNow ? at : existing?.continued_at ?? null,
  };
}

export function buildImplementationReceipt(plan: PlanReceipt, sourceDigest: string, manifestDigest: string, at = new Date().toISOString()): ImplementationReceipt {
  return { plan_bundle_sha256: plan.bundle_sha256, source_digest: sourceDigest, source_manifest_digest: manifestDigest, captured_at: at };
}

export function buildReviewReceipt(root: string, state: AidlcState, sourceDigest: string, at = new Date().toISOString()): ReviewReceipt {
  return { source_digest: sourceDigest, review_sha256: hashArtifact(root, state.artifacts.review, 'review'), reviewed_at: at };
}

export function buildVerificationReceipt(root: string, state: AidlcState, sourceDigest: string, evidenceDigest: string, receiptIds: string[], outcome: VerificationOutcome, at = new Date().toISOString()): VerificationReceipt {
  return {
    source_digest: sourceDigest,
    verification_sha256: hashArtifact(root, state.artifacts.verification, 'verification'),
    evidence_digest: evidenceDigest,
    check_receipt_ids: [...receiptIds].sort(),
    outcome,
    verified_at: at,
  };
}

export function buildFinalAcceptanceReceipt(verification: VerificationReceipt, at = new Date().toISOString()): FinalAcceptanceReceipt {
  return { source_digest: verification.source_digest, verification_evidence_digest: verification.evidence_digest, accepted_at: at };
}
