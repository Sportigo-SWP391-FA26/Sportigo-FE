import type { UserStatus } from '../users/types';
import type { CoachStatus } from './types';

// FR-65: khớp GET /api/staff/performance (Sportigo-BE/src/modules/users/staff-performance.service.ts)
export type PerformanceRange = { from: string; to: string };

export type CoachPerformance = {
  id: number;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  staffCode: string | null;
  accountStatus: UserStatus;
  coachStatus: CoachStatus | null;
  /** Buổi lớp nhóm đã diễn ra (không hủy, đã kết thúc) */
  groupSessionsHeld: number;
  /** Trong số đó, buổi đã được điểm danh */
  groupSessionsMarked: number;
  privateSessions: number;
  /** 0..1; null khi chưa có bản ghi điểm danh */
  attendanceRate: number | null;
  assessments: number;
  /** Tính ở thời điểm hiện tại, không theo khoảng xem */
  activeTrainees: number;
};

export type ReceptionistPerformance = {
  id: number;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  staffCode: string | null;
  accountStatus: UserStatus;
  supportResolved: number;
  /** Yêu cầu đang giữ, tính ở thời điểm hiện tại */
  supportInProgress: number;
  avgResolutionHours: number | null;
  cashCollected: number;
  cashPayments: number;
  membersCreated: number;
};

export type StaffPerformance = PerformanceRange & {
  totals: {
    groupSessionsHeld: number;
    privateSessions: number;
    supportResolved: number;
    cashCollected: number;
    membersCreated: number;
  };
  coaches: CoachPerformance[];
  receptionists: ReceptionistPerformance[];
};
