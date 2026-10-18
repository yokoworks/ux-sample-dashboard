import {
  TIME_SLOTS,
  formatTimeSlot,
  type SavedSchedule,
  type ShiftHours,
} from './schedule.ts';
import type {
  CandidateSchedule,
  UploadIssue,
  ValidatedRow,
  ValidationResult,
} from './upload.ts';

export function getWorkPeriods(
  hours: ShiftHours,
): { start: number; end: number }[] {
  const periods: { start: number; end: number }[] = [];
  for (let index = 0; index < hours.length; index++) {
    if (!hours[index]) continue;
    const start = index;
    while (index + 1 < hours.length && hours[index + 1]) index++;
    periods.push({ start, end: index + 1 });
  }
  return periods;
}

export function formatPeriod(start: number, end: number): string {
  return `${String(9 + start).padStart(2, '0')}:00–${String(9 + end).padStart(2, '0')}:00`;
}

export function validateSchedule(
  candidate: CandidateSchedule,
  current: SavedSchedule,
): ValidationResult {
  if (candidate.date !== current.date) {
    return {
      kind: 'blocking',
      issue: {
        code: 'DATE_MISMATCH',
        location: 'File',
        message: 'The file date does not match the selected day.',
      },
    };
  }
  const issues: UploadIssue[] = [];
  const staffById = new Map(current.staff.map((staff) => [staff.id, staff]));
  const rowsById = new Map<string, number[]>();
  for (const row of candidate.rows) {
    if (row.staffId)
      rowsById.set(row.staffId, [
        ...(rowsById.get(row.staffId) ?? []),
        row.row,
      ]);
  }
  for (const [id, rows] of rowsById) {
    if (rows.length > 1)
      issues.push({
        code: 'STAFF_ROW_DUPLICATE',
        location: `Rows ${rows.join(', ')}`,
        message: `Staff ID “${id}” appears more than once. Keep one row for each staff member.`,
      });
  }

  const validated: ValidatedRow[] = [];
  for (const row of candidate.rows) {
    if (!row.staffId) {
      issues.push({
        code: 'STAFF_ID_MISSING',
        location: `Row ${row.row}`,
        message: 'A staff ID is required.',
      });
      continue;
    }
    const staff = staffById.get(row.staffId);
    if (!staff) {
      issues.push({
        code: 'STAFF_NOT_ACTIVE',
        location: `Row ${row.row} · ${row.staffId}`,
        message:
          'This ID is not in the current active staff list. Download the current CSV and check the staff ID.',
      });
      continue;
    }
    if ((rowsById.get(row.staffId)?.length ?? 0) > 1) continue;
    if (row.hours.length !== TIME_SLOTS.length) {
      return {
        kind: 'blocking',
        issue: {
          code: 'CSV_MALFORMED',
          location: `Row ${row.row}`,
          message:
            'Every staff row needs all eight time fields, including fields that are blank.',
        },
      };
    }
    let invalidValue = false;
    row.hours.forEach((value, index) => {
      if (typeof value !== 'boolean') {
        invalidValue = true;
        issues.push({
          code: 'SCHEDULE_VALUE_INVALID',
          location: `Row ${row.row} · ${formatTimeSlot(TIME_SLOTS[index]!)}`,
          message:
            'Not a valid value. Enter TRUE, FALSE, or leave the cell blank.',
          enteredValue: String(value),
        });
      }
    });
    // Do not infer a work period from a row containing unparseable values.
    if (invalidValue) continue;
    const hours = row.hours as ShiftHours;
    const periods = getWorkPeriods(hours);
    if (periods.length > 1) {
      issues.push({
        code: 'SPLIT_SHIFT',
        location: `${staff.name} · ${periods.map(({ start, end }) => formatPeriod(start, end)).join(', ')}`,
        message:
          'Split shifts are not allowed. Use one continuous period of at least 3 hours.',
      });
    } else if (periods[0] && periods[0].end - periods[0].start < 3) {
      const { start, end } = periods[0];
      const count = end - start;
      issues.push({
        code: 'SHIFT_TOO_SHORT',
        location: `${staff.name} · ${formatPeriod(start, end)}`,
        message: `Scheduled for ${count} ${count === 1 ? 'hour' : 'hours'}. This shop requires at least 3 consecutive hours per scheduled day.`,
      });
    }
    validated.push({ staffId: staff.id, hours: [...hours] });
  }
  for (const staff of current.staff) {
    if (!rowsById.has(staff.id))
      issues.push({
        code: 'STAFF_ROW_MISSING',
        location: `${staff.name} (${staff.id})`,
        message:
          'No row in the file. Every current staff member needs a row, even when off duty.',
      });
  }
  return issues.length > 0
    ? { kind: 'corrections', issues }
    : { kind: 'valid', candidate: { date: candidate.date, rows: validated } };
}
