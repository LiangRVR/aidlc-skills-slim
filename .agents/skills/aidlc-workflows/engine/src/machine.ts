import { EngineError } from './errors.js';
import { checkDesign, checkImplementation, checkPlan, checkRequirements, checkReviewFail, checkReviewPass, checkVerification } from './predicates.js';
import { assertValidState, assertWorkflowInvariants } from './validation.js';
import type { AidlcState, InitInput, LifecycleEvent, NextDirective } from './types.js';

function cloneState(state: AidlcState): AidlcState {
  return JSON.parse(JSON.stringify(state)) as AidlcState;
}

function activeProgress(state: AidlcState, key: keyof AidlcState['progress']): void {
  state.progress[key] = 'active';
}

function resetDownstreamAfterImplementationReopen(state: AidlcState): void {
  state.progress.implementation = 'active';
  state.progress.review = state.workflow.review_required ? 'pending' : 'not_applicable';
  state.progress.verification = 'pending';
  state.progress.final_acceptance = state.workflow.final_acceptance_required ? 'pending' : 'not_applicable';
  state.gate = null;
}

export function createInitialState(input: InitInput): AidlcState {
  const change = input.active_change.trim();
  if (!change || change.includes('/') || change.includes('\\') || change === '.' || change === '..') {
    throw new EngineError('INVALID_ARGUMENT', 'active_change must be a non-empty single path segment');
  }
  if (!input.risk_rationale.trim()) throw new EngineError('INVALID_ARGUMENT', 'risk_rationale is required');
  if (!input.request.trim()) throw new EngineError('INVALID_ARGUMENT', 'request is required');

  const base = `aidlc-docs/changes/${change}`;
  const state: AidlcState = {
    schema_version: 1,
    active_change: change,
    risk: input.risk,
    risk_rationale: input.risk_rationale.trim(),
    workflow: { ...input.workflow },
    stage: 'requirements',
    status: 'active',
    gate: null,
    artifacts: {
      request: `${base}/request.md`,
      requirements: `${base}/requirements.md`,
      design: input.workflow.design_required ? `${base}/design.md` : null,
      plan: `${base}/plan.md`,
      review: input.workflow.review_required ? `${base}/review.md` : null,
      verification: `${base}/verification.md`,
    },
    progress: {
      requirements: 'active',
      design: input.workflow.design_required ? 'pending' : 'not_applicable',
      plan: 'pending',
      implementation: 'pending',
      review: input.workflow.review_required ? 'pending' : 'not_applicable',
      verification: 'pending',
      final_acceptance: input.workflow.final_acceptance_required ? 'pending' : 'not_applicable',
    },
    blockers: [],
  };
  assertValidState(state);
  return state;
}

function requireState(state: AidlcState, stage: AidlcState['stage'], statuses: AidlcState['status'][], event: string): void {
  if (state.stage !== stage || !statuses.includes(state.status)) {
    throw new EngineError('ILLEGAL_TRANSITION', `${event} is illegal from ${state.stage}/${state.status}`);
  }
}

