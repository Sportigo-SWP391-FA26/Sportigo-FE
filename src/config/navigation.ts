export type NavigationItem = {
  label: string;
  path: string;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export type NavigationEntry = NavigationItem | NavigationGroup;

export const centerManagerNavigation: NavigationEntry[] = [
  { label: 'Tổng quan', items: [{ label: 'Dashboard', path: '/app/dashboard' }] },
  {
    label: 'TÀI KHOẢN',
    items: [
      { label: 'Người dùng', path: '/app/users' },
      { label: 'Hội viên', path: '/app/members' },
      { label: 'Nhân sự', path: '/app/staff' },
      { label: 'Coach', path: '/app/coaches' },
      { label: 'Duyệt lịch Coach', path: '/app/coach-availability' },
    ],
  },
  {
    label: 'Lớp & cơ sở vật chất',
    items: [
      { label: 'Bộ môn', path: '/app/sports' },
      { label: 'Lớp nhóm', path: '/app/classes' },
      { label: 'Khóa học 1–1', path: '/app/private-courses' },
      { label: 'Waitlist', path: '/waitlist' },
      { label: 'Lịch sử điểm danh', path: '/manager/attendance' },
      { label: 'Phòng tập', path: '/app/rooms' },
    ],
  },
  {
    label: 'Tài chính & báo cáo',
    items: [
      { label: 'Thu tiền tại quầy', path: '/app/cashier' },
      { label: 'Khuyến mãi', path: '/app/promotions' },
      { label: 'Yêu cầu hoàn tiền', path: '/app/refunds' },
      { label: 'Báo cáo doanh thu', path: '/app/revenue' },
      { label: 'Báo cáo vận hành', path: '/app/operations-report' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { label: 'Yêu cầu hỗ trợ', path: '/app/support' },
      { label: 'Audit Log', path: '/app/audit-logs' },
      { label: 'Nội dung Website', path: '/app/website-content' },
    ],
  },
];

// FR-09: trước đây Receptionist dùng chung menu Manager nên thấy cả mục không có quyền
export const receptionistNavigation: NavigationItem[] = [
  { label: 'Tra cứu Hội viên', path: '/app/users' },
  { label: 'Đăng ký lớp cho Hội viên', path: '/app/class-bookings' },
  { label: 'Thu tiền tại quầy', path: '/app/cashier' },
  // FR-56
  { label: 'Yêu cầu hỗ trợ', path: '/app/support' },
];

export const coachNavigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/coach/dashboard' },
  // FR-11
  { label: 'Học viên của tôi', path: '/coach/members' },
  { label: 'Lịch của tôi', path: '/coach/schedule' },
  { label: 'Đăng ký lịch dạy', path: '/coach/availability' },
  { label: 'Điểm danh', path: '/coach/attendance' },
  { label: 'Giáo án', path: '/coach/workout-plans' },
  // FR-51
  { label: 'Khóa 1-1', path: '/coach/private-enrollments' },
  { label: 'Đánh giá tiến độ', path: '/coach/assessments' },
];
