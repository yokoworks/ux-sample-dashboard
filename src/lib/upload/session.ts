import type { SavedSchedule } from '../../domain/schedule.ts';
import { getCoverageWarnings } from '../../domain/coverage.ts';
import {
  canUseSchedule,
  needsReload,
  type UploadSnapshot,
} from '../../domain/upload.ts';
import { readCsvFile, type CsvFile } from '../csv/read-file.ts';
import { importScheduleCsv } from '../csv/import-schedule.ts';
import {
  createMockGateway,
  type DemoScenario,
  type ScheduleGateway,
} from '../mock/schedule-gateway.ts';

type SessionOptions = {
  gateway?: ScheduleGateway;
  scenario?: DemoScenario;
  pause?: (milliseconds: number) => Promise<void>;
};

/** Observable state keeps transport and recovery transitions testable without mounting React. */
export function createUploadSession(
  initial: SavedSchedule,
  options: SessionOptions = {},
) {
  const gateway =
    options.gateway ?? createMockGateway(initial, options.scenario);
  const pause =
    options.pause ??
    ((milliseconds) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  let snapshot: UploadSnapshot =
    options.scenario === 'load-error'
      ? {
          schedule: null,
          revision: null,
          result: { kind: 'load-error', recovery: false },
          coverageVisible: false,
        }
      : {
          schedule: structuredClone(initial),
          revision: 0,
          result: { kind: 'ready' },
          coverageVisible: false,
        };
  const initialSnapshot = snapshot;
  const listeners = new Set<() => void>();
  function update(next: UploadSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initialSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async upload(file: CsvFile) {
      if (
        !canUseSchedule(snapshot) ||
        !snapshot.schedule ||
        snapshot.revision === null
      )
        return;
      const loaded = snapshot.schedule;
      const expectedRevision = snapshot.revision;
      update({
        ...snapshot,
        result: { kind: 'checking', filename: file.name },
      });
      const read = await readCsvFile(file);
      await pause(200);
      if (read.kind === 'blocking') {
        update({ ...snapshot, result: read });
        return;
      }
      const validation = importScheduleCsv(read.text, loaded);
      if (validation.kind !== 'valid') {
        update({ ...snapshot, result: validation });
        return;
      }
      update({
        ...snapshot,
        result: { kind: 'applying', filename: file.name },
      });
      await pause(400);
      let result;
      try {
        result = await gateway.apply(
          {
            date: validation.candidate.date,
            rows: validation.candidate.rows.map((row, index) => ({
              ...row,
              row: index + 2,
            })),
          },
          expectedRevision,
        );
      } catch {
        // A missing response cannot establish whether the server committed. Never resubmit here.
        update({ ...snapshot, result: { kind: 'unknown' } });
        return;
      }
      if (result.kind !== 'committed') {
        update({ ...snapshot, result });
        return;
      }
      update({
        schedule: result.schedule,
        revision: result.revision,
        coverageVisible: true,
        result: {
          kind: 'applied',
          warnings: getCoverageWarnings(result.schedule),
        },
      });
    },
    async reload() {
      if (!needsReload(snapshot.result) || snapshot.result.kind === 'reloading')
        return;
      const recovery =
        snapshot.result.kind === 'load-error' ? snapshot.result.recovery : true;
      update({ ...snapshot, result: { kind: 'reloading', recovery } });
      await pause(400);
      try {
        const loaded = await gateway.load();
        update({
          ...loaded,
          coverageVisible: loaded.revision > 0,
          result: recovery ? { kind: 'reloaded' } : { kind: 'ready' },
        });
      } catch {
        update({
          schedule: null,
          revision: null,
          coverageVisible: false,
          result: { kind: 'load-error', recovery },
        });
      }
    },
  };
}
