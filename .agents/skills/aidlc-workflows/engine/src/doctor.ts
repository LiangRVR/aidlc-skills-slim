import { existsSync } from 'node:fs';
import { readChecksConfig } from './checks.js';
import { createEvidenceDocument, readEvidence, serializeEvidence } from './evidence.js';
import { inspectFreshness } from './freshness.js';
import { lockIsProvablyStale, readWorkflowLock, removeStaleOrMalformedLock, withWorkflowLock } from './lock.js';
import { migrateToCurrent, schemaVersionOf } from './migration.js';
import { checkExistingArtifactPath, changeDirectoryPath, nextAuditContent, parseJson, readStateBytes, readTextIfExists, serializeState, STATE_RELATIVE_PATH } from './storage.js';
import { commitTransaction, pendingTransactionExists, readPendingTransaction, recoverPendingTransaction } from './transaction.js';
import { ENGINE_VERSION } from './types.js';
import { assertValidState } from './validation.js';
import type { AidlcState, DoctorCheck, DoctorReport } from './types.js';

function check(name: string, status: DoctorCheck['status'], message: string): DoctorCheck { return { name, status, message }; }

function inspect(root: string, repaired: string[] = []): DoctorReport {
  const checks: DoctorCheck[] = [];
  const major = Number(process.versions.node.split('.')[0]);
  checks.push(check('runtime', major >= 20 ? 'pass' : 'fail', `Node.js ${process.versions.node}; engine requires >=20`));

  const lockInfo = readWorkflowLock(root);
  if (!lockInfo) checks.push(check('lock', 'pass', 'No workflow lock present'));
  else if (!lockInfo.lock) checks.push(check('lock', 'fail', 'Workflow lock is malformed; doctor --repair can remove it'));
  else if (lockIsProvablyStale(lockInfo.lock)) checks.push(check('lock', 'warn', `Stale lock from pid ${lockInfo.lock.pid}; doctor --repair can remove it`));
  else checks.push(check('lock', 'fail', `Active lock held by pid ${lockInfo.lock.pid} on ${lockInfo.lock.hostname} for ${lockInfo.lock.operation}`));

  if (pendingTransactionExists(root)) {
    try { const tx = readPendingTransaction(root)!; checks.push(check('transaction', 'fail', `Pending ${tx.operation} transaction ${tx.id}; doctor --repair can recover it`)); }
    catch (error) { checks.push(check('transaction', 'fail', `Pending transaction is malformed: ${(error as Error).message}`)); }
  } else checks.push(check('transaction', 'pass', 'No pending transaction'));

  const raw = readStateBytes(root);
  let state: AidlcState | undefined;
  let stateSummary: DoctorReport['state'];
  if (raw === null) checks.push(check('state', 'pass', 'No workflow state exists'));
  else {
    try {
      const parsed = parseJson(raw, STATE_RELATIVE_PATH);
      const version = schemaVersionOf(parsed);
      if (version !== 3) {
        stateSummary = { schema_version: version ?? -1 };
        checks.push(check('state', 'warn', `Schema v${String(version)} state requires migration to v3; run migrate or doctor --repair`));
      } else {
        assertValidState(parsed); state = parsed;
        stateSummary = { schema_version: state.schema_version, revision: state.revision, active_change: state.active_change, stage: state.stage, status: state.status };
        checks.push(check('state', 'pass', `Schema v${state.schema_version}, revision ${state.revision}, ${state.stage}/${state.status}`));
      }
    } catch (error) { checks.push(check('state', 'fail', (error as Error).message)); }
  }

  if (state?.active_change) {
    const dir = changeDirectoryPath(root, state.active_change);
    checks.push(check('change-directory', existsSync(dir) ? 'pass' : 'fail', existsSync(dir) ? `Change directory exists for ${state.active_change}` : `Missing change directory for ${state.active_change}`));
    const artifactFailures: string[] = [];
    for (const [name, path] of Object.entries(state.artifacts)) {
      if (!path) continue;
      try {
        checkExistingArtifactPath(root, path);
        if (name === 'request' && readTextIfExists(root, path) === null) artifactFailures.push(`${name}: missing`);
      } catch (error) { artifactFailures.push(`${name}: ${(error as Error).message}`); }
    }
    checks.push(artifactFailures.length ? check('artifact-paths', 'fail', artifactFailures.join('; ')) : check('artifact-paths', 'pass', 'Existing artifact paths are contained and within size limits'));

    try {
      const evidence = readEvidence(root, state);
      const sourceMessage = evidence.source.baseline ? `Evidence source baseline ${evidence.source.baseline.digest}` : `Evidence exists; source baseline unavailable: ${evidence.source.unavailable_reason ?? 'unknown reason'}`;
      checks.push(check('evidence', evidence.source.baseline || !['implementation', 'review', 'verification', 'final_acceptance', 'complete'].includes(state.stage) ? 'pass' : 'fail', sourceMessage));
      try {
        const issues = inspectFreshness(root, state, evidence);
        checks.push(issues.length ? check('freshness', 'fail', issues.map((issue) => `${issue.dependency}: ${issue.message}`).join('; ')) : check('freshness', 'pass', 'All completed workflow evidence is current'));
      } catch (error) { checks.push(check('freshness', 'fail', (error as Error).message)); }
    } catch (error) {
      checks.push(check('evidence', 'fail', (error as Error).message));
      checks.push(check('freshness', 'fail', 'Freshness cannot be evaluated without valid evidence'));
    }

    try {
      const config = readChecksConfig(root);
      const required = Object.entries(config.checks).filter(([, definition]) => definition.required).map(([name]) => name);
      checks.push(check('check-config', 'pass', required.length ? `Configured required checks: ${required.join(', ')}` : 'No required executable checks configured'));
    } catch (error) { checks.push(check('check-config', 'fail', (error as Error).message)); }
  }

  const ok = checks.every((item) => item.status !== 'fail');
  return { ok, engine_version: ENGINE_VERSION, repaired, checks, ...(stateSummary ? { state: stateSummary } : {}) };
}

