// Persisted-state versioning. Pure so it can be unit-tested without AsyncStorage.
//
// When the shape of persisted data changes:
//   1. bump STORE_VERSION,
//   2. add a step keyed by the new version that upgrades the previous version's data,
//   3. add a test that feeds a snapshot of the previous version through `migrate`.
// Steps never delete user data they don't understand; they only reshape it.

/** Persisted data as read from storage: shape unknown until migrated. */
export type Persisted = Record<string, unknown>;

export type MigrationStep = (state: Persisted) => Persisted;

export const STORE_VERSION = 1;

/** Step N upgrades data saved at version N − 1 to version N. */
export const steps: Record<number, MigrationStep> = {};

/**
 * Brings data saved at `from` up to `to`, one step at a time. Data from a newer build
 * (a downgrade) is passed through unchanged rather than guessed at.
 */
export function migrate(state: unknown, from: number, to = STORE_VERSION, table = steps): Persisted {
  let s = (state && typeof state === 'object' ? state : {}) as Persisted;
  if (from >= to) return s;
  for (let v = from + 1; v <= to; v++) {
    const step = table[v];
    if (!step) throw new Error(`No store migration to version ${v}`);
    s = step(s);
  }
  return s;
}

/**
 * Combines migrated data with the store's fresh state. Settings merge key by key so a setting
 * added in a later build gets its default instead of `undefined`.
 */
export function mergePersisted<S extends { settings: object }>(persisted: unknown, current: S): S {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<S>;
  return {
    ...current,
    ...p,
    settings: { ...current.settings, ...(p.settings && typeof p.settings === 'object' ? p.settings : {}) },
  };
}
