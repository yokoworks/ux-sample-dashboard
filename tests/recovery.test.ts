import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readySchedule } from '../src/data/ready-schedule.ts';
import {
  canUseSchedule,
  type CandidateSchedule,
} from '../src/domain/upload.ts';
import {
  describeResult,
  RELOADED_NOTICE,
} from '../src/components/schedule/result-presentation.ts';
import { exportScheduleCsv } from '../src/lib/csv/export-schedule.ts';
import { importScheduleCsv } from '../src/lib/csv/import-schedule.ts';
import {
  createMockGateway,
  parseDemoScenario,
  type DemoScenario,
  type ScheduleGateway,
} from '../src/lib/mock/schedule-gateway.ts';
import {
  createScheduleStore,
  type ApplyResult,
  type VersionedSchedule,
} from '../src/lib/mock/schedule-store.ts';
import { createUploadSession } from '../src/lib/upload/session.ts';

const pause = async () => {};
const example = (name = 'success') =>
  readFile(new URL(`../public/examples/${name}.csv`, import.meta.url), 'utf8');
const file = (text: string) =>
  new File([text], 'schedule.csv', { type: 'text/csv' });

function candidate(text: string): CandidateSchedule {
  const result = importScheduleCsv(text, readySchedule);
  assert.equal(result.kind, 'valid');
  if (result.kind !== 'valid')
    throw new Error('The test candidate must be valid.');
  return {
    date: result.candidate.date,
    rows: result.candidate.rows.map((row, index) => ({
      ...row,
      row: index + 2,
    })),
  };
}

