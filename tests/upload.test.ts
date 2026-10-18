import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readySchedule } from '../src/data/ready-schedule.ts';
import { getCoverageWarnings } from '../src/domain/coverage.ts';
import { validateSchedule } from '../src/domain/validate-schedule.ts';
import { exportScheduleCsv } from '../src/lib/csv/export-schedule.ts';
import { importScheduleCsv } from '../src/lib/csv/import-schedule.ts';
import { parseCsv } from '../src/lib/csv/parse-csv.ts';
import { MAX_CSV_BYTES, readCsvFile } from '../src/lib/csv/read-file.ts';
import { createScheduleStore } from '../src/lib/mock/schedule-store.ts';
import { createUploadSession } from '../src/lib/upload/session.ts';

const csv = exportScheduleCsv(readySchedule);
const candidate = () => ({
  date: readySchedule.date,
  rows: readySchedule.staff.map((staff, index) => ({
    staffId: staff.id as string,
    hours: [...staff.hours] as unknown[],
    row: index + 2,
  })),
});
const file = (text: string, name = 'schedule.csv') =>
  new File([text], name, { type: 'text/csv' });
const example = (name: string) =>
  readFile(new URL(`../public/examples/${name}.csv`, import.meta.url), 'utf8');

test('CSV export round-trips without changing saved values', () => {
  const result = importScheduleCsv(csv, readySchedule);
  assert.equal(result.kind, 'valid');
  if (result.kind !== 'valid') return;
  assert.deepEqual(
    result.candidate.rows.map((row) => row.hours),
    readySchedule.staff.map((staff) => staff.hours),
  );
});

test('CSV parser supports BOM, quoted delimiters, escaped quotes, newlines and a trailing empty field', () => {
  assert.deepEqual(
    parseCsv('\uFEFFa,"b,c","say ""yes""",\r\nx,"y\r\nz",w,\r\n'),
    {
      ok: true,
      records: [
        { line: 1, fields: ['a', 'b,c', 'say "yes"', ''] },
        { line: 2, fields: ['x', 'y\nz', 'w', ''] },
      ],
    },
  );
  for (const text of ['a,"open', 'a,"closed"oops', 'a,un"quoted'])
    assert.equal(parseCsv(text).ok, false);
});

test('present empty cells mean false; truncated records remain blocking', () => {
  const rows = csv.trimEnd().split('\r\n');
  rows[4] = `${readySchedule.date},st_004,,,,,,,,`;
  assert.equal(
    importScheduleCsv(rows.join('\r\n'), readySchedule).kind,
    'valid',
  );
  rows[4] = rows[4]!.slice(0, -1);
  assert.equal(
    importScheduleCsv(rows.join('\r\n'), readySchedule).kind,
    'blocking',
  );
});

test('trimmed uppercase values are accepted; aliases are not coerced', () => {
  assert.equal(
    importScheduleCsv(csv.replaceAll('TRUE', ' TRUE '), readySchedule).kind,
    'valid',
  );
  for (const alias of ['true', '1', 'T', 'yes']) {
    const result = importScheduleCsv(csv.replace('TRUE', alias), readySchedule);
    assert.equal(result.kind, 'corrections');
    if (result.kind === 'corrections') {
      assert.deepEqual(
        result.issues.map((issue) => issue.code),
        ['SCHEDULE_VALUE_INVALID'],
      );
      assert.equal(result.issues[0]?.enteredValue, alias);
    }
  }
});

test('headers can reorder but cannot omit, duplicate, or add columns', () => {
  const reordered = csv
    .trimEnd()
    .split('\r\n')
    .map((row) => row.split(',').reverse().join(','))
    .join('\r\n');
  assert.equal(importScheduleCsv(reordered, readySchedule).kind, 'valid');
  for (const text of [
    csv.replace('staff_id', 'extra'),
    csv.replace('staff_id', 'date'),
    csv.replace('staff_id', 'staff_id,extra'),
  ]) {
    assert.equal(importScheduleCsv(text, readySchedule).kind, 'blocking');
  }
});

test('split shifts take priority over short-period errors; zero work is valid', () => {
  const input = candidate();
  for (const hours of [
    [true, false, true, false, false, false, false, false],
    [true, true, true, false, true, true, true, false],
  ]) {
    input.rows[0]!.hours = hours;
    const result = validateSchedule(input, readySchedule);
    assert.equal(result.kind, 'corrections');
    if (result.kind === 'corrections')
      assert.deepEqual(
        result.issues.map((issue) => issue.code),
        ['SPLIT_SHIFT'],
      );
  }
  input.rows[0]!.hours = Array(8).fill(false);
  assert.equal(validateSchedule(input, readySchedule).kind, 'valid');
});

test('active roster is enforced for missing, duplicate and unrecognized IDs', () => {
  const input = candidate();
  input.rows[0]!.staffId = 'st_002';
  input.rows[2]!.staffId = 'inactive';
  const result = validateSchedule(input, readySchedule);
  assert.equal(result.kind, 'corrections');
  if (result.kind === 'corrections')
    assert.deepEqual(
      result.issues.map((issue) => issue.code),
      [
        'STAFF_ROW_DUPLICATE',
        'STAFF_NOT_ACTIVE',
        'STAFF_ROW_MISSING',
        'STAFF_ROW_MISSING',
      ],
    );
});

