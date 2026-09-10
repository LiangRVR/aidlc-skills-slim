import { EngineError } from './errors.js';
import { assertValidState, assertWorkflowInvariants } from './validation.js';
import type { AidlcState, Risk, WorkflowFlags } from './types.js';

export interface ReclassifyInput {
  risk: Risk;
  risk_rationale: string;
  workflow: WorkflowFlags;
}

function cloneState(state: AidlcState): AidlcState {
  return JSON.parse(JSON.stringify(state)) as AidlcState;
}

/**
 * Reclassify workflow routing before Implementation begins.
 *
 * Any reclassification invalidates Plan approval/progress conservatively.
 * If Design becomes newly required, the workflow is routed through Design
 * before a fresh Plan can be approved.
 */
export function reclassifyState(current: AidlcState, input: ReclassifyInput): AidlcState {
  assertValidState(current);
  if (!['requirements', 'design', 'plan'].includes(current.stage) || current.status === 'blocked') {
    throw new EngineError('ILLEGAL_TRANSITION', 'Workflow reclassification is allowed only before Implementation begins');
  }
  if (!input.risk_rationale.trim()) throw new EngineError('INVALID_ARGUMENT', 'risk_rationale is required');

  const next = cloneState(current);
  const priorDesignComplete = current.workflow.design_required && current.progress.design === 'complete';
  const requirementsComplete = current.progress.requirements === 'complete';
  const base = `aidlc-docs/changes/${current.active_change}`;

  next.risk = input.risk;
  next.risk_rationale = input.risk_rationale.trim();
  next.workflow = { ...input.workflow };
  next.status = 'active';
  next.gate = null;
  next.blockers = [];

  next.progress.requirements = requirementsComplete ? 'complete' : 'active';
  next.artifacts.design = input.workflow.design_required ? `${base}/design.md` : null;
  next.progress.design = input.workflow.design_required
    ? (priorDesignComplete ? 'complete' : 'pending')
    : 'not_applicable';

  next.progress.plan = 'pending';
  next.progress.implementation = 'pending';
  next.artifacts.review = input.workflow.review_required ? `${base}/review.md` : null;
  next.progress.review = input.workflow.review_required ? 'pending' : 'not_applicable';
  next.progress.verification = 'pending';
  next.progress.final_acceptance = input.workflow.final_acceptance_required ? 'pending' : 'not_applicable';

  if (!requirementsComplete) {
    next.stage = 'requirements';
  } else if (input.workflow.design_required && !priorDesignComplete) {
    next.stage = 'design';
    next.progress.design = 'active';
  } else {
    next.stage = 'plan';
    next.progress.plan = 'active';
  }

  assertWorkflowInvariants(next);
  assertValidState(next);
  return next;
}
