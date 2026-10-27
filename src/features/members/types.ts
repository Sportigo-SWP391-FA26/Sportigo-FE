type Person = { id: number; displayName: string };

// FR-11: khớp GET /api/coaches/me/members (coach-members.service.ts → toCoachMember)
export type CoachMember = {
  id: number;
  displayName: string;
  memberCode: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth: string | null;
  trainingGoal: string | null;
  classes: { id: number; name: string; sport: string; status: string }[];
  privateCourses: { enrollmentId: number; name: string; sport: string; status: string; remainingSessions: number; expiryDate: string | null }[];
  goals: {
    statedGoal: string | null;
    workoutPlans: { id: number; name: string; level: string }[];
    latestAssessment: { assessmentDate: string | null; score: number | null; recommendation: string | null; nextAssessmentDate: string | null } | null;
  };
};

export type CoachMembersQuery = { q?: string; type?: 'CLASS' | 'PRIVATE'; page: number; pageSize: number };
export type CoachMembersPage = { items: CoachMember[]; page: number; pageSize: number; total: number };

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
  trainingGoal: string | null;
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
