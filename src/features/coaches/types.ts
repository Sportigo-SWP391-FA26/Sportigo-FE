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

export type AvailabilityShift = { code: string; startTime: string; endTime: string };
export type AvailabilitySubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type AvailabilitySelection = {
  id: number;
  dayOfWeek: number;
  shiftCode: string;
  isAssigned: boolean;
  approvedAvailabilityId: number | null;
};
export type AvailabilitySubmission = {
  id: number;
  coachId: number;
  month: string;
  revision: number;
  status: AvailabilitySubmissionStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  selections: AvailabilitySelection[];
  coach?: { user: { id: number; displayName: string; email: string; avatarUrl: string | null } };
  reviewer?: { id: number; displayName: string } | null;
};
export type AvailabilityCalendar = {
  month: string;
  timeZone: string;
  shifts: AvailabilityShift[];
  submission: AvailabilitySubmission;
  rules: { minimumShifts: number; minimumDays: number; minimumPerSelectedDay: number; maximumPerDay: number; submitDeadlineDay: number; resubmitDeadlineDay: number };
};
export type AvailabilityChangeRequest = {
  id: number;
  coachId: number;
  submissionId: number;
  oldDayOfWeek: number;
  oldShiftCode: string;
  newDayOfWeek: number;
  newShiftCode: string;
  reason: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  rejectionReason: string | null;
  coach?: { user: { displayName: string; email: string } };
  submission?: AvailabilitySubmission;
};