export function applyEvent(root: string, current: AidlcState, event: LifecycleEvent): AidlcState {
  assertValidState(current);
  if (current.status === 'blocked') throw new EngineError('ILLEGAL_TRANSITION', `Cannot apply ${event} while workflow is blocked`);
  const next = cloneState(current);

  switch (event) {
    case 'requirements_complete': {
      requireState(current, 'requirements', ['active'], event);
      checkRequirements(root, current);
      next.progress.requirements = 'complete';
      if (next.workflow.design_required) {
        next.stage = 'design';
        activeProgress(next, 'design');
      } else {
        next.stage = 'plan';
        activeProgress(next, 'plan');
      }
      break;
    }
    case 'design_complete': {
      requireState(current, 'design', ['active'], event);
      checkDesign(root, current);
      next.progress.design = 'complete';
      next.stage = 'plan';
      activeProgress(next, 'plan');
      break;
    }
    case 'plan_complete': {
      requireState(current, 'plan', ['active'], event);
      checkPlan(root, current);
      next.progress.plan = 'complete';
      if (next.workflow.planning_gate_required) {
        next.status = 'awaiting_approval';
        next.gate = { type: 'planning', status: 'open' };
      } else {
        next.stage = 'implementation';
        next.status = 'active';
        next.gate = null;
        activeProgress(next, 'implementation');
      }
      break;
    }
    case 'approve': {
      requireState(current, 'plan', ['awaiting_approval'], event);
      if (current.gate?.type !== 'planning' || current.gate.status !== 'open') throw new EngineError('ILLEGAL_TRANSITION', 'approve requires an open planning gate');
      next.status = 'approved_hold';
      next.gate = { type: 'planning', status: 'approved_hold' };
      break;
    }
    case 'continue': {
      requireState(current, 'plan', ['awaiting_approval', 'approved_hold'], event);
      if (current.gate?.type !== 'planning' || !['open', 'approved_hold'].includes(current.gate.status)) {
        throw new EngineError('ILLEGAL_TRANSITION', 'continue requires an open or approved-hold planning gate');
      }
      next.stage = 'implementation';
      next.status = 'active';
      next.gate = null;
      activeProgress(next, 'implementation');
      break;
    }
    case 'request_changes': {
      if (current.stage === 'plan' && ['awaiting_approval', 'approved_hold'].includes(current.status)) {
        next.stage = 'plan';
        next.status = 'active';
        next.gate = null;
        next.progress.plan = 'active';
      } else if (current.stage === 'final_acceptance' && current.status === 'awaiting_acceptance') {
        next.stage = 'implementation';
        next.status = 'active';
        resetDownstreamAfterImplementationReopen(next);
      } else {
        throw new EngineError('ILLEGAL_TRANSITION', `request_changes is illegal from ${current.stage}/${current.status}`);
      }
      break;
    }
    case 'implementation_complete': {
      requireState(current, 'implementation', ['active'], event);
      checkImplementation(root, current);
      next.progress.implementation = 'complete';
      if (next.workflow.review_required) {
        next.stage = 'review';
        activeProgress(next, 'review');
      } else {
        next.stage = 'verification';
        activeProgress(next, 'verification');
      }
      break;
    }
    case 'review_pass': {
      requireState(current, 'review', ['active'], event);
      checkReviewPass(root, current);
      next.progress.review = 'complete';
      next.stage = 'verification';
      activeProgress(next, 'verification');
      break;
    }
    case 'review_fail': {
      requireState(current, 'review', ['active'], event);
      checkReviewFail(root, current);
      next.stage = 'implementation';
      next.status = 'active';
      resetDownstreamAfterImplementationReopen(next);
      break;
    }
    case 'verification_complete': {
      requireState(current, 'verification', ['active'], event);
      checkVerification(root, current);
      next.progress.verification = 'complete';
      if (next.workflow.final_acceptance_required) {
        next.stage = 'final_acceptance';
        next.status = 'awaiting_acceptance';
        next.progress.final_acceptance = 'active';
        next.gate = { type: 'final_acceptance', status: 'open' };
      } else {
        next.stage = 'complete';
        next.status = 'complete';
        next.gate = null;
      }
      break;
    }
    case 'accept': {
      requireState(current, 'final_acceptance', ['awaiting_acceptance'], event);
      if (current.gate?.type !== 'final_acceptance' || current.gate.status !== 'open') throw new EngineError('ILLEGAL_TRANSITION', 'accept requires an open final-acceptance gate');
      next.progress.final_acceptance = 'complete';
      next.stage = 'complete';
      next.status = 'complete';
      next.gate = null;
      break;
    }
    default:
      throw new EngineError('INVALID_ARGUMENT', `Unknown lifecycle event: ${String(event)}`);
  }

  assertWorkflowInvariants(next);
  assertValidState(next);
  return next;
}

