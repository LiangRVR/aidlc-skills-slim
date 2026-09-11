import { doctor as runDoctor } from './doctor.js';
import { EngineError } from './errors.js';
import { withWorkflowLock } from './lock.js';
import { applyEvent, blockState, cancelState, createInitialState, nextDirective, unblockState } from './machine.js';
import { migrateToCurrent, schemaVersionOf } from './migration.js';
import { reclassifyState } from './reclassify.js';
import { changeDirectoryExists, nextAuditContent, parseJson, readState, readStateBytes, readTextIfExists, requestContent, serializeState, STATE_RELATIVE_PATH } from './storage.js';
import { commitTransaction, ensureNoPendingTransaction, pendingTransactionExists } from './transaction.js';
import { assertValidState } from './validation.js';
import { ENGINE_VERSION } from './types.js';
import { appendCheckReceipt, createEvidenceDocument, readEvidence, selectedEvidenceDigest, serializeEvidence, updateSourceEvidence } from './evidence.js';
import { checksConfigDigest, executeCheck, readChecksConfig, selectVerificationReceipts } from './checks.js';
import { inspectFreshness, refreshStaleState } from './freshness.js';
import { buildDesignReceipt, buildFinalAcceptanceReceipt, buildImplementationReceipt, buildPlanningApprovalReceipt, buildPlanReceipt, buildRequirementsReceipt, buildReviewReceipt, buildVerificationReceipt } from './receipts.js';
import { captureSourceSnapshot } from './source.js';
import { checkVerification } from './predicates.js';
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
                if (schemaVersionOf(parsed) !== 3)
                    throw new EngineError('STATE_MIGRATION_REQUIRED', 'Existing state must be migrated to schema v3 before initialization');
                assertValidState(parsed);
                existing = parsed;
            }
            if (existing && !['complete', 'cancelled'].includes(existing.stage))
                throw new EngineError('ACTIVE_CHANGE_EXISTS', `Active change already exists: ${existing.active_change}`);
            if (changeDirectoryExists(this.root, input.active_change))
                throw new EngineError('CHANGE_EXISTS', `Change directory already exists: ${input.active_change}`);
            const next = createInitialState(input, existing ? existing.revision + 1 : 1);
            const evidence = createEvidenceDocument(this.root, input.active_change);
            const audit = nextAuditContent(this.root, next, 'initialize', `Original request:\n\n${input.request.trim()}\n\nRisk: ${input.risk}\nRisk rationale: ${input.risk_rationale.trim()}\nSource baseline: ${evidence.source.baseline?.digest ?? `unavailable (${evidence.source.unavailable_reason})`}`);
            commitTransaction(this.root, 'initialize', [
                { path: next.artifacts.request, after: requestContent(input.request) },
                { path: next.evidence_path, after: serializeEvidence(evidence) },
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
    freshness() {
        const state = this.status();
        if (state.stage === 'cancelled')
            return [];
        return inspectFreshness(this.root, state, readEvidence(this.root, state));
    }
    next() {
        const state = this.status();
        const base = nextDirective(state);
        if (state.status === 'blocked' || state.stage === 'cancelled')
            return base;
        const issues = inspectFreshness(this.root, state, readEvidence(this.root, state));
        if (!issues.length)
            return base;
        return {
            stage: state.stage,
            status: state.status,
            revision: state.revision,
            action: 'reconcile_freshness',
            allowed_events: ['refresh', 'cancel'],
            message: `Workflow evidence is stale. Run refresh before continuing. Earliest stale dependency: ${issues[0].dependency}.`,
            freshness_issues: issues,
        };
    }
    doctor(repair = false) { return runDoctor(this.root, repair); }
    migrate() {
        return withWorkflowLock(this.root, 'migrate', () => {
            ensureNoPendingTransaction(this.root);
            const raw = readStateBytes(this.root);
            if (raw === null)
                throw new EngineError('NO_STATE', 'No AI-DLC state exists in this project');
            const parsed = parseJson(raw, STATE_RELATIVE_PATH);
            if (schemaVersionOf(parsed) === 3) {
                assertValidState(parsed);
                return parsed;
            }
            const next = migrateToCurrent(parsed);
            const evidence = next.active_change ? createEvidenceDocument(this.root, next.active_change) : null;
            const audit = next.active_change ? nextAuditContent(this.root, next, 'migrate', `State schema migrated to v3 by engine ${ENGINE_VERSION}. Existing completion/approval claims receive no invented freshness receipts and must be refreshed if stale.`) : null;
            const mutations = [{ path: STATE_RELATIVE_PATH, after: serializeState(next) }];
            if (evidence && next.evidence_path && readTextIfExists(this.root, next.evidence_path) === null)
                mutations.push({ path: next.evidence_path, after: serializeEvidence(evidence) });
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
    refresh() {
        return withWorkflowLock(this.root, 'refresh', () => {
            ensureNoPendingTransaction(this.root);
            const current = this.readCurrentUnlocked();
            const evidence = readEvidence(this.root, current);
            const issues = inspectFreshness(this.root, current, evidence);
            const next = this.bump(refreshStaleState(current, issues), current);
            const audit = nextAuditContent(this.root, next, 'freshness-refresh', `Invalidated stale workflow evidence and reopened ${next.stage}.\n\n${issues.map((issue) => `- ${issue.dependency}: ${issue.message}`).join('\n')}`);
            commitTransaction(this.root, 'freshness-refresh', [
                { path: STATE_RELATIVE_PATH, after: serializeState(next) },
                { path: audit.path, after: audit.content },
            ]);
            return next;
        });
    }
    check(name) {
        return withWorkflowLock(this.root, `check:${name}`, () => {
            ensureNoPendingTransaction(this.root);
            const current = this.readCurrentUnlocked();
            if (current.stage !== 'verification' || current.status !== 'active')
                throw new EngineError('ILLEGAL_TRANSITION', 'Executable checks run only during active Verification');
            const evidence = readEvidence(this.root, current);
            this.assertFresh(current, evidence);
            const config = readChecksConfig(this.root);
            const receipt = executeCheck(this.root, name, config);
            const updatedEvidence = appendCheckReceipt(evidence, receipt);
            const next = this.bump(JSON.parse(JSON.stringify(current)), current);
            commitTransaction(this.root, `check:${name}`, [
                { path: current.evidence_path, after: serializeEvidence(updatedEvidence) },
                { path: STATE_RELATIVE_PATH, after: serializeState(next) },
            ]);
            return receipt;
        });
    }
    reclassify(input) {
        return withWorkflowLock(this.root, 'reclassify', () => {
            ensureNoPendingTransaction(this.root);
            const current = this.readCurrentUnlocked();
            const evidence = readEvidence(this.root, current);
            this.assertFresh(current, evidence);
            const changed = reclassifyState(current, input);
            changed.freshness.plan = null;
            changed.freshness.planning_approval = null;
            changed.freshness.implementation = null;
            changed.freshness.review = null;
            changed.freshness.verification = null;
            changed.freshness.final_acceptance = null;
            if (changed.progress.design !== 'complete')
                changed.freshness.design = null;
            const next = this.bump(changed, current);
            const audit = nextAuditContent(this.root, next, 'reclassify', `Risk: ${current.risk} -> ${next.risk}\nRisk rationale: ${next.risk_rationale}\nWorkflow: ${JSON.stringify(next.workflow)}\nDownstream freshness receipts invalidated.`);
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
            let evidence = readEvidence(this.root, current);
            this.assertFresh(current, evidence);
            const next = applyEvent(this.root, current, event);
            const at = new Date().toISOString();
            switch (event) {
                case 'requirements_complete':
                    next.freshness.requirements = buildRequirementsReceipt(this.root, current, at);
                    next.freshness.design = null;
                    next.freshness.plan = null;
                    next.freshness.planning_approval = null;
                    next.freshness.implementation = null;
                    next.freshness.review = null;
                    next.freshness.verification = null;
                    next.freshness.final_acceptance = null;
                    break;
                case 'design_complete':
                    next.freshness.design = buildDesignReceipt(this.root, current, at);
                    next.freshness.plan = null;
                    next.freshness.planning_approval = null;
                    next.freshness.implementation = null;
                    next.freshness.review = null;
                    next.freshness.verification = null;
                    next.freshness.final_acceptance = null;
                    break;
                case 'plan_complete':
                    next.freshness.plan = buildPlanReceipt(this.root, current, at);
                    next.freshness.planning_approval = null;
                    next.freshness.implementation = null;
                    next.freshness.review = null;
                    next.freshness.verification = null;
                    next.freshness.final_acceptance = null;
                    break;
                case 'approve': {
                    const plan = this.requirePlanReceipt(current);
                    next.freshness.planning_approval = buildPlanningApprovalReceipt(plan, current.freshness.planning_approval, false, at);
                    break;
                }
                case 'continue': {
                    const plan = this.requirePlanReceipt(current);
                    const approval = current.freshness.planning_approval;
                    if (approval && approval.plan_bundle_sha256 !== plan.bundle_sha256)
                        throw new EngineError('STALE_APPROVAL', 'Planning approval does not match the current Plan fingerprint');
                    next.freshness.planning_approval = buildPlanningApprovalReceipt(plan, approval, true, at);
                    break;
                }
                case 'request_changes':
                    if (current.stage === 'plan') {
                        next.freshness.plan = null;
                        next.freshness.planning_approval = null;
                        next.freshness.implementation = null;
                        next.freshness.review = null;
                        next.freshness.verification = null;
                        next.freshness.final_acceptance = null;
                    }
                    else {
                        next.freshness.implementation = null;
                        next.freshness.review = null;
                        next.freshness.verification = null;
                        next.freshness.final_acceptance = null;
                    }
                    break;
                case 'implementation_complete': {
                    const plan = this.requirePlanReceipt(current);
                    if (current.workflow.planning_gate_required) {
                        const approval = current.freshness.planning_approval;
                        if (!approval || approval.plan_bundle_sha256 !== plan.bundle_sha256 || !approval.continued_at)
                            throw new EngineError('STALE_APPROVAL', 'Implementation requires a current, continued planning approval receipt');
                    }
                    const source = captureSourceSnapshot(this.root);
                    evidence = updateSourceEvidence(this.root, evidence, source);
                    const manifestDigest = evidence.source.manifest_digest;
                    if (!manifestDigest)
                        throw new EngineError('SOURCE_SNAPSHOT_UNAVAILABLE', 'Source manifest digest was not produced');
                    next.freshness.implementation = buildImplementationReceipt(plan, source.digest, manifestDigest, at);
                    next.freshness.review = null;
                    next.freshness.verification = null;
                    next.freshness.final_acceptance = null;
                    break;
                }
                case 'review_pass': {
                    const implementation = current.freshness.implementation;
                    if (!implementation)
                        throw new EngineError('STALE_EVIDENCE', 'Review requires an Implementation source receipt');
                    next.freshness.review = buildReviewReceipt(this.root, current, implementation.source_digest, at);
                    next.freshness.verification = null;
                    next.freshness.final_acceptance = null;
                    break;
                }
                case 'review_fail':
                    next.freshness.implementation = null;
                    next.freshness.review = null;
                    next.freshness.verification = null;
                    next.freshness.final_acceptance = null;
                    break;
                case 'verification_complete': {
                    const implementation = current.freshness.implementation;
                    if (!implementation)
                        throw new EngineError('STALE_EVIDENCE', 'Verification requires an Implementation source receipt');
                    const outcome = checkVerification(this.root, current);
                    const config = readChecksConfig(this.root);
                    const selected = selectVerificationReceipts(evidence, config, implementation.source_digest);
                    if (selected.missingRequired.length)
                        throw new EngineError('VERIFICATION_EVIDENCE_MISSING', 'Required executable checks do not have current passing receipts', selected.missingRequired);
                    const evidenceDigest = selectedEvidenceDigest(evidence, selected.ids);
                    next.freshness.verification = buildVerificationReceipt(this.root, current, implementation.source_digest, checksConfigDigest(this.root), evidenceDigest, selected.ids, outcome, at);
                    next.freshness.final_acceptance = null;
                    break;
                }
                case 'accept': {
                    const verification = current.freshness.verification;
                    if (!verification)
                        throw new EngineError('STALE_EVIDENCE', 'Final Acceptance requires a current Verification receipt');
                    next.freshness.final_acceptance = buildFinalAcceptanceReceipt(verification, at);
                    break;
                }
            }
            const bumped = this.bump(next, current);
            const mutations = [{ path: STATE_RELATIVE_PATH, after: serializeState(bumped) }];
            if (bumped.evidence_path)
                mutations.push({ path: bumped.evidence_path, after: serializeEvidence(evidence) });
            if (AUDITED_EVENTS.has(event)) {
                const audit = nextAuditContent(this.root, bumped, event, auditDetail(event, current, bumped));
                mutations.push({ path: audit.path, after: audit.content });
            }
            commitTransaction(this.root, event, mutations);
            return bumped;
        });
    }
    assertFresh(state, evidence) {
        const issues = inspectFreshness(this.root, state, evidence);
        if (issues.length)
            throw new EngineError('FRESHNESS_STALE', 'Workflow has stale dependencies; run aidlc-engine refresh before continuing', issues.map((issue) => `${issue.dependency}: ${issue.message}`));
    }
    requirePlanReceipt(state) {
        if (!state.freshness.plan)
            throw new EngineError('STALE_EVIDENCE', 'Current Plan has no completion fingerprint; run refresh and complete Plan again');
        return state.freshness.plan;
    }
    readCurrentUnlocked() {
        const state = readState(this.root);
        if (!state)
            throw new EngineError('NO_STATE', 'No AI-DLC state exists in this project');
        return state;
    }
    bump(next, current) {
        next.schema_version = 3;
        next.engine_version = ENGINE_VERSION;
        next.revision = current.revision + 1;
        assertValidState(next);
        return next;
    }
}
function auditDetail(event, before, after) {
    switch (event) {
        case 'approve': return `Planning gate approved with hold and bound to Plan ${after.freshness.planning_approval?.plan_bundle_sha256}. Implementation was not authorized.`;
        case 'continue': return `Planning gate satisfied and bound to Plan ${after.freshness.planning_approval?.plan_bundle_sha256}. Implementation authorized.`;
        case 'request_changes': return `Changes requested at ${before.stage}; workflow returned to ${after.stage} and downstream freshness receipts were invalidated.`;
        case 'accept': return `Final implementation accepted for source ${after.freshness.final_acceptance?.source_digest} and Verification evidence ${after.freshness.final_acceptance?.verification_evidence_digest}.`;
        default: return `${before.stage}/${before.status} -> ${after.stage}/${after.status}`;
    }
}
