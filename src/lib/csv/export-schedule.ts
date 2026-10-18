import { TIME_SLOTS, type SavedSchedule } from '../../domain/schedule.ts';

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Export the loaded snapshot; downloading never fetches a newer revision. */
export function exportScheduleCsv(schedule: SavedSchedule): string {
  const rows = [
    ['date', 'staff_id', ...TIME_SLOTS],
    ...schedule.staff.map((person) => [
      schedule.date,
      person.id,
      ...person.hours.map((value) => (value ? 'TRUE' : 'FALSE')),
    ]),
  ];
  return (
    rows.map((row) => row.map(escapeField).join(',')).join('\r\n') + '\r\n'
  );
}
