import { formatDay } from '../../domain/format-date.ts';
import { TIME_SLOTS, type SavedSchedule } from '../../domain/schedule.ts';
import { validateSchedule } from '../../domain/validate-schedule.ts';
import type {
  CandidateRow,
  UploadIssue,
  ValidationResult,
} from '../../domain/upload.ts';
import { parseCsv } from './parse-csv.ts';

const REQUIRED_COLUMNS = ['date', 'staff_id', ...TIME_SLOTS];

export function blocking(
  code: UploadIssue['code'],
  message: string,
  location = 'File',
): ValidationResult & { kind: 'blocking' } {
  return { kind: 'blocking', issue: { code, location, message } };
}

function parseValue(value: string): unknown {
  const token = value.trim();
  if (token === 'TRUE') return true;
  if (token === 'FALSE' || token === '') return false;
  return value;
}

export function importScheduleCsv(
  source: string,
  current: SavedSchedule,
): ValidationResult {
  if (source.trim() === '')
    return blocking(
      'FILE_EMPTY',
      'No schedule data was found in this file. Download the current CSV and try again.',
    );
  const parsed = parseCsv(source);
  if (!parsed.ok)
    return blocking('CSV_MALFORMED', parsed.message, `Row ${parsed.line}`);
  const [header, ...records] = parsed.records;
  if (!header)
    return blocking('FILE_EMPTY', 'No schedule data was found in this file.');
  const columns = header.fields.map((field) => field.trim());
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length)
    return blocking(
      'HEADER_INVALID',
      `The CSV is missing required columns: ${missing.join(', ')}. Download the current CSV again and try again.`,
    );
  if (new Set(columns).size !== columns.length)
    return blocking(
      'HEADER_INVALID',
      'Each CSV column must appear exactly once. Remove duplicate column headings.',
    );
  const extra = columns.filter((name) => !REQUIRED_COLUMNS.includes(name));
  if (extra.length)
    return blocking(
      'HEADER_INVALID',
      `Unexpected columns: ${extra.map((name) => name || '(blank)').join(', ')}. Use the columns in the downloaded CSV.`,
    );
  if (!records.length)
    return blocking(
      'FILE_EMPTY',
      'No staff rows were found in this file. Download the current CSV and try again.',
    );

  const dateIndex = columns.indexOf('date');
  const staffIndex = columns.indexOf('staff_id');
  // Structural and date failures take priority over collected content corrections.
  for (const record of records) {
    if (record.fields.length !== columns.length)
      return blocking(
        'CSV_MALFORMED',
        `This row has ${record.fields.length} fields; ${columns.length} are required. Keep all eight time fields, including blank fields.`,
        `Row ${record.line}`,
      );
    const date = record.fields[dateIndex]!.trim();
    if (date !== current.date) {
      const parsedDate = new Date(`${date}T00:00:00Z`);
      const validDate =
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(parsedDate.getTime()) &&
        parsedDate.toISOString().startsWith(date);
      const message = validDate
        ? `This file is for ${formatDay(date)}, but the selected day is ${formatDay(current.date)}. Choose a file for ${formatDay(current.date)}.`
        : `Use ${current.date} in every date field. The date must match the selected day.`;
      return blocking('DATE_MISMATCH', message, `Row ${record.line}`);
    }
  }
  const rows: CandidateRow[] = records.map((record) => ({
    row: record.line,
    staffId: record.fields[staffIndex]!.trim(),
    hours: TIME_SLOTS.map((slot) =>
      parseValue(record.fields[columns.indexOf(slot)]!),
    ),
  }));
  return validateSchedule({ date: current.date, rows }, current);
}
