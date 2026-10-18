import type { SavedSchedule } from '../../domain/schedule.ts';
import type {
  CandidateSchedule,
  ValidationResult,
} from '../../domain/upload.ts';
import { validateSchedule } from '../../domain/validate-schedule.ts';

type Rejection = Exclude<ValidationResult, { kind: 'valid' }>;
export type VersionedSchedule = Readonly<{
  schedule: SavedSchedule;
  revision: number;
}>;
export type ApplyResult =
  | ({ kind: 'committed' } & VersionedSchedule)
  | { kind: 'conflict' }
  | Rejection;
export type ScheduleStore = {
  read: () => VersionedSchedule;
  replace: (
    candidate: CandidateSchedule,
    expectedRevision: number,
  ) => ApplyResult;
};

/** A per-session mock store: no real network, database, or cross-tab persistence. */
export function createScheduleStore(initial: SavedSchedule): ScheduleStore {
  let saved = structuredClone(initial);
  let revision = 0;
  return {
    read: () => ({ schedule: structuredClone(saved), revision }),
    replace(candidate, expectedRevision) {
      if (expectedRevision !== revision) return { kind: 'conflict' };
      const checked = validateSchedule(candidate, saved);
      if (checked.kind !== 'valid') return checked;
      const rows = new Map(
        checked.candidate.rows.map((row) => [row.staffId, row.hours]),
      );
      const replacement: SavedSchedule = {
        date: saved.date,
        // Advance an illustrative clock; repeated commits always have a distinct revision.
        updatedAt: new Date(
          new Date(saved.updatedAt).getTime() + 60_000,
        ).toISOString(),
        staff: saved.staff.map((staff) => ({
          ...staff,
          hours: [...rows.get(staff.id)!],
        })),
      };
      saved = replacement;
      revision++;
      return { kind: 'committed', schedule: structuredClone(saved), revision };
    },
  };
}