export function blockState(current: AidlcState, reason: string): AidlcState {
  assertValidState(current);
  if (current.status !== 'active') throw new EngineError('ILLEGAL_TRANSITION', `block is only legal from an active stage, not ${current.stage}/${current.status}`);
  const trimmed = reason.trim();
  if (!trimmed) throw new EngineError('INVALID_ARGUMENT', 'block requires a non-empty reason');
  const next = cloneState(current);
  next.status = 'blocked';
  next.blockers = [trimmed];
  assertValidState(next);
  return next;
}

export function unblockState(current: AidlcState, reason?: string, all = false): AidlcState {
  assertValidState(current);
  if (current.status !== 'blocked') throw new EngineError('ILLEGAL_TRANSITION', 'unblock requires status=blocked');
  const next = cloneState(current);
  if (all) {
    next.blockers = [];
  } else {
    const trimmed = reason?.trim();
    if (!trimmed) throw new EngineError('INVALID_ARGUMENT', 'unblock requires a blocker reason or --all');
    next.blockers = next.blockers.filter((item) => item !== trimmed);
  }
  if (next.blockers.length !== 0) {
    throw new EngineError('BLOCKERS_REMAIN', 'unblock must resolve all blockers in v0.1', next.blockers);
  }
  next.status = 'active';
  assertValidState(next);
  return next;
}

export function nextDirective(state: AidlcState): NextDirective {
  assertValidState(state);
  if (state.status === 'blocked') {
    return { stage: state.stage, status: state.status, action: 'resolve_blockers', allowed_events: ['unblock'], message: `Resolve blockers before continuing: ${state.blockers.join('; ')}` };
  }
  if (state.stage === 'requirements') return { stage: state.stage, status: state.status, action: 'write_requirements', allowed_events: ['requirements_complete', 'block'], message: `Complete ${state.artifacts.requirements}` };
  if (state.stage === 'design') return { stage: state.stage, status: state.status, action: 'write_design', allowed_events: ['design_complete', 'block'], message: `Complete ${state.artifacts.design}` };
  if (state.stage === 'plan' && state.status === 'active') return { stage: state.stage, status: state.status, action: 'write_plan', allowed_events: ['plan_complete', 'block'], message: `Complete ${state.artifacts.plan}` };
  if (state.stage === 'plan' && state.status === 'awaiting_approval') return { stage: state.stage, status: state.status, action: 'await_planning_decision', allowed_events: ['approve', 'continue', 'request_changes'], message: 'Planning gate is open. approve holds; continue approves and starts implementation.' };
  if (state.stage === 'plan' && state.status === 'approved_hold') return { stage: state.stage, status: state.status, action: 'await_continue', allowed_events: ['continue', 'request_changes'], message: 'Plan is approved and held. continue enters implementation.' };
  if (state.stage === 'implementation') return { stage: state.stage, status: state.status, action: 'implement_plan', allowed_events: ['implementation_complete', 'block'], message: 'Execute the approved/current plan and keep its Work checkboxes current.' };
  if (state.stage === 'review') return { stage: state.stage, status: state.status, action: 'perform_review', allowed_events: ['review_pass', 'review_fail', 'block'], message: `Perform independent review and record ${state.artifacts.review}` };
  if (state.stage === 'verification') return { stage: state.stage, status: state.status, action: 'verify_change', allowed_events: ['verification_complete', 'block'], message: `Verify acceptance criteria and record ${state.artifacts.verification}` };
  if (state.stage === 'final_acceptance') return { stage: state.stage, status: state.status, action: 'await_final_acceptance', allowed_events: ['accept', 'request_changes'], message: 'Final acceptance is required.' };
  return { stage: state.stage, status: state.status, action: 'complete', allowed_events: [], message: 'Workflow is complete.' };
}
