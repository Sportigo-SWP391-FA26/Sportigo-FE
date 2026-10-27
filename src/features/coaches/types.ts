export type CoachSport = {
  id: number;
  name: string;
  isActive: boolean;
};

export type CoachAvailability = {
  id: number;
  coachId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'AVAILABLE' | 'UNAVAILABLE';
};

export type CoachScheduleItem =
  | {
      type: 'GROUP_CLASS';
      id: number;
      startsAt: string;
      endsAt: string;
      status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
      room: { id: number; code: string; name: string } | null;
      groupClass: { id: number; name: string; status: string };
    }
  | {
      type: 'PRIVATE_COURSE';
      id: number;
      startsAt: string;
      endsAt: string;
      originalDate: string;
      status: 'SCHEDULED' | 'CANCELLED' | 'RESCHEDULED';
      room: { id: number; code: string; name: string } | null;
      enrollment: {
        id: number;
        member: { user: { id: number; displayName: string } };
        privateCourse: { id: number; name: string };
      };
    };

export type AvailabilityInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo?: string;
};
