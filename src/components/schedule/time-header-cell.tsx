import { formatTimeSlot, type TIME_SLOTS } from '@/domain/schedule';
import { TriangleAlert } from 'lucide-react';
import { clsx } from 'clsx';

export function TimeHeaderCell({
  time,
  warning,
}: {
  time: (typeof TIME_SLOTS)[number];
  warning?: 0 | 1;
}) {
  return (
    <th
      scope="col"
      className={clsx(
        'time-header-cell',
        warning !== undefined && 'time-header-cell--warning',
      )}
    >
      {formatTimeSlot(time)}
      {warning !== undefined && (
        <span className="coverage-label">
          <TriangleAlert size={14} aria-hidden="true" />
          {warning === 0 ? 'No staff' : '1 person'}
        </span>
      )}
    </th>
  );
}
