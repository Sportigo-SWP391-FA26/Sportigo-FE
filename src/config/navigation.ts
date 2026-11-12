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
      // note: FR-66/67
      { label: 'Dạy thay & coach vắng', path: '/app/session-coaches' },
      { label: 'Ca làm lễ tân', path: '/app/staff-shifts' },
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
      { label: 'Check-in phòng tập', path: '/app/check-in' },
      { label: 'Thu tiền tại quầy', path: '/app/cashier' },
      { label: 'Gói membership', path: '/app/memberships' },
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
      { label: 'Cấu hình trung tâm', path: '/app/center-settings' },
    ],
  },
];

// FR-09: trước đây Receptionist dùng chung menu Manager nên thấy cả mục không có quyền
export const receptionistNavigation: NavigationItem[] = [
  { label: 'Check-in phòng tập', path: '/app/check-in' },
  // note: FR-67 ca làm và chấm công
  { label: 'Ca làm của tôi', path: '/app/my-shifts' },
  { label: 'Tra cứu Hội viên', path: '/app/users' },
  { label: 'Đăng ký lớp cho Hội viên', path: '/app/class-bookings' },
  { label: 'Thu tiền tại quầy', path: '/app/cashier' },
  // FR-56
  { label: 'Yêu cầu hỗ trợ', path: '/app/support' },
];

export const coachNavigation: NavigationEntry[] = [
  { label: 'Tổng quan', path: '/coach/dashboard' },
  { label: 'Lịch & buổi học', items: [
    { label: 'Lịch dạy', path: '/coach/schedule' },
    { label: 'Đăng ký ca dạy', path: '/coach/availability' },
    { label: 'Điểm danh', path: '/coach/attendance' },
  ] },
  { label: 'Học viên & đào tạo', items: [
    { label: 'Học viên', path: '/coach/members' },
    { label: 'Khóa 1–1', path: '/coach/private-enrollments' },
    { label: 'Giáo án', path: '/coach/workout-plans' },
    { label: 'Đánh giá', path: '/coach/assessments' },
  ] },
];
