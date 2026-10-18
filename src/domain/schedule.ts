export const TIME_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
] as const;

export type ShiftHours = readonly [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
];

export type StaffSchedule = Readonly<{
  id: string;
  name: string;
  hours: ShiftHours;
}>;

export type SavedSchedule = Readonly<{
  date: string;
  updatedAt: string;
  staff: readonly StaffSchedule[];
}>;

export type ShiftPosition = 'none' | 'single' | 'start' | 'middle' | 'end';

export function getShiftPosition(
  hours: ShiftHours,
  index: number,
): ShiftPosition {
  if (!hours[index]) return 'none';
  const previous = hours[index - 1] ?? false;
  const next = hours[index + 1] ?? false;
  if (!previous && !next) return 'single';
  if (!previous) return 'start';
  if (!next) return 'end';
  return 'middle';
}

export function formatTimeSlot(slot: string): string {
  return slot.replace('-', '–');
}
