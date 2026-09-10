import { EngineError } from './errors.js';
import { ENGINE_VERSION } from './types.js';
import { assertValidState } from './validation.js';
import type { AidlcState } from './types.js';

export function schemaVersionOf(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const version = (value as Record<string, unknown>).schema_version;
  return typeof version === 'number' && Number.isInteger(version) ? version : null;
}

export function migrateV1ToV2(value: unknown): AidlcState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EngineError('INVALID_STATE', 'Legacy state must be an object');
  const legacy = value as Record<string, unknown>;
  if (legacy.schema_version !== 1) throw new EngineError('MIGRATION_UNSUPPORTED', `Only schema version 1 can be migrated to version 2; got ${String(legacy.schema_version)}`);
  const next = {
    ...legacy,
    schema_version: 2,
    engine_version: ENGINE_VERSION,
    revision: 1,
  } as unknown;
  assertValidState(next);
  return next;
}
