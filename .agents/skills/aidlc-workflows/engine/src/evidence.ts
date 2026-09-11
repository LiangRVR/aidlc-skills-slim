import { EngineError } from './errors.js';
import { assertDigest, canonicalDigest } from './hashing.js';
import { buildSourceManifest, tryCaptureSourceSnapshot } from './source.js';
import { parseJson, readTextIfExists } from './storage.js';
import type { AidlcState, CheckReceipt, EvidenceDocument, SourceManifestEntry, SourceSnapshot } from './types.js';

export const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;
export const MAX_CHECK_RECEIPTS = 1_000;

export function evidenceRelativePath(change: string): string {
  return `aidlc-docs/changes/${change}/evidence.json`;
}

export function createEvidenceDocument(root: string, change: string): EvidenceDocument {
  const initial = tryCaptureSourceSnapshot(root);
  return {
    evidence_version: 1,
    active_change: change,
    source: {
      baseline: initial.snapshot,
      latest: initial.snapshot,
      manifest: [],
      manifest_digest: initial.snapshot ? canonicalDigest([]) : null,
      unavailable_reason: initial.reason,
    },
    checks: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertSourceSnapshot(value: unknown, label: string): asserts value is SourceSnapshot {
  if (!isObject(value) || value.snapshot_version !== 1 || value.mode !== 'git' || typeof value.captured_at !== 'string' || typeof value.base_tree !== 'string' || !Array.isArray(value.records)) {
    throw new EngineError('INVALID_EVIDENCE', `${label} is malformed`);
  }
  assertDigest(value.digest, `${label}.digest`);
  for (const record of value.records) {
    if (!isObject(record) || typeof record.status !== 'string' || typeof record.path !== 'string' || !(record.previous_path === null || typeof record.previous_path === 'string') || !(record.sha256 === null || typeof record.sha256 === 'string')) {
      throw new EngineError('INVALID_EVIDENCE', `${label}.records contains a malformed entry`);
    }
    if (record.sha256 !== null) assertDigest(record.sha256, `${label}.records.sha256`);
  }
}

function assertManifest(value: unknown): asserts value is SourceManifestEntry[] {
  if (!Array.isArray(value)) throw new EngineError('INVALID_EVIDENCE', 'source.manifest must be an array');
  for (const entry of value) {
    if (!isObject(entry) || !['added', 'modified', 'deleted', 'renamed', 'changed'].includes(String(entry.status)) || typeof entry.path !== 'string' || !(entry.previous_path === null || typeof entry.previous_path === 'string') || !(entry.sha256 === null || typeof entry.sha256 === 'string')) {
      throw new EngineError('INVALID_EVIDENCE', 'source.manifest contains a malformed entry');
    }
    if (entry.sha256 !== null) assertDigest(entry.sha256, 'source.manifest.sha256');
  }
}

function assertCheckReceipt(value: unknown): asserts value is CheckReceipt {
  if (!isObject(value) || typeof value.receipt_id !== 'string' || typeof value.name !== 'string' || !Array.isArray(value.command) || value.command.some((part) => typeof part !== 'string') || typeof value.cwd !== 'string' || typeof value.started_at !== 'string' || typeof value.duration_ms !== 'number' || !(value.exit_code === null || Number.isInteger(value.exit_code)) || typeof value.timed_out !== 'boolean' || !['PASS', 'FAIL', 'STALE'].includes(String(value.result)) || typeof value.stdout_bytes !== 'number' || typeof value.stderr_bytes !== 'number') {
    throw new EngineError('INVALID_EVIDENCE', 'checks contains a malformed receipt');
  }
  for (const key of ['source_digest_before', 'source_digest_after', 'stdout_sha256', 'stderr_sha256']) assertDigest(value[key], `check.${key}`);
}

export function assertValidEvidence(value: unknown, expectedChange?: string): asserts value is EvidenceDocument {
  if (!isObject(value) || value.evidence_version !== 1 || typeof value.active_change !== 'string' || !isObject(value.source) || !Array.isArray(value.checks)) {
    throw new EngineError('INVALID_EVIDENCE', 'Evidence document is malformed');
  }
  if (expectedChange && value.active_change !== expectedChange) throw new EngineError('INVALID_EVIDENCE', `Evidence belongs to ${value.active_change}, expected ${expectedChange}`);
  if (value.source.baseline !== null) assertSourceSnapshot(value.source.baseline, 'source.baseline');
  if (value.source.latest !== null) assertSourceSnapshot(value.source.latest, 'source.latest');
  assertManifest(value.source.manifest);
  if (!(value.source.manifest_digest === null || typeof value.source.manifest_digest === 'string')) throw new EngineError('INVALID_EVIDENCE', 'source.manifest_digest must be digest or null');
  if (value.source.manifest_digest !== null) assertDigest(value.source.manifest_digest, 'source.manifest_digest');
  if (!(value.source.unavailable_reason === null || typeof value.source.unavailable_reason === 'string')) throw new EngineError('INVALID_EVIDENCE', 'source.unavailable_reason must be string or null');
  if (value.checks.length > MAX_CHECK_RECEIPTS) throw new EngineError('EVIDENCE_LIMIT_EXCEEDED', `Evidence contains more than ${MAX_CHECK_RECEIPTS} check receipts`);
  for (const receipt of value.checks) assertCheckReceipt(receipt);
}

export function serializeEvidence(evidence: EvidenceDocument): string {
  assertValidEvidence(evidence, evidence.active_change);
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (Buffer.byteLength(serialized, 'utf8') > MAX_EVIDENCE_BYTES) throw new EngineError('EVIDENCE_LIMIT_EXCEEDED', `evidence.json exceeds ${MAX_EVIDENCE_BYTES} bytes`);
  return serialized;
}

export function readEvidence(root: string, state: AidlcState): EvidenceDocument {
  if (!state.active_change || !state.evidence_path) throw new EngineError('INVALID_STATE', 'Active workflow requires evidence_path');
  const raw = readTextIfExists(root, state.evidence_path, MAX_EVIDENCE_BYTES);
  if (raw === null) throw new EngineError('EVIDENCE_MISSING', `Evidence file is missing: ${state.evidence_path}`);
  const parsed = parseJson(raw, state.evidence_path);
  assertValidEvidence(parsed, state.active_change);
  return parsed;
}

export function updateSourceEvidence(root: string, evidence: EvidenceDocument, current: SourceSnapshot): EvidenceDocument {
  const baseline = evidence.source.baseline;
  const built = buildSourceManifest(root, baseline, current);
  return {
    ...evidence,
    source: {
      baseline,
      latest: current,
      manifest: built.manifest,
      manifest_digest: built.digest,
      unavailable_reason: null,
    },
  };
}

export function appendCheckReceipt(evidence: EvidenceDocument, receipt: CheckReceipt): EvidenceDocument {
  if (evidence.checks.some((item) => item.receipt_id === receipt.receipt_id)) throw new EngineError('INVALID_EVIDENCE', `Duplicate check receipt id: ${receipt.receipt_id}`);
  if (evidence.checks.length >= MAX_CHECK_RECEIPTS) throw new EngineError('EVIDENCE_LIMIT_EXCEEDED', `Cannot append more than ${MAX_CHECK_RECEIPTS} check receipts`);
  return { ...evidence, checks: [...evidence.checks, receipt] };
}

export function selectedEvidenceDigest(evidence: EvidenceDocument, receiptIds: string[]): string {
  const byId = new Map(evidence.checks.map((receipt) => [receipt.receipt_id, receipt]));
  const selected = [...receiptIds].sort().map((id) => {
    const receipt = byId.get(id);
    if (!receipt) throw new EngineError('STALE_EVIDENCE', `Verification references missing check receipt ${id}`);
    return receipt;
  });
  return canonicalDigest(selected);
}
