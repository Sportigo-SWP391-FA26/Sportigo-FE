import { attendanceStatusLabels, attendanceStatusTones } from '../labels';
import type { AttendanceStatus } from '../types';
import { Chip } from './ui/Chip';

export function AttendanceStatusChip({ status }: { status: AttendanceStatus | null }) {
  if (!status) {
    return <Chip tone="neutral">Chưa điểm danh</Chip>;
  }
  return (
    <Chip tone={attendanceStatusTones[status]} dot>
      {attendanceStatusLabels[status]}
    </Chip>
  );
}
