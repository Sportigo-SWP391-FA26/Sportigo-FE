export type NavigationItem = {
  label: string;
  path: string;
};

export const centerManagerNavigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/app/dashboard' },
  { label: 'Quản lý Hội viên', path: '/app/members' },
  { label: 'Quản lý Nhân sự', path: '/app/staff' },
  { label: 'Quản lý Bộ môn', path: '/app/sports' },
  { label: 'Danh sách Lớp học', path: '/app/classes' },
  { label: 'Quản lý Phòng tập', path: '/app/rooms' },
  { label: 'Thu tiền tại quầy', path: '/app/cashier' },
  { label: 'Khuyến mãi', path: '/app/promotions' },
  { label: 'Yêu cầu hoàn tiền', path: '/app/refunds' },
  { label: 'Báo cáo Doanh thu', path: '/app/revenue' },
  { label: 'Báo cáo Vận hành', path: '/app/operations-report' },
  { label: 'Audit Log', path: '/app/audit-logs' },
];
