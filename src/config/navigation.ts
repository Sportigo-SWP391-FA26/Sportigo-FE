export type NavigationItem = {
  label: string;
  path: string;
};

export const centerManagerNavigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/app/dashboard' },
  { label: 'Quản lý Người dùng', path: '/app/users' },
  { label: 'Quản lý Hội viên', path: '/app/members' },
  { label: 'Quản lý Nhân sự', path: '/app/staff' },
  { label: 'Quản lý Bộ môn', path: '/app/sports' },
  { label: 'Danh sách Lớp học', path: '/app/classes' },
  { label: 'Lịch sử điểm danh', path: '/manager/attendance' },
  { label: 'Quản lý Phòng tập', path: '/app/rooms' },
  { label: 'Thu tiền tại quầy', path: '/app/cashier' },
  { label: 'Khuyến mãi', path: '/app/promotions' },
  { label: 'Yêu cầu hoàn tiền', path: '/app/refunds' },
  { label: 'Yêu cầu hỗ trợ', path: '/app/support' },
  { label: 'Báo cáo Doanh thu', path: '/app/revenue' },
  { label: 'Báo cáo Vận hành', path: '/app/operations-report' },
  { label: 'Audit Log', path: '/app/audit-logs' },
];

// FR-09: trước đây Receptionist dùng chung menu Manager nên thấy cả mục không có quyền
export const receptionistNavigation: NavigationItem[] = [
  { label: 'Tra cứu Hội viên', path: '/app/users' },
  { label: 'Thu tiền tại quầy', path: '/app/cashier' },
  // FR-56
  { label: 'Yêu cầu hỗ trợ', path: '/app/support' },
];

export const coachNavigation: NavigationItem[] = [
  { label: 'Điểm danh', path: '/coach/attendance' },
  { label: 'Giáo án', path: '/coach/workout-plans' },
  { label: 'Đánh giá tiến độ', path: '/coach/assessments' },
];
