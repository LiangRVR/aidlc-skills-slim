import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { EngineError } from './errors.js';
import { assertExistingPathContained, checkExistingArtifactPath, MAX_ARTIFACT_BYTES } from './storage.js';

export function sha256Bytes(value: any): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function sha256Text(value: string): string {
  return sha256Bytes(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonicalize(child)]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function canonicalDigest(value: unknown): string {
  return sha256Text(canonicalJson(value));
}

function readArtifact(root: string, relativePath: string | null, label: string): Buffer {
  if (!relativePath) throw new EngineError('FRESHNESS_UNAVAILABLE', `${label} artifact path is missing`);
  checkExistingArtifactPath(root, relativePath);
  const file = assertExistingPathContained(root, relativePath);
  const stats = statSync(file);
  if (stats.size > MAX_ARTIFACT_BYTES) throw new EngineError('FILE_TOO_LARGE', `${relativePath} exceeds ${MAX_ARTIFACT_BYTES} bytes`);
  return readFileSync(file);
}

export function hashArtifact(root: string, relativePath: string | null, label: string): string {
  return sha256Bytes(readArtifact(root, relativePath, label));
}

/**
 * Plan checkboxes are execution-progress markers, not approved semantic content.
 * Normalizing only the checkbox mark means `- [ ] task` and `- [x] task` share a
 * fingerprint, while any change to the task text, ordering, scope, or other Plan
 * content still invalidates the approval.
 */
export function hashPlanArtifact(root: string, relativePath: string | null): string {
  const text = readArtifact(root, relativePath, 'plan').toString('utf8');
  const normalized = text.replace(/^(\s*(?:[-*+]\s+|\d+\.\s+)\[)[ xX](\]\s+)/gm, '$1 $2');
  return sha256Text(normalized);
}

export function assertDigest(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new EngineError('INVALID_STATE', `${label} must be a sha256 digest`);
  }
}
