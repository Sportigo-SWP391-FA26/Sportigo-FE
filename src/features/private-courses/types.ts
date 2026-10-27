export type CourseAvailability = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'AVAILABLE' | 'UNAVAILABLE';
};

export type PrivateCourse = {
  id: number;
  sportId: number;
  name: string;
  description: string | null;
  totalSessions: number;
  sessionDurationMinutes: number;
  validityDays: number;
  price: string | number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  sport: { id: number; name: string; isActive: boolean };
  coaches: {
    coachId: number;
    privateCourseId: number;
    customPrice: string | number | null;
    isActive: boolean;
    coach: {
      user: { id: number; displayName: string };
      availabilities: CourseAvailability[];
    };
  }[];
};

export type PrivateSchedule = {
  id: number;
  enrollmentId: number;
  roomId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
  room?: { id: number; code: string; name: string };
};

export type PrivateEnrollment = {
  id: number;
  memberId: number;
  coachId: number;
  privateCourseId: number;
  purchasedSessions: number;
  remainingSessions: number;
  purchasedPrice: string | number;
  startDate: string;
  expiryDate: string;
  status: string;
  member: { userId: number; memberCode: string };
  coach: { user: { id: number; displayName: string } };
  privateCourse: {
    id: number;
    name: string;
    sport: { id: number; name: string; isActive: boolean };
  };
  schedules: PrivateSchedule[];
};

export type OccurrenceActionInput =
  | { action: 'CANCELLED'; reason: string }
  | { action: 'RESCHEDULED'; newStartsAt: string; reason: string };

export type OccurrenceChange = {
  id: number;
  scheduleId: number;
  sessionDate: string;
  action: 'CANCELLED' | 'RESCHEDULED';
  rescheduledStartsAt: string | null;
  rescheduledEndsAt: string | null;
  newRoomId: number | null;
  reason: string;
};
