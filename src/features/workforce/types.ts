// FR-66/67: khớp response của Sportigo-BE/src/modules/workforce/*.service.ts

export type CoachRef = { id: number; code: string; displayName: string };

// FR-66: một buổi lớp nhóm kèm coach dạy thực tế
export type SessionCoachItem = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  room: { code: string; name: string };
  class: { id: number; name: string; sport: { id: number; name: string } };
  classCoach: CoachRef | null;
  actualCoach: CoachRef | null;
  replacedCoach: CoachRef | null;
  coachAbsent: boolean;
  reason: string | null;
  changedAt: string | null;
  changedBy: { id: number; displayName: string } | null;
  attendanceCount: number;
  canChange: boolean;
  lockReason: string | null;
};

export type SessionCoachQuery = { from: string; to: string; changedOnly?: boolean };

export type SubstituteCandidate = CoachRef & { available: boolean };

export type SubstituteInput = { coachId: number; reason: string; coachAbsent: boolean };

// FR-67: ca làm lễ tân
export type ShiftAttendance = 'CANCELLED' | 'UPCOMING' | 'NOT_CLOCKED_IN' | 'WORKING' | 'MISSING_CLOCK_OUT' | 'ABSENT' | 'COMPLETED';
export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ClockAdjustment = {
  id: number;
  clockInAt: string | null;
  clockOutAt: string | null;
  oldClockInAt: string | null;
  oldClockOutAt: string | null;
  reason: string;
  status: AdjustmentStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reviewedBy: { id: number; displayName: string } | null;
};

export type StaffShift = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: 'SCHEDULED' | 'CANCELLED';
  note: string | null;
  cancelReason: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  createdAt: string;
  staff: { id: number; displayName: string; staffCode: string | null };
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number | null;
  attendance: ShiftAttendance;
  canClockIn: boolean;
  canClockOut: boolean;
  editable: boolean;
  pendingAdjustment: ClockAdjustment | null;
  adjustments: ClockAdjustment[];
};

export type ShiftSummary = {
  scheduled: number;
  completed: number;
  absent: number;
  lateCount: number;
  earlyLeaveCount: number;
  workedMinutes: number;
};

export type ShiftQuery = { from: string; to: string; staffId?: number };

export type ShiftInput = { staffId: number; startsAt: string; endsAt: string; note?: string };
export type ShiftUpdateInput = { startsAt?: string; endsAt?: string; note?: string | null };

export type AdjustmentRequestInput = { clockInAt?: string; clockOutAt?: string; reason: string };

export type AdjustmentListItem = ClockAdjustment & {
  requestedBy: { id: number; displayName: string };
  shift: { id: number; startsAt: string; endsAt: string; clockInAt: string | null; clockOutAt: string | null; status: 'SCHEDULED' | 'CANCELLED' };
};
