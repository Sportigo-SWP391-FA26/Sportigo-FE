export type GroupClass = {
  id: number;
  sportId: number;
  coachId: number;
  name: string;
  description: string | null;
  capacity: number;
  tuitionFee: string | number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sport: { id: number; name: string; isActive: boolean };
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
export type ChangeSessionInput = {
  newStartsAt?: string;
  newRoomId?: number;
  reason: string;
};
