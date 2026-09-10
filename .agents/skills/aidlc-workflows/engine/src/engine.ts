import { EngineError } from './errors.js';
import { applyEvent, blockState, createInitialState, nextDirective, unblockState } from './machine.js';
import { reclassifyState, type ReclassifyInput } from './reclassify.js';
import { appendAudit, changeDirectoryExists, readState, readStateBytes, removeChangeDirectory, restoreStateBytes, writeRequestFile, writeStateAtomic } from './storage.js';
import type { AidlcState, InitInput, LifecycleEvent, NextDirective } from './types.js';

const AUDITED_EVENTS = new Set<LifecycleEvent>(['approve', 'continue', 'request_changes', 'accept']);

export class AidlcEngine {
  readonly root: string;

  constructor(root = process.cwd()) {
    this.root = root;
  }

  init(input: InitInput): AidlcState {
    const existing = readState(this.root);
    if (existing && existing.stage !== 'complete') {
      throw new EngineError('ACTIVE_CHANGE_EXISTS', `Active change already exists: ${existing.active_change}`);
    }
    if (changeDirectoryExists(this.root, input.active_change)) {
      throw new EngineError('CHANGE_EXISTS', `Change directory already exists: ${input.active_change}`);
    }

    const next = createInitialState(input);
    const previousBytes = readStateBytes(this.root);
    try {
      writeRequestFile(this.root, next, input.request);
      writeStateAtomic(this.root, next);
      appendAudit(this.root, next, 'initialize', `Original request:\n\n${input.request.trim()}\n\nRisk: ${input.risk}\nRisk rationale: ${input.risk_rationale.trim()}`);
      return next;
    } catch (error) {
      try { restoreStateBytes(this.root, previousBytes); } catch {}
      try { removeChangeDirectory(this.root, input.active_change); } catch {}
      throw error;
    }
  }

  status(): AidlcState {
    const state = readState(this.root);
    if (!state) throw new EngineError('NO_STATE', 'No AI-DLC state exists in this project');
    return state;
  }

  next(): NextDirective {
    return nextDirective(this.status());
  }

  report(event: LifecycleEvent): AidlcState {
    if (['approve', 'continue', 'request_changes'].includes(event)) {
      throw new EngineError('INVALID_ARGUMENT', `Use the dedicated ${event.replace('_', '-')} command for ${event}`);
    }
    return this.mutate(event);
  }

  approve(): AidlcState { return this.mutate('approve'); }
  continue(): AidlcState { return this.mutate('continue'); }
  requestChanges(): AidlcState { return this.mutate('request_changes'); }

  reclassify(input: ReclassifyInput): AidlcState {
    const current = this.status();
    const previousBytes = readStateBytes(this.root);
    const next = reclassifyState(current, input);
    writeStateAtomic(this.root, next);
    try {
      appendAudit(this.root, next, 'reclassify', `Risk: ${current.risk} -> ${next.risk}\nRisk rationale: ${next.risk_rationale}\nWorkflow: ${JSON.stringify(next.workflow)}`);
    } catch (error) {
      restoreStateBytes(this.root, previousBytes);
      throw new EngineError('AUDIT_WRITE_FAILED', `Lifecycle state was rolled back because audit append failed: ${(error as Error).message}`);
    }
    return next;
  }

  block(reason: string): AidlcState {
    const current = this.status();
    const next = blockState(current, reason);
    writeStateAtomic(this.root, next);
    return next;
  }

  unblock(reason?: string, all = false): AidlcState {
    const current = this.status();
    const next = unblockState(current, reason, all);
    writeStateAtomic(this.root, next);
    return next;
  }

  private mutate(event: LifecycleEvent): AidlcState {
    const current = this.status();
    const previousBytes = readStateBytes(this.root);
    const next = applyEvent(this.root, current, event);
    writeStateAtomic(this.root, next);
    if (AUDITED_EVENTS.has(event)) {
      try {
        appendAudit(this.root, next, event, auditDetail(event, current, next));
      } catch (error) {
        restoreStateBytes(this.root, previousBytes);
        throw new EngineError('AUDIT_WRITE_FAILED', `Lifecycle state was rolled back because audit append failed: ${(error as Error).message}`);
      }
    }
    return next;
  }
}

function auditDetail(event: LifecycleEvent, before: AidlcState, after: AidlcState): string {
  switch (event) {
    case 'approve': return 'Planning gate approved with hold. Implementation was not authorized.';
    case 'continue': return 'Planning gate satisfied. Implementation authorized.';
    case 'request_changes': return `Changes requested at ${before.stage}; workflow returned to ${after.stage}.`;
    case 'accept': return 'Final implementation and verification evidence accepted.';
    default: return `${before.stage}/${before.status} -> ${after.stage}/${after.status}`;
  }
}
