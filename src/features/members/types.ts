type Person = { id: number; displayName: string };

export type AttendanceSummary = { present: number; late: number; absent: number; excused: number; total: number };

// Khớp GET /api/members/:id (Sportigo-BE/src/modules/users/member-profile.service.ts)
export type MemberProfile = {
  id: number;
  displayName: string;
  /** null khi người xem là Coach */
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  emailVerified: boolean;
  memberCode: string;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  emergencyContact: string | null;
  joinedAt: string;
  classRegistrations: {
    id: number;
    status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
    registeredAt: string;
    class: { id: number; name: string; sport: string; status: string; startDate: string | null; endDate: string | null; coach: Person };
    attendance: AttendanceSummary;
  }[];
  privateEnrollments: {
    id: number;
    status: 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
    course: { id: number; name: string; sport: string };
    coach: Person;
    purchasedSessions: number;
    remainingSessions: number;
    usedSessions: number;
    startDate: string | null;
    expiryDate: string | null;
  }[];
  assessments: {
    id: number;
    assessmentDate: string | null;
    score: number | null;
    coachComment: string;
    recommendation: string | null;
    nextAssessmentDate: string | null;
    coach: Person;
  }[];
  /** null khi người xem là Coach */
  payments:
    | { id: number; orderNumber: string; status: string; finalAmount: number | null; paidAt: string | null; createdAt: string }[]
    | null;
  scope: 'STAFF' | 'COACH';
};
