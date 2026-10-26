import type {
  ClassSchedule,
  CoachAvailability,
  MemberProfile,
  RecentActivity,
} from './types';

// Dữ liệu minh họa. Thay nguồn này bằng React Query khi API sẵn sàng.
export const memberProfile: MemberProfile = {
  id: 'member-demo-01',
  name: 'Nguyễn Thanh Tài',
  avatar: '/images/landing/coaches/minh-tran.webp',
};

export const classSchedules: ClassSchedule[] = [
  {
    id: 'swim-01', title: 'Swimming Endurance', sport: 'Bơi lội', type: 'GROUP', status: 'REGISTERED',
    date: '2026-10-12', dayLabel: 'Th 2', startTime: '06:00', endTime: '07:00', room: 'Hồ bơi Olympic',
    coach: 'Coach Minh', image: '/images/landing/hero/swimming.webp', capacity: 12, booked: 8,
  },
  {
    id: 'gym-01', title: 'Strength & Conditioning', sport: 'Gym', type: 'GROUP', status: 'ALMOST_FULL',
    date: '2026-10-12', dayLabel: 'Th 2', startTime: '18:00', endTime: '19:00', room: 'Khu Gym A',
    coach: 'Coach Huy', image: '/images/landing/hero/gym.webp', capacity: 10, booked: 9,
  },
  {
    id: 'yoga-01', title: 'Yoga Flow', sport: 'Yoga', type: 'GROUP', status: 'AVAILABLE',
    date: '2026-10-14', dayLabel: 'Th 4', startTime: '18:00', endTime: '19:00', room: 'Phòng Yoga',
    coach: 'Coach Linh', image: '/images/landing/hero/yoga.webp', capacity: 15, booked: 7,
  },
  {
    id: 'badminton-01', title: 'Badminton Skills', sport: 'Cầu lông', type: 'GROUP', status: 'FULL',
    date: '2026-10-16', dayLabel: 'Th 6', startTime: '19:00', endTime: '20:30', room: 'Sân Cầu lông A',
    coach: 'Coach Quốc', image: '/images/landing/hero/badminton.webp', capacity: 8, booked: 8,
  },
  {
    id: 'private-01', title: 'Kỹ thuật bơi 1–1', sport: 'Bơi lội', type: 'PRIVATE', status: 'AVAILABLE',
    date: '2026-10-15', dayLabel: 'Th 5', startTime: '15:00', endTime: '17:00', room: 'Hồ bơi Olympic',
    coach: 'Coach Minh', image: '/images/landing/hero/swimming.webp', capacity: 1, booked: 0,
  },
];

export const coachAvailability: CoachAvailability[] = [
  { id: 'coach-01', name: 'Minh Trần', sport: 'Bơi lội', avatar: '/images/landing/coaches/minh-tran.webp', rating: 4.9, nextAvailable: 'Th 5 · 15:00' },
  { id: 'coach-02', name: 'Linh Nguyễn', sport: 'Yoga', avatar: '/images/landing/coaches/linh-nguyen.webp', rating: 4.9, nextAvailable: 'Th 6 · 09:00' },
  { id: 'coach-03', name: 'Quốc Bùi', sport: 'Cầu lông', avatar: '/images/landing/coaches/quoc-bui.webp', rating: 4.8, nextAvailable: 'Th 7 · 14:00' },
];

export const recentActivities: RecentActivity[] = [
  { id: 'activity-01', type: 'PAYMENT', title: 'Thanh toán thành công', description: 'Khóa 1–1 · 12 buổi', time: 'Hôm qua · 20:14' },
  { id: 'activity-02', type: 'REMINDER', title: 'Nhắc lịch học', description: 'Yoga Flow · Thứ 4, 18:00', time: 'Hôm qua · 09:30' },
];
