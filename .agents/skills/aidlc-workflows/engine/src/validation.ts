import { EngineError } from './errors.js';
import { ENGINE_VERSION } from './types.js';
import type { AidlcState, ProgressState, Risk, Stage, Status } from './types.js';

const RISKS = new Set(['low', 'standard', 'high']);
const STAGES = new Set([
  'requirements', 'design', 'plan', 'implementation', 'review', 'verification', 'final_acceptance', 'complete', 'cancelled',
]);
const STATUSES = new Set([
  'active', 'awaiting_approval', 'approved_hold', 'blocked', 'awaiting_acceptance', 'complete', 'cancelled',
]);
const PROGRESS = new Set(['pending', 'active', 'complete', 'skipped', 'not_applicable']);
const GATE_TYPES = new Set(['planning', 'final_acceptance']);
const GATE_STATUSES = new Set(['open', 'approved_hold', 'satisfied', 'rejected']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(obj: Record<string, unknown>, allowed: string[], label: string): void {
  const unknown = Object.keys(obj).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new EngineError('INVALID_STATE', `${label} contains unknown properties`, unknown);
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new EngineError('INVALID_STATE', `${label} must be boolean`);
}

function assertString(value: unknown, label: string, allowNull = false): asserts value is string | null {
  if (allowNull && value === null) return;
  if (typeof value !== 'string') throw new EngineError('INVALID_STATE', `${label} must be a string${allowNull ? ' or null' : ''}`);
}

function assertEnum(value: unknown, allowed: Set<string>, label: string): asserts value is string {
  if (typeof value !== 'string' || !allowed.has(value)) throw new EngineError('INVALID_STATE', `${label} has invalid value: ${String(value)}`);
}

function assertNonNegativeInteger(value: unknown, label: string, min = 0): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) throw new EngineError('INVALID_STATE', `${label} must be an integer >= ${min}`);
}

export function assertWorkflowInvariants(state: AidlcState): void {
  const w = state.workflow;
  if (state.risk === 'high') {
    const missing = [
      ['design_required', w.design_required],
      ['planning_gate_required', w.planning_gate_required],
      ['review_required', w.review_required],
      ['final_acceptance_required', w.final_acceptance_required],
    ].filter(([, enabled]) => !enabled).map(([name]) => String(name));
    if (missing.length) throw new EngineError('INVALID_WORKFLOW', 'High-risk workflow requires design, planning gate, review, and final acceptance', missing);
  }
  if (state.risk === 'standard' && (!w.planning_gate_required || !w.final_acceptance_required)) {
    throw new EngineError('INVALID_WORKFLOW', 'Standard-risk workflow requires a planning gate and final acceptance');
  }

  const terminal = state.stage === 'complete' || state.stage === 'cancelled';

  if (!w.design_required) {
    if (state.progress.design !== 'not_applicable') throw new EngineError('INVALID_STATE', 'Design progress must be not_applicable when design_required=false');
    if (state.artifacts.design !== null) throw new EngineError('INVALID_STATE', 'Design artifact must be null when design_required=false');
    if (state.stage === 'design') throw new EngineError('INVALID_STATE', 'Stage cannot be design when design_required=false');
  } else if (state.progress.design === 'not_applicable') {
    throw new EngineError('INVALID_STATE', 'Design progress cannot be not_applicable when design_required=true');
  }

  if (!w.review_required) {
    if (state.progress.review !== 'not_applicable') throw new EngineError('INVALID_STATE', 'Review progress must be not_applicable when review_required=false');
    if (state.artifacts.review !== null) throw new EngineError('INVALID_STATE', 'Review artifact must be null when review_required=false');
    if (state.stage === 'review') throw new EngineError('INVALID_STATE', 'Stage cannot be review when review_required=false');
  } else if (state.progress.review === 'not_applicable') {
    throw new EngineError('INVALID_STATE', 'Review progress cannot be not_applicable when review_required=true');
  }

  if (!w.final_acceptance_required) {
    if (state.progress.final_acceptance !== 'not_applicable') throw new EngineError('INVALID_STATE', 'Final acceptance progress must be not_applicable when not required');
    if (state.stage === 'final_acceptance') throw new EngineError('INVALID_STATE', 'Stage cannot be final_acceptance when not required');
  } else if (state.progress.final_acceptance === 'not_applicable') {
    throw new EngineError('INVALID_STATE', 'Final acceptance progress cannot be not_applicable when required');
  }

  if (state.status === 'blocked') {
    if (state.blockers.length === 0) throw new EngineError('INVALID_STATE', 'Blocked state requires at least one blocker');
  } else if (state.blockers.length !== 0) {
    throw new EngineError('INVALID_STATE', 'Blockers must be empty unless status=blocked');
  }

  if (state.stage === 'plan' && state.status === 'awaiting_approval') {
    if (!w.planning_gate_required || state.gate?.type !== 'planning' || state.gate.status !== 'open') {
      throw new EngineError('INVALID_STATE', 'Awaiting planning approval requires an open planning gate');
    }
  }
  if (state.stage === 'plan' && state.status === 'approved_hold') {
    if (state.gate?.type !== 'planning' || state.gate.status !== 'approved_hold') {
      throw new EngineError('INVALID_STATE', 'approved_hold requires planning gate status approved_hold');
    }
  }
  if (state.stage === 'final_acceptance') {
    if (state.status !== 'awaiting_acceptance' || state.gate?.type !== 'final_acceptance' || state.gate.status !== 'open') {
      throw new EngineError('INVALID_STATE', 'Final acceptance stage requires an open final-acceptance gate');
    }
  }

  if (state.stage === 'complete') {
    if (state.status !== 'complete') throw new EngineError('INVALID_STATE', 'Complete stage requires complete status');
    if (state.gate !== null || state.blockers.length) throw new EngineError('INVALID_STATE', 'Complete state must not have a gate or blockers');
    const requiredComplete: Array<[string, ProgressState]> = [
      ['requirements', state.progress.requirements],
      ['plan', state.progress.plan],
      ['implementation', state.progress.implementation],
      ['verification', state.progress.verification],
    ];
    for (const [name, progress] of requiredComplete) if (progress !== 'complete') throw new EngineError('INVALID_STATE', `Complete workflow requires ${name}=complete`);
    if (w.design_required && state.progress.design !== 'complete') throw new EngineError('INVALID_STATE', 'Complete workflow requires design=complete');
    if (w.review_required && state.progress.review !== 'complete') throw new EngineError('INVALID_STATE', 'Complete workflow requires review=complete');
    if (w.final_acceptance_required && state.progress.final_acceptance !== 'complete') throw new EngineError('INVALID_STATE', 'Complete workflow requires final_acceptance=complete');
  } else if (state.status === 'complete') {
    throw new EngineError('INVALID_STATE', 'status=complete is only valid at stage=complete');
  }

  if (state.stage === 'cancelled') {
    if (state.status !== 'cancelled') throw new EngineError('INVALID_STATE', 'Cancelled stage requires cancelled status');
    if (state.gate !== null || state.blockers.length) throw new EngineError('INVALID_STATE', 'Cancelled state must not have a gate or blockers');
  } else if (state.status === 'cancelled') {
    throw new EngineError('INVALID_STATE', 'status=cancelled is only valid at stage=cancelled');
  }

  if (!terminal && state.active_change === null) throw new EngineError('INVALID_STATE', 'active_change is required for an active workflow');
}

