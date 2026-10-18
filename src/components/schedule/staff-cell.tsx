import type { StaffSchedule } from '@/domain/schedule';

export function StaffCell({ staff }: { staff: StaffSchedule }) {
  return (
    <th scope="row" className="staff-cell">
      <span className="block font-semibold">{staff.name}</span>
      <span className="staff-id">{staff.id}</span>
    </th>
  );
}
