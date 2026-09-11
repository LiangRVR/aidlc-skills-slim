import { doctor as runDoctor } from './doctor.js';
import { EngineError } from './errors.js';
import { withWorkflowLock } from './lock.js';
import { applyEvent, blockState, cancelState, createInitialState, nextDirective, unblockState } from './machine.js';
import { migrateV1ToV2, schemaVersionOf } from './migration.js';
import { reclassifyState } from './reclassify.js';
import { changeDirectoryExists, nextAuditContent, parseJson, readState, readStateBytes, requestContent, serializeState, STATE_RELATIVE_PATH } from './storage.js';
import { commitTransaction, ensureNoPendingTransaction, pendingTransactionExists } from './transaction.js';
import { assertValidState } from './validation.js';
import { ENGINE_VERSION } from './types.js';
const AUDITED_EVENTS = new Set(['approve', 'continue', 'request_changes', 'accept']);
export class AidlcEngine {
    root;
    constructor(root = process.cwd()) { this.root = root; }
    init(input) {
        return withWorkflowLock(this.root, 'init', () => {
            ensureNoPendingTransaction(this.root);
            const raw = readStateBytes(this.root);
            let existing = null;
            if (raw !== null) {
                const parsed = parseJson(raw, STATE_RELATIVE_PATH);
                if (schemaVersionOf(parsed) === 1)
                    throw new EngineError('STATE_MIGRATION_REQUIRED', 'Existing schema v1 state must be migrated before initialization');
                assertValidState(parsed);
                existing = parsed;
            }
            if (existing && !['complete', 'cancelled'].includes(existing.stage))
                throw new EngineError('ACTIVE_CHANGE_EXISTS', `Active change already exists: ${existing.active_change}`);
            if (changeDirectoryExists(this.root, input.active_change))
                throw new EngineError('CHANGE_EXISTS', `Change directory already exists: ${input.active_change}`);
            const next = createInitialState(input, existing ? existing.revision + 1 : 1);
            const audit = nextAuditContent(this.root, next, 'initialize', `Original request:\n\n${input.request.trim()}\n\nRisk: ${input.risk}\nRisk rationale: ${input.risk_rationale.trim()}`);
            commitTransaction(this.root, 'initialize', [
                { path: next.artifacts.request, after: requestContent(input.request) },
                { path: STATE_RELATIVE_PATH, after: serializeState(next) },
                { path: audit.path, after: audit.content },
            ]);
            return next;
        });
    }
    status() {
        if (pendingTransactionExists(this.root))
            throw new EngineError('RECOVERY_REQUIRED', 'Pending workflow transaction exists; run doctor --repair');
        const state = readState(this.root);
        if (!state)
            throw new EngineError('NO_STATE', 'No AI-DLC state exists in this project');
        return state;
    }
    next() { return nextDirective(this.status()); }
    doctor(repair = false) { return runDoctor(this.root, repair); }
    migrate() {
        return withWorkflowLock(this.root, 'migrate', () => {
            ensureNoPendingTransaction(this.root);
            const raw = readStateBytes(this.root);
            if (raw === null)
                throw new EngineError('NO_STATE', 'No AI-DLC state exists in this project');
            const parsed = parseJson(raw, STATE_RELATIVE_PATH);
            if (schemaVersionOf(parsed) === 2) {
                assertValidState(parsed);
                return parsed;
            }
            const next = migrateV1ToV2(parsed);
            const audit = next.active_change ? nextAuditContent(this.root, next, 'migrate', `State schema migrated from v1 to v2 by engine ${ENGINE_VERSION}.`) : null;
            const mutations = [{ path: STATE_RELATIVE_PATH, after: serializeState(next) }];
            if (audit)
                mutations.push({ path: audit.path, after: audit.content });
            commitTransaction(this.root, 'migrate', mutations);
            return next;
        });
    }
    report(event) {
        if (['approve', 'continue', 'request_changes'].includes(event))
            throw new EngineError('INVALID_ARGUMENT', `Use the dedicated ${event.replace('_', '-')} command for ${event}`);
        return this.mutate(event);
    }
    approve() { return this.mutate('approve'); }
    continue() { return this.mutate('continue'); }
    requestChanges() { return this.mutate('request_changes'); }
    reclassify(input) {
        return withWorkflowLock(this.root, 'reclassify', () => {
            ensureNoPendingTransaction(this.root);
            const current = this.readCurrentUnlocked();
            const next = this.bump(reclassifyState(current, input), current);
            const audit = nextAuditContent(this.root, next, 'reclassify', `Risk: ${current.risk} -> ${next.risk}\nRisk rationale: ${next.risk_rationale}\nWorkflow: ${JSON.stringify(next.workflow)}`);
            commitTransaction(this.root, 'reclassify', [
                { path: STATE_RELATIVE_PATH, after: serializeState(next) },
                { path: audit.path, after: audit.content },
            ]);
            return next;
        });
    }
    block(reason) {
        return withWorkflowLock(this.root, 'block', () => {
            ensureNoPendingTransaction(this.root);
            const current = this.readCurrentUnlocked();
            const next = this.bump(blockState(current, reason), current);
            commitTransaction(this.root, 'block', [{ path: STATE_RELATIVE_PATH, after: serializeState(next) }]);
            return next;
        });
    }
    unblock(reason, all = false) {
        return withWorkflowLock(this.root, 'unblock', () => {
            ensureNoPendingTransaction(this.root);
            const current = this.readCurrentUnlocked();
            const next = this.bump(unblockState(current, reason, all), current);
            commitTransaction(this.root, 'unblock', [{ path: STATE_RELATIVE_PATH, after: serializeState(next) }]);
            return next;
        });
    }
    cancel(reason) {
        return withWorkflowLock(this.root, 'cancel', () => {
            ensureNoPendingTransaction(this.root);
            const current = this.readCurrentUnlocked();
            const next = this.bump(cancelState(current, reason), current);
            const audit = nextAuditContent(this.root, next, 'cancel', `Workflow cancelled.\n\nReason: ${reason.trim()}`);
            commitTransaction(this.root, 'cancel', [
                { path: STATE_RELATIVE_PATH, after: serializeState(next) },
                { path: audit.path, after: audit.content },
            ]);
            return next;
        });
    }
    mutate(event) {
        return withWorkflowLock(this.root, event, () => {
            ensureNoPendingTransaction(this.root);
            const current = this.readCurrentUnlocked();
            const next = this.bump(applyEvent(this.root, current, event), current);
            const mutations = [{ path: STATE_RELATIVE_PATH, after: serializeState(next) }];
            if (AUDITED_EVENTS.has(event)) {
                const audit = nextAuditContent(this.root, next, event, auditDetail(event, current, next));
                mutations.push({ path: audit.path, after: audit.content });
            }
            commitTransaction(this.root, event, mutations);
            return next;
        });
    }
    readCurrentUnlocked() {
        const state = readState(this.root);
        if (!state)
            throw new EngineError('NO_STATE', 'No AI-DLC state exists in this project');
        return state;
    }
    bump(next, current) {
        next.schema_version = 2;
        next.engine_version = ENGINE_VERSION;
        next.revision = current.revision + 1;
        assertValidState(next);
        return next;
    }
}
function auditDetail(event, before, after) {
    switch (event) {
        case 'approve': return 'Planning gate approved with hold. Implementation was not authorized.';
        case 'continue': return 'Planning gate satisfied. Implementation authorized.';
        case 'request_changes': return `Changes requested at ${before.stage}; workflow returned to ${after.stage}.`;
        case 'accept': return 'Final implementation and verification evidence accepted.';
        default: return `${before.stage}/${before.status} -> ${after.stage}/${after.status}`;
    }
}
