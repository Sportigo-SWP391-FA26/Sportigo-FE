export type NavigationItem = {
  label: string;
  path: string;
};

export const centerManagerNavigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Quản lý Hội viên', path: '/members' },
  { label: 'Quản lý Nhân sự', path: '/staff' },
  { label: 'Quản lý Bộ môn', path: '/sports' },
  { label: 'Danh sách Lớp học', path: '/classes' },
  { label: 'Quản lý Phòng tập', path: '/rooms' },
  { label: 'Quản lý Gói thành viên', path: '/packages' },
  { label: 'Báo cáo Doanh thu', path: '/revenue' },
  { label: 'Quản lý Yêu cầu', path: '/requests' },
  { label: 'Audit Log', path: '/audit-logs' },
];
