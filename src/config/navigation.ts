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
  { label: 'Tổng quan', path: '/app/dashboard' },
  {
    label: 'Hội viên',
    items: [
      { label: 'Người dùng', path: '/app/users' },
      { label: 'Danh sách hội viên', path: '/app/members' },
      { label: 'Yêu cầu hỗ trợ', path: '/app/support' },
    ],
  },
  {
    label: 'Coach & nhân sự',
    items: [
      { label: 'Nhân sự', path: '/app/staff' },
      { label: 'Hiệu suất & lương', path: '/app/staff-payroll' },
      { label: 'Coach', path: '/app/coaches' },
      { label: 'Duyệt lịch Coach', path: '/app/coach-availability' },
      { label: 'Dạy thay & vắng', path: '/app/session-coaches' },
      { label: 'Báo nghỉ & xếp bù', path: '/app/coach-absences' },
      { label: 'Ca lễ tân', path: '/app/staff-shifts' },
    ],
  },
  {
    label: 'Lớp & lịch',
    items: [
      { label: 'Bộ môn', path: '/app/sports' },
      { label: 'Lớp nhóm', path: '/app/classes' },
      { label: 'Khóa 1–1', path: '/app/private-courses' },
      { label: 'Waitlist', path: '/waitlist' },
      { label: 'Điểm danh', path: '/manager/attendance' },
      { label: 'Khiếu nại 1–1', path: '/app/private-session-disputes' },
      { label: 'Phòng tập', path: '/app/rooms' },
    ],
  },
  {
    label: 'Gói tập & tài chính',
    items: [
      { label: 'Gói tập', path: '/app/memberships' },
      { label: 'Khuyến mãi', path: '/app/promotions' },
      { label: 'Hoàn tiền', path: '/app/refunds' },
      { label: 'Doanh thu', path: '/app/revenue' },
      { label: 'Vận hành', path: '/app/operations-report' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { label: 'Audit Log', path: '/app/audit-logs' },
      { label: 'Nội dung website', path: '/app/website-content' },
      { label: 'Cấu hình', path: '/app/center-settings' },
    ],
  },
];

// FR-09: trước đây Receptionist dùng chung menu Manager nên thấy cả mục không có quyền
export const receptionistNavigation: NavigationItem[] = [
  { label: 'Check-in phòng tập', path: '/app/check-in' },
  // note: FR-67 ca làm và chấm công
  { label: 'Ca làm của tôi', path: '/app/my-shifts' },
  { label: 'Phiếu lương', path: '/app/my-payslips' },
  { label: 'Tra cứu Hội viên', path: '/app/users' },
  { label: 'Đăng ký lớp cho Hội viên', path: '/app/class-bookings' },
  { label: 'Thu tiền tại quầy', path: '/app/cashier' },
  // FR-56
  { label: 'Yêu cầu hỗ trợ', path: '/app/support' },
];

export const coachNavigation: NavigationEntry[] = [
  { label: 'Tổng quan', path: '/coach/dashboard' },
  { label: 'Phiếu lương', path: '/coach/my-payslips' },
  { label: 'Lịch & buổi học', items: [
    { label: 'Lịch dạy', path: '/coach/schedule' },
    { label: 'Báo nghỉ buổi học', path: '/coach/absences' },
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
