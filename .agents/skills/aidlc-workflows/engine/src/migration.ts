import { EngineError } from './errors.js';
import { emptyFreshness } from './receipts.js';
import { ENGINE_VERSION } from './types.js';
import { assertValidState } from './validation.js';
import type { AidlcState } from './types.js';

export function schemaVersionOf(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const version = (value as Record<string, unknown>).schema_version;
  return typeof version === 'number' && Number.isInteger(version) ? version : null;
}

function migrateV1ToV2Raw(value: Record<string, unknown>): Record<string, unknown> {
  return { ...value, schema_version: 2, engine_version: ENGINE_VERSION, revision: 1 };
}

export function migrateV2ToV3(value: unknown): AidlcState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EngineError('INVALID_STATE', 'Legacy state must be an object');
  const legacy = value as Record<string, unknown>;
  if (legacy.schema_version !== 2) throw new EngineError('MIGRATION_UNSUPPORTED', `Expected schema version 2; got ${String(legacy.schema_version)}`);
  const activeChange = typeof legacy.active_change === 'string' ? legacy.active_change : null;
  const next = {
    ...legacy,
    schema_version: 3,
    engine_version: ENGINE_VERSION,
    evidence_path: activeChange ? `aidlc-docs/changes/${activeChange}/evidence.json` : null,
    freshness: emptyFreshness(),
  } as unknown;
  assertValidState(next);
  return next;
}

export function migrateToCurrent(value: unknown): AidlcState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EngineError('INVALID_STATE', 'Legacy state must be an object');
  const version = schemaVersionOf(value);
  if (version === 3) { assertValidState(value); return value; }
  if (version === 2) return migrateV2ToV3(value);
  if (version === 1) return migrateV2ToV3(migrateV1ToV2Raw(value as Record<string, unknown>));
  throw new EngineError('MIGRATION_UNSUPPORTED', `Only schema versions 1 and 2 can be migrated to version 3; got ${String(version)}`);
}
