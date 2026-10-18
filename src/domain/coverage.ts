import { TIME_SLOTS, type SavedSchedule } from './schedule.ts';
import type { CoverageWarning } from './upload.ts';

export function getCoverage(schedule: SavedSchedule): number[] {
  return TIME_SLOTS.map((_, index) =>
    schedule.staff.reduce(
      (count, staff) => count + Number(staff.hours[index]),
      0,
    ),
  );
}

/** Group adjacent intervals with the same warning so an off-duty day produces one item. */
export function getCoverageWarnings(
  schedule: SavedSchedule,
): CoverageWarning[] {
  const counts = getCoverage(schedule);
  const warnings: CoverageWarning[] = [];
  for (let index = 0; index < counts.length; index++) {
    const count = counts[index];
    if (count !== 0 && count !== 1) continue;
    const start = index;
    while (index + 1 < counts.length && counts[index + 1] === count) index++;
    warnings.push({ start, end: index + 1, count });
  }
  return warnings;
}
