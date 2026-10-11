import type { ClassStatus } from '../types';

const labels: Record<ClassStatus, string> = {
  AVAILABLE: 'Còn chỗ',
  ALMOST_FULL: 'Gần đầy',
  FULL: 'Đã đầy',
  REGISTERED: 'Đã đăng ký',
};

export function StatusBadge({ status }: { status: ClassStatus }) {
  return <span className={`member-status member-status--${status.toLowerCase()}`}>{labels[status]}</span>;
}
