export type GroupClass = {
  id: number;
  sportId: number;
  coachId: number;
  name: string;
  description: string | null;
  capacity: number;
  totalSessions?: number | null;
  sessionsPerWeek?: number | null;
  tuitionFee: string | number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sport: { id: number; name: string; imageUrl?: string | null; isActive: boolean };
  coach: { user: { id: number; displayName: string } };
};

export type ClassSession = {
  id: number;
  classId: number;
  roomId: number;
  startsAt: string;
  endsAt: string;
  note: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  room: { id: number; code: string; name: string } | null;
};

export type UpdateGroupClassInput = {
  sportId: number;
  coachId: number;
  name: string;
  description: string | null;
  capacity: number;
  totalSessions?: number;
  sessionsPerWeek?: number;
  tuitionFee: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startDate: string;
  endDate: string;
};

export type CreateGroupClassInput = UpdateGroupClassInput;
export type GroupClassStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'COMPLETED';
export type CreateSessionInput = {
  roomId: number;
  startsAt: string;
  endsAt: string;
  note?: string;
};
export type CreateRecurringSessionsInput = {
  patterns: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    roomId: number;
  }>;
  effectiveFrom: string;
  effectiveTo: string;
  note?: string;
} | {
  roomId: number;
  recurrence: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    effectiveFrom: string;
    effectiveTo: string;
  };
  note?: string;
};
export type RecurringSchedulePreview = {
  canCreate: boolean;
  total: number;
  conflicts: number;
  occurrences: Array<{
    startsAt: string;
    endsAt: string;
    roomId: number;
    valid: boolean;
    code?: string;
    message?: string;
  }>;
};
export type ChangeSessionInput = {
  newStartsAt?: string;
  newRoomId?: number;
  reason: string;
};
