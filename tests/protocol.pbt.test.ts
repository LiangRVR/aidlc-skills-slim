import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../shared/protocol';
import { applicableMutators, arbMessage } from './generators';

describe('protocol property-based tests', () => {
  it('P1 round-trip: deserialize(serialize(m)) deep-equals m for all valid messages', () => {
    fc.assert(
      fc.property(arbMessage, (m) => {
        expect(deserialize(serialize(m))).toEqual(m);
      })
    );
  });

  it('P2 never-throws: deserialize returns null or a valid message for any input', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.anything().map((v) => JSON.stringify(v))),
        (raw) => {
          let result: unknown;
          expect(() => {
            result = deserialize(raw);
          }).not.toThrow();
          if (result !== null) {
            expect(typeof (result as { type: unknown }).type).toBe('string');
          }
        }
      )
    );
  });

  it('P3 rejection oracle: any single-rule mutation is rejected; unmutated control passes', () => {
    fc.assert(
      fc.property(arbMessage, (m) => {
        const envelope = JSON.parse(serialize(m)) as Record<string, unknown>;
        expect(deserialize(JSON.stringify(envelope))).not.toBeNull();
        for (const mutate of applicableMutators(envelope)) {
          const mutated = mutate(envelope);
          expect(mutated).not.toBeNull();
          expect(deserialize(JSON.stringify(mutated))).toBeNull();
        }
      })
    );
  });
});
