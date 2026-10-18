import type { SavedSchedule } from '../../domain/schedule.ts';
import type { CandidateSchedule } from '../../domain/upload.ts';
import {
  createScheduleStore,
  type ApplyResult,
  type VersionedSchedule,
} from './schedule-store.ts';

export const DEMO_SCENARIOS = [
  'normal',
  'conflict',
  'unknown-committed',
  'unknown-not-committed',
  'reload-failure',
  'load-error',
] as const;
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export function parseDemoScenario(value: unknown): DemoScenario {
  return DEMO_SCENARIOS.find((scenario) => scenario === value) ?? 'normal';
}

export type ScheduleGateway = {
  load: () => Promise<VersionedSchedule>;
  apply: (
    candidate: CandidateSchedule,
    expectedRevision: number,
  ) => Promise<ApplyResult>;
};

/** Deterministic transport scenarios; the screen never receives the hidden commit outcome. */
export function createMockGateway(
  initial: SavedSchedule,
  scenario: DemoScenario = 'normal',
): ScheduleGateway {
  const store = createScheduleStore(initial);
  let uploadScenarioPending = true;
  let failNextReload = false;

  function simulateAnotherEditor() {
    const current = store.read();
    // A separate editor gives David a valid midday shift before our stale request arrives.
    const external: CandidateSchedule = {
      date: current.schedule.date,
      rows: current.schedule.staff.map((staff, index) => ({
        staffId: staff.id,
        row: index + 2,
        hours:
          staff.id === 'st_004'
            ? [false, false, false, true, true, true, false, false]
            : staff.hours,
      })),
    };
    const result = store.replace(external, current.revision);
    if (result.kind !== 'committed')
      throw new Error('The competing demo schedule must be valid.');
  }

  return {
    async load() {
      if (failNextReload) {
        failNextReload = false;
        throw new Error('The simulated reload response was unavailable.');
      }
      return store.read();
    },
    async apply(candidate, expectedRevision) {
      const active = uploadScenarioPending ? scenario : 'normal';
      uploadScenarioPending = false;
      if (active === 'conflict' || active === 'reload-failure') {
        simulateAnotherEditor();
        failNextReload = active === 'reload-failure';
      }
      if (active === 'unknown-not-committed')
        throw new Error('The simulated upload response was lost.');
      const result = store.replace(candidate, expectedRevision);
      if (active === 'unknown-committed' && result.kind === 'committed') {
        throw new Error('The simulated upload response was lost.');
      }
      return result;
    },
  };
}
