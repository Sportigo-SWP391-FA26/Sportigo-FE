// Kiểu dữ liệu khớp hợp đồng docs/training-api.md của backend (module Training, FR-47 → FR-53).
// Trường thời điểm là chuỗi ISO 8601 UTC; trường chỉ có ngày là "YYYY-MM-DD".

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type EditablePlanStatus = Exclude<PlanStatus, 'ARCHIVED'>;
export type PlanLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type PlanAssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type EnrollmentStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type PageQuery = {
  page?: number;
  pageSize?: number;
};

export type SportRef = { id: number; name: string };
export type MemberRef = { id: number; memberCode: string; displayName: string };
export type CoachRef = { id: number; coachCode: string; displayName: string };

// ---------- FR-47 / FR-48: điểm danh ----------

export type Attendance = {
  id: number;
  registrationId: number;
  classSessionId: number;
  status: AttendanceStatus;
  note: string | null;
  checkedAt: string | null;
  markedById: number | null;
  updatedAt: string;
};

export type SessionRoster = {
  session: {
    id: number;
    startsAt: string;
    endsAt: string;
    status: SessionStatus;
    class: { id: number; name: string };
    // Chưa có trong API (đề xuất BE-5); hiển thị khi backend bổ sung
    room?: { code: string; name: string } | null;
  };
  isLocked: boolean;
  students: {
    registrationId: number;
    member: MemberRef;
    attendance: Attendance | null;
  }[];
};

export type MarkAttendanceRecord = {
  classRegistrationId: number;
  status: AttendanceStatus;
  note?: string;
};

export type MarkAttendanceInput = { records: MarkAttendanceRecord[] };

export type MarkAttendanceResult = {
  sessionId: number;
  records: Attendance[];
};

export type AttendanceHistoryItem = {
  id: number;
  status: AttendanceStatus;
  note: string | null;
  checkedAt: string | null;
  updatedAt: string;
  registrationId: number;
  session: { id: number; startsAt: string; endsAt: string; status: SessionStatus };
  class: { id: number; name: string; sport: SportRef };
  member: MemberRef;
};

export type AttendanceQuery = PageQuery & {
  classId?: number;
  memberId?: number;
  sessionId?: number;
  status?: AttendanceStatus;
  from?: string;
  to?: string;
};

// ---------- FR-49 / FR-50: giáo án ----------

export type WorkoutPlanItem = {
  id: number;
  weekNumber: number;
  sessionNumber: number;
  itemOrder: number;
  title: string;
  content: string;
  durationMinutes: number | null;
  sets: number | null;
  repetitions: number | null;
  intensity: string | null;
  note: string | null;
};

export type WorkoutPlan = {
  id: number;
  name: string;
  // Lưu dạng chuỗi trong DB; API chỉ nhận PlanLevel
  level: string;
  description: string | null;
  durationWeeks: number | null;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  sport: SportRef;
  createdBy: CoachRef;
  itemCount: number;
  assignmentCount: number;
};

export type WorkoutPlanDetail = WorkoutPlan & { items: WorkoutPlanItem[] };

export type WorkoutPlanQuery = PageQuery & {
  sportId?: number;
  level?: PlanLevel;
  status?: PlanStatus;
  search?: string;
};

export type WorkoutPlanInput = {
  sportId: number;
  name: string;
  level: PlanLevel;
  description?: string | null;
  durationWeeks: number;
};

export type PlanItemInput = {
  weekNumber: number;
  sessionNumber: number;
  itemOrder?: number;
  title: string;
  content: string;
  durationMinutes?: number | null;
  sets?: number | null;
  repetitions?: number | null;
  intensity?: string | null;
  note?: string | null;
};

export type ReorderItemsInput = {
  items: { itemId: number; itemOrder: number }[];
};

// ---------- FR-51: gán giáo án cho khóa 1-1 ----------

export type PlanAssignment = {
  id: number;
  enrollmentId: number;
  status: PlanAssignmentStatus;
  assignedAt: string;
  workoutPlan: {
    id: number;
    name: string;
    level: string;
    status: PlanStatus;
    durationWeeks: number | null;
    sport: SportRef;
  };
  assignedBy: CoachRef;
};

// ---------- FR-52: đánh giá tiến độ ----------

export type AssessmentContext =
  | {
      type: 'GROUP_CLASS';
      classRegistrationId: number;
      class: { id: number; name: string; sport: SportRef };
    }
  | {
      type: 'PRIVATE_COURSE';
      privateEnrollmentId: number;
      course: { id: number; name: string; sport: SportRef };
    };

export type ProgressAssessment = {
  id: number;
  assessmentDate: string;
  // Prisma Decimal được serialize thành chuỗi, ví dụ "8.5"
  score: string | number | null;
  metrics: Record<string, number> | null;
  coachComment: string;
  recommendation: string | null;
  nextAssessmentDate: string | null;
  createdAt: string;
  member: MemberRef;
  coach: CoachRef;
  context: AssessmentContext | null;
};

export type AssessmentQuery = PageQuery & { memberId?: number };

export type AssessmentInput = {
  memberId: number;
  classRegistrationId?: number;
  privateEnrollmentId?: number;
  assessmentDate: string;
  coachComment: string;
  metrics: Record<string, number>;
  score?: number;
  recommendation?: string;
  nextAssessmentDate?: string;
};

// ---------- FR-53: kế hoạch & tiến độ của Member ----------

export type MemberPlanAssignment = {
  id: number;
  status: PlanAssignmentStatus;
  assignedAt: string;
  assignedBy: CoachRef;
  workoutPlan: {
    id: number;
    name: string;
    level: string;
    description: string | null;
    durationWeeks: number | null;
    sport: SportRef;
    items: WorkoutPlanItem[];
  };
  enrollment: {
    id: number;
    status: EnrollmentStatus;
    startDate: string | null;
    expiryDate: string | null;
    course: { id: number; name: string };
    coach: CoachRef;
  };
};

export type MemberTraining = {
  planAssignments: MemberPlanAssignment[];
  assessments: ProgressAssessment[];
};

// ---------- API chưa có ở backend (đề xuất trong docs/training-ui.md) ----------

// BE-1: GET /api/sports (FR-12)
export type Sport = SportRef & { isActive?: boolean };

// BE-2: GET /api/coaches/me/sessions
export type CoachSession = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  class: { id: number; name: string; sport: SportRef };
  room: { code: string; name: string } | null;
  confirmedCount: number;
  markedCount: number;
  isLocked: boolean;
};

// BE-3: GET /api/coaches/me/trainees
export type TraineeContext =
  | { type: 'GROUP_CLASS'; classRegistrationId: number; name: string; sport: SportRef }
  | {
      type: 'PRIVATE_COURSE';
      privateEnrollmentId: number;
      name: string;
      sport: SportRef;
      status: EnrollmentStatus;
    };

export type Trainee = {
  member: MemberRef;
  contexts: TraineeContext[];
};
