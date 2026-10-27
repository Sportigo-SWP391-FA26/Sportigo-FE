import type { AssessmentQuery, AttendanceQuery, WorkoutPlanQuery } from './types';

// Khóa cache theo cây: invalidate một nhánh cha sẽ làm mới mọi query con.
export const trainingKeys = {
  all: ['training'] as const,

  myTraining: () => [...trainingKeys.all, 'me'] as const,

  attendance: () => [...trainingKeys.all, 'attendance'] as const,
  attendanceHistory: (query: AttendanceQuery) => [...trainingKeys.attendance(), 'history', query] as const,
  sessionRoster: (sessionId: number) => [...trainingKeys.attendance(), 'session', sessionId] as const,

  plans: () => [...trainingKeys.all, 'plans'] as const,
  planList: (query: WorkoutPlanQuery) => [...trainingKeys.plans(), 'list', query] as const,
  planDetail: (planId: number) => [...trainingKeys.plans(), 'detail', planId] as const,

  enrollmentPlans: (enrollmentId: number) =>
    [...trainingKeys.all, 'enrollment-plans', enrollmentId] as const,

  assessments: () => [...trainingKeys.all, 'assessments'] as const,
  assessmentList: (query: AssessmentQuery) => [...trainingKeys.assessments(), query] as const,

  sports: () => ['sports', 'active'] as const,
  coachSessions: (range: { from?: string; to?: string }) =>
    [...trainingKeys.all, 'coach-sessions', range] as const,
  coachTrainees: () => [...trainingKeys.all, 'coach-trainees'] as const,
};
