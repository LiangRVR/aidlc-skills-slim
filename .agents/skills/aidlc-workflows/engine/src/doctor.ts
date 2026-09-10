import { existsSync } from 'node:fs';
import { lockIsProvablyStale, readWorkflowLock, removeStaleOrMalformedLock, withWorkflowLock } from './lock.js';
import { migrateV1ToV2, schemaVersionOf } from './migration.js';
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
  if (raw === null) {
    checks.push(check('state', 'pass', 'No workflow state exists'));
  } else {
    try {
      const parsed = parseJson(raw, STATE_RELATIVE_PATH);
      const version = schemaVersionOf(parsed);
      if (version === 1) {
        stateSummary = { schema_version: 1 };
        checks.push(check('state', 'warn', 'Schema v1 state requires migration; run migrate or doctor --repair'));
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
    if (raw !== null) {
      const parsed = parseJson(raw, STATE_RELATIVE_PATH);
      if (schemaVersionOf(parsed) === 1) {
        const migrated = migrateV1ToV2(parsed);
        const audit = migrated.active_change ? nextAuditContent(root, migrated, 'migrate', `State schema migrated from v1 to v2 by engine ${ENGINE_VERSION}.`) : null;
        const mutations = [{ path: STATE_RELATIVE_PATH, after: serializeState(migrated) }];
        if (audit) mutations.push({ path: audit.path, after: audit.content });
        commitTransaction(root, 'migrate', mutations);
        repaired.push('migrated state schema v1 -> v2');
      }
    }
  });
  return inspect(root, repaired);
}
