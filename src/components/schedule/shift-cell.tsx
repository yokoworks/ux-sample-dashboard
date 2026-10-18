import { clsx } from 'clsx';
import type { ShiftPosition } from '@/domain/schedule';

export function ShiftCell({
  position,
  warning = false,
}: {
  position: ShiftPosition;
  warning?: boolean;
}) {
  const scheduled = position !== 'none';
  return (
    <td
      className={clsx(
        'shift-cell',
        `shift-cell--${position}`,
        warning && 'shift-cell--warning',
      )}
    >
      <span className="sr-only">
        {scheduled ? 'Scheduled' : 'Not scheduled'}
      </span>
      {scheduled && <span aria-hidden="true" className="shift-bar" />}
    </td>
  );
}
