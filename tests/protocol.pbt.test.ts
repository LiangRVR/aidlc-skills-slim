import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../shared/protocol';
import { applicableMutators, arbMessage } from './generators';

const arbStructuredMalformed: fc.Arbitrary<string> = fc.oneof(
  fc
    .tuple(arbMessage, fc.constantFrom(1, 3, '2', 2.5, null))
    .map(([m, version]) => JSON.stringify({ version, type: m.type, payload: m.payload })),
  fc
    .tuple(arbMessage, fc.constantFrom('playerLost', 'gameWon', '__bad__', ''))
    .map(([m, type]) => JSON.stringify({ version: 2, type, payload: m.payload })),
  fc
    .tuple(arbMessage, fc.constantFrom(null, 42, 'x', [], {}))
    .map(([m, payload]) => JSON.stringify({ version: 2, type: m.type, payload }))
);

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
        fc.oneof(fc.string(), fc.anything().map((v) => JSON.stringify(v)), arbStructuredMalformed),
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