export function doctor(root: string, repair = false): DoctorReport {
  const repaired: string[] = [];
  if (!repair) return inspect(root, repaired);

  const lockInfo = readWorkflowLock(root);
  if (lockInfo) {
    const kind = removeStaleOrMalformedLock(root);
    if (kind !== 'none') repaired.push(`removed ${kind} workflow lock`);
  }

  withWorkflowLock(root, 'doctor-repair', () => {
    if (pendingTransactionExists(root)) {
      const operation = recoverPendingTransaction(root);
      if (operation) repaired.push(`recovered pending ${operation} transaction`);
    }

    const raw = readStateBytes(root);
    if (raw === null) return;
    const parsed = parseJson(raw, STATE_RELATIVE_PATH);
    const version = schemaVersionOf(parsed);
    let state: AidlcState;
    let migrated = false;
    if (version === 3) { assertValidState(parsed); state = parsed; }
    else { state = migrateToCurrent(parsed); migrated = true; }

    const mutations: Array<{ path: string; after: string | null }> = [];
    if (migrated) {
      mutations.push({ path: STATE_RELATIVE_PATH, after: serializeState(state) });
      repaired.push(`migrated state schema v${String(version)} -> v3`);
    }
    if (state.active_change && state.evidence_path && readTextIfExists(root, state.evidence_path) === null) {
      const evidence = createEvidenceDocument(root, state.active_change);
      mutations.push({ path: state.evidence_path, after: serializeEvidence(evidence) });
      repaired.push('created missing evidence document');
    }
    if (mutations.length && state.active_change) {
      const audit = nextAuditContent(root, state, 'doctor-repair', `Engine ${ENGINE_VERSION} repaired workflow storage/migration metadata. Semantic freshness was not auto-accepted; run refresh if doctor reports stale dependencies.`);
      mutations.push({ path: audit.path, after: audit.content });
    }
    if (mutations.length) commitTransaction(root, 'doctor-repair', mutations);
  });
  return inspect(root, repaired);
}