export function assertValidState(value: unknown): asserts value is AidlcState {
  if (!isObject(value)) throw new EngineError('INVALID_STATE', 'State must be a JSON object');
  exactKeys(value, ['schema_version', 'engine_version', 'revision', 'active_change', 'risk', 'risk_rationale', 'workflow', 'stage', 'status', 'gate', 'artifacts', 'progress', 'blockers'], 'state');
  if (value.schema_version !== 2) throw new EngineError('STATE_MIGRATION_REQUIRED', `Unsupported schema_version: ${String(value.schema_version)}; run aidlc-engine migrate`);
  if (typeof value.engine_version !== 'string' || !value.engine_version.trim()) throw new EngineError('INVALID_STATE', 'engine_version must be a non-empty string');
  assertNonNegativeInteger(value.revision, 'revision', 1);
  assertString(value.active_change, 'active_change', true);
  assertEnum(value.risk, RISKS, 'risk');
  assertString(value.risk_rationale, 'risk_rationale');
  assertEnum(value.stage, STAGES, 'stage');
  assertEnum(value.status, STATUSES, 'status');

  if (!isObject(value.workflow)) throw new EngineError('INVALID_STATE', 'workflow must be an object');
  exactKeys(value.workflow, ['design_required', 'planning_gate_required', 'review_required', 'final_acceptance_required', 'security_required'], 'workflow');
  for (const key of ['design_required', 'planning_gate_required', 'review_required', 'final_acceptance_required', 'security_required']) assertBoolean(value.workflow[key], `workflow.${key}`);

  if (value.gate !== null) {
    if (!isObject(value.gate)) throw new EngineError('INVALID_STATE', 'gate must be object or null');
    exactKeys(value.gate, ['type', 'status'], 'gate');
    assertEnum(value.gate.type, GATE_TYPES, 'gate.type');
    assertEnum(value.gate.status, GATE_STATUSES, 'gate.status');
  }

  if (!isObject(value.artifacts)) throw new EngineError('INVALID_STATE', 'artifacts must be an object');
  exactKeys(value.artifacts, ['request', 'requirements', 'design', 'plan', 'review', 'verification'], 'artifacts');
  for (const key of ['request', 'requirements', 'design', 'plan', 'review', 'verification']) assertString(value.artifacts[key], `artifacts.${key}`, true);

  if (!isObject(value.progress)) throw new EngineError('INVALID_STATE', 'progress must be an object');
  exactKeys(value.progress, ['requirements', 'design', 'plan', 'implementation', 'review', 'verification', 'final_acceptance'], 'progress');
  for (const key of ['requirements', 'design', 'plan', 'implementation', 'review', 'verification', 'final_acceptance']) assertEnum(value.progress[key], PROGRESS, `progress.${key}`);

  if (!Array.isArray(value.blockers) || value.blockers.some((item) => typeof item !== 'string' || !item.trim())) throw new EngineError('INVALID_STATE', 'blockers must be an array of non-empty strings');

  const state = value as unknown as AidlcState;
  assertWorkflowInvariants(state);
}

export function assertRisk(value: string): asserts value is Risk {
  if (!RISKS.has(value)) throw new EngineError('INVALID_ARGUMENT', `Invalid risk: ${value}`);
}

export function assertLifecycleStage(value: string): asserts value is Stage {
  if (!STAGES.has(value)) throw new EngineError('INVALID_ARGUMENT', `Invalid stage: ${value}`);
}

export function assertLifecycleStatus(value: string): asserts value is Status {
  if (!STATUSES.has(value)) throw new EngineError('INVALID_ARGUMENT', `Invalid status: ${value}`);
}

export function ensureCurrentEngineVersion(state: AidlcState): AidlcState {
  if (state.engine_version !== ENGINE_VERSION) {
    // Engine-version drift is informational; schema validation is authoritative.
  }
  return state;
}