test('file guards reject empty, oversized, non-CSV, unreadable and invalid UTF-8 files', async () => {
  const cases = [
    { value: file(''), code: 'FILE_EMPTY' },
    { value: file(csv, 'schedule.txt'), code: 'FILE_TYPE' },
    {
      value: {
        name: 'large.csv',
        size: MAX_CSV_BYTES + 1,
        arrayBuffer: async () => {
          throw Error('must not read');
        },
      },
      code: 'FILE_TOO_LARGE',
    },
    {
      value: {
        name: 'broken.csv',
        size: 1,
        arrayBuffer: async () => {
          throw Error('unreadable');
        },
      },
      code: 'FILE_UNREADABLE',
    },
    {
      value: new File([new Uint8Array([0xc3, 0x28])], 'encoding.csv'),
      code: 'FILE_ENCODING',
    },
  ];
  for (const { value, code } of cases) {
    const result = await readCsvFile(value);
    assert.equal(result.kind, 'blocking');
    if (result.kind === 'blocking') assert.equal(result.issue.code, code);
  }
});

test('mock store revalidates and replaces atomically; external mutation cannot change saved data', () => {
  const store = createScheduleStore(readySchedule);
  const before = store.read();
  const invalid = candidate();
  invalid.rows[0]!.hours = [
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ];
  assert.equal(store.replace(invalid, before.revision).kind, 'corrections');
  assert.deepEqual(store.read(), before);
  const valid = candidate();
  valid.rows[0]!.hours.fill(false);
  const result = store.replace(valid, before.revision);
  assert.equal(result.kind, 'committed');
  valid.rows[0]!.hours.fill(true);
  assert.deepEqual(store.read().schedule.staff[0]?.hours, Array(8).fill(false));
  assert.notEqual(store.read().schedule.updatedAt, before.schedule.updatedAt);
});

test('pending upload keeps the loaded grid and time; a second submission is ignored', async () => {
  const release: (() => void)[] = [];
  const session = createUploadSession(readySchedule, {
    pause: () => new Promise<void>((resolve) => release.push(resolve)),
  });
  const transitions: string[] = [];
  session.subscribe(() => transitions.push(session.getSnapshot().result.kind));
  const pending = session.upload(file(await example('success')));
  assert.equal(session.getSnapshot().result.kind, 'checking');
  await session.upload(file('invalid'));
  while (release.length === 0)
    await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(session.getSnapshot().schedule, readySchedule);
  release.shift()!();
  while (release.length === 0)
    await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(session.getSnapshot().result.kind, 'applying');
  assert.deepEqual(session.getSnapshot().schedule, readySchedule);
  release.shift()!();
  await pending;
  assert.deepEqual(transitions, ['checking', 'applying', 'applied']);
  assert.notEqual(
    session.getSnapshot().schedule?.updatedAt,
    readySchedule.updatedAt,
  );
});

test('example files reproduce their documented outcomes, and rejected files preserve the snapshot', async () => {
  const expected = {
    success: 'applied',
    warnings: 'applied',
    'all-off-duty': 'applied',
    corrections: 'corrections',
    'wrong-date': 'blocking',
    'missing-column': 'blocking',
    'truncated-row': 'blocking',
  };
  for (const [name, kind] of Object.entries(expected)) {
    const session = createUploadSession(readySchedule, {
      pause: async () => {},
    });
    await session.upload(file(await example(name)));
    const result = session.getSnapshot().result;
    assert.equal(result.kind, kind, name);
    if (kind !== 'applied')
      assert.deepEqual(session.getSnapshot().schedule, readySchedule, name);
    if (name === 'corrections' && result.kind === 'corrections')
      assert.equal(result.issues.length, 4);
    if (name === 'success' && result.kind === 'applied')
      assert.deepEqual(result.warnings, []);
    if (name === 'warnings' && result.kind === 'applied')
      assert.deepEqual(result.warnings, [
        { start: 0, end: 1, count: 1 },
        { start: 7, end: 8, count: 0 },
      ]);
    if (name === 'all-off-duty')
      assert.deepEqual(getCoverageWarnings(session.getSnapshot().schedule!), [
        { start: 0, end: 8, count: 0 },
      ]);
  }
});

test('a correction attempt preserves the last successful save and its warning columns', async () => {
  const session = createUploadSession(readySchedule, { pause: async () => {} });
  await session.upload(file(await example('warnings')));
  const saved = session.getSnapshot().schedule;
  await session.upload(file(await example('corrections')));
  assert.deepEqual(session.getSnapshot().schedule, saved);
  assert.equal(session.getSnapshot().coverageVisible, true);
  assert.equal(
    exportScheduleCsv(session.getSnapshot().schedule!),
    exportScheduleCsv(saved!),
  );
});
