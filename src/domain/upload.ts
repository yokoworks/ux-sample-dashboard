import type { SavedSchedule, ShiftHours } from './schedule.ts';

export type IssueCode =
  | 'FILE_EMPTY'
  | 'FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'FILE_ENCODING'
  | 'FILE_UNREADABLE'
  | 'CSV_MALFORMED'
  | 'HEADER_INVALID'
  | 'DATE_MISMATCH'
  | 'STAFF_ID_MISSING'
  | 'STAFF_ROW_MISSING'
  | 'STAFF_ROW_DUPLICATE'
  | 'STAFF_NOT_ACTIVE'
  | 'SCHEDULE_VALUE_INVALID'
  | 'SHIFT_TOO_SHORT'
  | 'SPLIT_SHIFT';

export type UploadIssue = Readonly<{
  code: IssueCode;
  location: string;
  message: string;
  enteredValue?: string;
}>;

// Unknown cell values are retained until validation; invalid input is never coerced to false.
export type CandidateRow = Readonly<{
  staffId: string;
  hours: readonly unknown[];
  row: number;
}>;
export type CandidateSchedule = Readonly<{
  date: string;
  rows: readonly CandidateRow[];
}>;
export type ValidatedRow = Readonly<{ staffId: string; hours: ShiftHours }>;
export type ValidatedSchedule = Readonly<{
  date: string;
  rows: readonly ValidatedRow[];
}>;

export type ValidationResult =
  | { kind: 'blocking'; issue: UploadIssue }
  | { kind: 'corrections'; issues: readonly UploadIssue[] }
  | { kind: 'valid'; candidate: ValidatedSchedule };

export type CoverageWarning = Readonly<{
  start: number;
  end: number;
  count: 0 | 1;
}>;
export type UploadResult =
  | { kind: 'ready' }
  | { kind: 'checking' | 'applying'; filename: string }
  | { kind: 'blocking'; issue: UploadIssue }
  | { kind: 'corrections'; issues: readonly UploadIssue[] }
  | { kind: 'applied'; warnings: readonly CoverageWarning[] }
  | { kind: 'conflict' }
  | { kind: 'unknown' }
  | { kind: 'reloading' | 'load-error'; recovery: boolean }
  | { kind: 'reloaded' };

export type UploadSnapshot = Readonly<{
  schedule: SavedSchedule | null;
  revision: number | null;
  result: UploadResult;
  coverageVisible: boolean;
}>;

export function isProcessing(result: UploadResult): boolean {
  return (
    result.kind === 'checking' ||
    result.kind === 'applying' ||
    result.kind === 'reloading'
  );
}

export function needsReload(result: UploadResult): boolean {
  return (
    result.kind === 'conflict' ||
    result.kind === 'unknown' ||
    result.kind === 'load-error' ||
    result.kind === 'reloading'
  );
}

export function canUseSchedule(snapshot: UploadSnapshot): boolean {
  return (
    snapshot.schedule !== null &&
    snapshot.revision !== null &&
    !isProcessing(snapshot.result) &&
    !needsReload(snapshot.result)
  );
}