function trackedGateway(scenario: DemoScenario = 'normal') {
  const source = createMockGateway(readySchedule, scenario);
  const counts = { apply: 0, load: 0 };
  const gateway: ScheduleGateway = {
    apply: async (input, revision) => {
      counts.apply++;
      return source.apply(input, revision);
    },
    load: async () => {
      counts.load++;
      return source.load();
    },
  };
  return { source, gateway, counts };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("a stale revision is rejected atomically without overwriting another editor's commit", async () => {
  const store = createScheduleStore(readySchedule);
  const saved = store.replace(candidate(await example('warnings')), 0);
  assert.equal(saved.kind, 'committed');
  const before = store.read();
  assert.equal(before.revision, 1);
  assert.deepEqual(store.replace(candidate(await example()), 0), {
    kind: 'conflict',
  });
  assert.deepEqual(store.read(), before);
  const next = store.replace(candidate(await example()), 1);
  assert.equal(next.kind, 'committed');
  assert.equal(store.read().revision, 2);
});

test('conflict blocks data actions; reload reads the new version without automatically resubmitting', async () => {
  const { gateway, counts } = trackedGateway('conflict');
  const session = createUploadSession(readySchedule, { gateway, pause });
  const input = file(await example());
  await session.upload(input);
  assert.equal(session.getSnapshot().result.kind, 'conflict');
  assert.deepEqual(session.getSnapshot().schedule, readySchedule);
  assert.equal(session.getSnapshot().revision, 0);
  assert.equal(canUseSchedule(session.getSnapshot()), false);
  await session.upload(input);
  assert.deepEqual(counts, { apply: 1, load: 0 });

  await session.reload();
  const refreshed = session.getSnapshot();
  assert.equal(refreshed.result.kind, 'reloaded');
  assert.equal(refreshed.revision, 1);
  assert.equal(canUseSchedule(refreshed), true);
  assert.ok(refreshed.schedule);
  assert.deepEqual(
    refreshed.schedule.staff.find((staff) => staff.id === 'st_004')?.hours,
    [false, false, false, true, true, true, false, false],
  );
  assert.match(
    exportScheduleCsv(refreshed.schedule),
    /st_004,FALSE,FALSE,FALSE,TRUE,TRUE,TRUE,FALSE,FALSE/,
  );
  assert.deepEqual(counts, { apply: 1, load: 1 });

  // An old CSV is not invalidated: only an explicit new upload uses the refreshed screen revision.
  await session.upload(input);
  assert.equal(session.getSnapshot().result.kind, 'applied');
  assert.equal(session.getSnapshot().revision, 2);
  assert.deepEqual(counts, { apply: 2, load: 1 });
});

test('unknown committed and uncommitted uploads look the same until an explicit reload', async () => {
  const text = await example();
  for (const scenario of [
    'unknown-committed',
    'unknown-not-committed',
  ] as const) {
    const { gateway, counts } = trackedGateway(scenario);
    const session = createUploadSession(readySchedule, { gateway, pause });
    await session.upload(file(text));
    assert.deepEqual(session.getSnapshot().result, { kind: 'unknown' });
    assert.deepEqual(session.getSnapshot().schedule, readySchedule);
    assert.equal(canUseSchedule(session.getSnapshot()), false);
    await session.upload(file(text));
    assert.deepEqual(counts, { apply: 1, load: 0 });
    await session.reload();
    const snapshot = session.getSnapshot();
    assert.equal(snapshot.result.kind, 'reloaded');
    assert.equal(canUseSchedule(snapshot), true);
    assert.ok(snapshot.schedule);
    assert.equal(snapshot.revision, scenario === 'unknown-committed' ? 1 : 0);
    assert.equal(
      exportScheduleCsv(snapshot.schedule),
      scenario === 'unknown-committed'
        ? text
        : exportScheduleCsv(readySchedule),
    );
    assert.deepEqual(counts, { apply: 1, load: 1 });
  }
});

test('failed recovery removes the untrusted snapshot; Try again only retries loading', async () => {
  const { gateway, counts } = trackedGateway('reload-failure');
  const session = createUploadSession(readySchedule, { gateway, pause });
  const input = file(await example());
  await session.upload(input);
  await session.reload();
  assert.deepEqual(session.getSnapshot(), {
    schedule: null,
    revision: null,
    coverageVisible: false,
    result: { kind: 'load-error', recovery: true },
  });
  assert.equal(canUseSchedule(session.getSnapshot()), false);
  await session.upload(input);
  assert.deepEqual(counts, { apply: 1, load: 1 });
  await session.reload();
  assert.equal(session.getSnapshot().result.kind, 'reloaded');
  assert.equal(session.getSnapshot().revision, 1);
  assert.equal(canUseSchedule(session.getSnapshot()), true);
  assert.deepEqual(counts, { apply: 1, load: 2 });
});

test('an initial load failure provides no exportable schedule and retry restores Ready', async () => {
  const { gateway, counts } = trackedGateway();
  const session = createUploadSession(readySchedule, {
    gateway,
    pause,
    scenario: 'load-error',
  });
  assert.equal(session.getSnapshot().schedule, null);
  assert.equal(canUseSchedule(session.getSnapshot()), false);
  await session.upload(file(await example()));
  assert.deepEqual(counts, { apply: 0, load: 0 });
  await session.reload();
  assert.deepEqual(session.getSnapshot().schedule, readySchedule);
  assert.equal(session.getSnapshot().result.kind, 'ready');
  assert.equal(canUseSchedule(session.getSnapshot()), true);
  assert.deepEqual(counts, { apply: 0, load: 1 });
});

test('reload in flight preserves the prior view, locks actions, and ignores repeated reloads', async () => {
  const base = trackedGateway('conflict');
  const loading = deferred<VersionedSchedule>();
  const loadStarted = deferred<void>();
  let loads = 0;
  const gateway: ScheduleGateway = {
    apply: base.gateway.apply,
    load: () => {
      loads++;
      loadStarted.resolve();
      return loading.promise;
    },
  };
  const session = createUploadSession(readySchedule, { gateway, pause });
  const input = file(await example());
  await session.upload(input);
  const pending = session.reload();
  await loadStarted.promise;
  assert.deepEqual(session.getSnapshot().result, {
    kind: 'reloading',
    recovery: true,
  });
  assert.deepEqual(session.getSnapshot().schedule, readySchedule);
  assert.equal(canUseSchedule(session.getSnapshot()), false);
  await session.reload();
  await session.upload(input);
  assert.equal(loads, 1);
  assert.equal(base.counts.apply, 1);
  loading.resolve(await base.source.load());
  await pending;
  assert.equal(session.getSnapshot().result.kind, 'reloaded');
});

test('a committed but delayed response does not update the screen before confirmation', async () => {
  const base = createMockGateway(readySchedule);
  const response = deferred<ApplyResult>();
  const committed = deferred<void>();
  let accepted: ApplyResult;
  let applies = 0;
  const gateway: ScheduleGateway = {
    load: base.load,
    apply: async (input, revision) => {
      applies++;
      accepted = await base.apply(input, revision);
      committed.resolve();
      return response.promise;
    },
  };
  const session = createUploadSession(readySchedule, { gateway, pause });
  const input = file(await example());
  const pending = session.upload(input);
  await committed.promise;
  assert.equal((await base.load()).revision, 1);
  assert.equal(session.getSnapshot().result.kind, 'applying');
  assert.deepEqual(session.getSnapshot().schedule, readySchedule);
  assert.equal(canUseSchedule(session.getSnapshot()), false);
  await session.upload(input);
  await session.reload();
  assert.equal(applies, 1);
  response.resolve(accepted!);
  await pending;
  assert.equal(session.getSnapshot().revision, 1);
});

test('local rejection never reaches the gateway or consumes its one-shot conflict', async () => {
  const { gateway, counts } = trackedGateway('conflict');
  const session = createUploadSession(readySchedule, { gateway, pause });
  await session.upload(file(await example('wrong-date')));
  await session.upload(file(await example('corrections')));
  assert.deepEqual(counts, { apply: 0, load: 0 });
  await session.upload(file(await example()));
  assert.equal(session.getSnapshot().result.kind, 'conflict');
  assert.equal(counts.apply, 1);
});

test('server-side content rejection preserves data and maps to corrections after local validation passes', async () => {
  const store = createScheduleStore(readySchedule);
  const before = store.read();
  const gateway: ScheduleGateway = {
    load: async () => store.read(),
    apply: async (input, revision) =>
      store.replace({ ...input, rows: input.rows.slice(1) }, revision),
  };
  const session = createUploadSession(readySchedule, { gateway, pause });
  await session.upload(file(await example()));
  const result = session.getSnapshot().result;
  assert.equal(result.kind, 'corrections');
  if (result.kind === 'corrections')
    assert.equal(result.issues[0]?.code, 'STAFF_ROW_MISSING');
  assert.deepEqual(store.read(), before);
  assert.deepEqual(session.getSnapshot().schedule, readySchedule);
  assert.equal(canUseSchedule(session.getSnapshot()), true);
});

test('unknown recovery can fail repeatedly without replaying the committed upload', async () => {
  const base = trackedGateway('unknown-committed');
  let failures = 2;
  const gateway: ScheduleGateway = {
    apply: base.gateway.apply,
    load: async () => {
      if (failures-- > 0) throw new Error('Connection unavailable');
      return base.gateway.load();
    },
  };
  const session = createUploadSession(readySchedule, { gateway, pause });
  await session.upload(file(await example('warnings')));
  for (let attempt = 0; attempt < 2; attempt++) {
    await session.reload();
    assert.equal(session.getSnapshot().result.kind, 'load-error');
    assert.equal(canUseSchedule(session.getSnapshot()), false);
  }
  await session.reload();
  assert.equal(session.getSnapshot().result.kind, 'reloaded');
  assert.equal(session.getSnapshot().revision, 1);
  assert.equal(session.getSnapshot().coverageVisible, true);
  assert.equal(base.counts.apply, 1);
});

test('outcome copy distinguishes rejection, uncertainty, pending work, and reload', () => {
  const date = readySchedule.date;
  assert.equal(
    describeResult({ kind: 'conflict' }, date)?.outcome,
    'Not changed by this attempt',
  );
  const unknown = describeResult({ kind: 'unknown' }, date);
  assert.equal(unknown?.outcome, 'Result unknown');
  assert.doesNotMatch(
    JSON.stringify(unknown),
    /not changed|nothing was changed|upload complete/i,
  );
  assert.equal(
    describeResult({ kind: 'applying', filename: 'file.csv' }, date)?.outcome,
    undefined,
  );
  assert.equal(
    describeResult({ kind: 'reloading', recovery: true }, date)?.outcome,
    undefined,
  );
  assert.equal(
    describeResult({ kind: 'reloaded' }, date)?.description,
    RELOADED_NOTICE,
  );
  assert.equal(
    RELOADED_NOTICE,
    'If you edited a CSV downloaded before this reload, download a fresh copy and transfer your changes before uploading.',
  );
});

test('only documented scenario values activate the transport simulations', () => {
  assert.equal(parseDemoScenario('conflict'), 'conflict');
  assert.equal(parseDemoScenario('unexpected'), 'normal');
  assert.equal(parseDemoScenario(['conflict', 'normal']), 'normal');
});
