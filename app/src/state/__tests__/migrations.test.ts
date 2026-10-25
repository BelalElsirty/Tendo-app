import { describe, expect, it } from 'vitest';
import { mergePersisted, migrate, STORE_VERSION, steps, type MigrationStep } from '../migrations';

describe('store migrations', () => {
  it('has a step for every version after the first', () => {
    for (let v = 2; v <= STORE_VERSION; v++) expect(steps[v], `step ${v}`).toBeTypeOf('function');
  });

  it('runs steps in order from the saved version', () => {
    const table: Record<number, MigrationStep> = {
      2: s => ({ ...s, trail: [...(s.trail as number[]), 2] }),
      3: s => ({ ...s, trail: [...(s.trail as number[]), 3] }),
    };
    expect(migrate({ trail: [1] }, 1, 3, table)).toEqual({ trail: [1, 2, 3] });
    expect(migrate({ trail: [2] }, 2, 3, table)).toEqual({ trail: [2, 3] });
  });

  it('passes data from a newer build through untouched', () => {
    const saved = { commitments: [{ id: 'a' }], future: true };
    expect(migrate(saved, 5, 3, {})).toBe(saved);
  });

  it('fails loudly when a step is missing instead of dropping data', () => {
    expect(() => migrate({}, 1, 3, { 2: s => s })).toThrow('version 3');
  });

  it('treats unreadable saved data as empty', () => {
    expect(migrate(null, 0, 0, {})).toEqual({});
  });
});

describe('merging saved data into fresh state', () => {
  const current = { stage: 'signedOut', commitments: [] as string[], settings: { theme: 'warm', tone: 'Balanced', added: 'default' } };

  it('lets saved values win', () => {
    const merged = mergePersisted({ stage: 'ready', commitments: ['a'] }, current);
    expect(merged.stage).toBe('ready');
    expect(merged.commitments).toEqual(['a']);
  });

  it('fills settings added since the data was saved', () => {
    const merged = mergePersisted({ settings: { theme: 'black', tone: 'Direct' } }, current);
    expect(merged.settings).toEqual({ theme: 'black', tone: 'Direct', added: 'default' });
  });

  it('keeps fresh state when nothing was saved', () => {
    expect(mergePersisted(undefined, current)).toEqual(current);
  });
});
