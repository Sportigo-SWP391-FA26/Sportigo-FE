import axios from 'axios';
import { apiClient } from '../../api/client';
import type {
  AssessableContext,
  AssessableSession,
  AssessmentInput,
  AssessmentQuery,
  AttendanceExportQuery,
  AttendanceHistoryItem,
  AttendanceQuery,
  CoachMemberListRow,
  CoachSession,
  EditablePlanStatus,
  MarkAttendanceInput,
  MarkAttendanceResult,
  MemberProfileRow,
  MemberTraining,
  Paginated,
  PlanAssignment,
  PlanItemInput,
  PrivateEnrollmentRow,
  ProgressAssessment,
  ReorderItemsInput,
  SessionRoster,
  Sport,
  Trainee,
  TraineeMember,
  WorkoutPlan,
  WorkoutPlanDetail,
  WorkoutPlanInput,
  WorkoutPlanItem,
  WorkoutPlanQuery,
} from './types';

// Bỏ các tham số rỗng để không gửi "?search=" hay "?status=" lên backend
function cleanParams<T extends object>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

// ---------- FR-47 / FR-48 ----------

export async function getSessionAttendance(sessionId: number) {
  const { data } = await apiClient.get<SessionRoster>(`/class-sessions/${sessionId}/attendance`);
  return data;
}

export async function markSessionAttendance(sessionId: number, input: MarkAttendanceInput) {
  const { data } = await apiClient.put<MarkAttendanceResult>(
    `/class-sessions/${sessionId}/attendance`,
    input,
  );
  return data;
}

export async function getAttendanceHistory(query: AttendanceQuery) {
  const { data } = await apiClient.get<Paginated<AttendanceHistoryItem>>('/attendance', {
    params: cleanParams(query),
  });
  return data;
}

// Xuất Excel lịch sử điểm danh theo bộ lọc đang chọn (Coach, Manager)
export async function exportAttendance(query: AttendanceExportQuery) {
  try {
    const { data } = await apiClient.get<Blob>('/attendance/export', { params: cleanParams(query), responseType: 'blob' });
    return data;
  } catch (error) {
    // responseType blob làm body lỗi cũng là Blob: đọc lại thành JSON để hiện đúng thông báo của backend
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // Không phải JSON thì giữ nguyên, parseApiError dùng thông báo chung
      }
    }
    throw error;
  }
}

// ---------- FR-49 / FR-50 ----------

export async function getWorkoutPlans(query: WorkoutPlanQuery) {
  const { data } = await apiClient.get<Paginated<WorkoutPlan>>('/workout-plans', {
    params: cleanParams(query),
  });
  return data;
}

export async function getWorkoutPlan(planId: number) {
  const { data } = await apiClient.get<WorkoutPlanDetail>(`/workout-plans/${planId}`);
  return data;
}

export async function createWorkoutPlan(input: WorkoutPlanInput) {
  const { data } = await apiClient.post<WorkoutPlan>('/workout-plans', input);
  return data;
}

export async function updateWorkoutPlan(planId: number, input: Partial<WorkoutPlanInput>) {
  const { data } = await apiClient.patch<WorkoutPlan>(`/workout-plans/${planId}`, input);
  return data;
}

export async function changeWorkoutPlanStatus(planId: number, status: EditablePlanStatus) {
  const { data } = await apiClient.patch<WorkoutPlan>(`/workout-plans/${planId}/status`, { status });
  return data;
}

export async function createPlanItem(planId: number, input: PlanItemInput) {
  const { data } = await apiClient.post<WorkoutPlanItem>(`/workout-plans/${planId}/items`, input);
  return data;
}

export async function updatePlanItem(planId: number, itemId: number, input: Partial<PlanItemInput>) {
  const { data } = await apiClient.patch<WorkoutPlanItem>(
    `/workout-plans/${planId}/items/${itemId}`,
    input,
  );
  return data;
}

export async function deletePlanItem(planId: number, itemId: number) {
  await apiClient.delete(`/workout-plans/${planId}/items/${itemId}`);
}

export async function reorderPlanItems(planId: number, input: ReorderItemsInput) {
  const { data } = await apiClient.patch<WorkoutPlanItem[]>(
    `/workout-plans/${planId}/items/reorder`,
    input,
  );
  return data;
}

// ---------- FR-51 ----------

export async function getEnrollmentPlans(enrollmentId: number) {
  const { data } = await apiClient.get<PlanAssignment[]>(`/private-enrollments/${enrollmentId}/plans`);
  return data;
}

export async function assignPlanToEnrollment(enrollmentId: number, workoutPlanId: number) {
  const { data } = await apiClient.post<PlanAssignment>(`/private-enrollments/${enrollmentId}/plans`, {
    workoutPlanId,
  });
  return data;
}

// ---------- FR-52 ----------

export async function getAssessments(query: AssessmentQuery) {
  const { data } = await apiClient.get<Paginated<ProgressAssessment>>('/progress-assessments', {
    params: cleanParams(query),
  });
  return data;
}

export async function createAssessment(input: AssessmentInput) {
  const { data } = await apiClient.post<ProgressAssessment>('/progress-assessments', input);
  return data;
}

export async function getAssessableSessions(memberId: number) {
  const { data } = await apiClient.get<AssessableSession[]>('/coaches/me/assessable-sessions', { params: { memberId } });
  return data;
}

// ---------- FR-53 ----------

export async function getMyTraining() {
  const { data } = await apiClient.get<MemberTraining>('/members/me/training');
  return data;
}

// ---------- API của module khác ----------

// Module Training trả thẳng mảng hoặc { items }; các module khác của nhóm bọc trong { success, data }.
type ListBody<T> = T[] | Paginated<T> | { data: T[] };

function unwrapList<T>(body: ListBody<T>): T[] {
  if (Array.isArray(body)) return body;
  return 'items' in body ? body.items : body.data;
}

// FR-12: chỉ lấy môn đang hoạt động để chọn khi tạo giáo án
export async function getSports() {
  const { data } = await apiClient.get<ListBody<Sport>>('/sports');
  return unwrapList(data).filter((sport) => sport.isActive !== false);
}

// Học viên Coach phụ trách, dựng từ danh sách khóa 1-1 (backend tự lọc theo Coach đang đăng nhập).
// Chỉ có ngữ cảnh khóa 1-1; ngữ cảnh lớp nhóm cần API riêng (BE-3, chưa có).
export async function getCoachTrainees(): Promise<Trainee[]> {
  const { data } = await apiClient.get<ListBody<PrivateEnrollmentRow>>('/private-courses/enrollments');
  const byMember = new Map<number, Trainee>();
  for (const enrollment of unwrapList(data)) {
    const { member, privateCourse } = enrollment;
    const trainee = byMember.get(member.userId) ?? {
      member: { id: member.userId, memberCode: member.memberCode, displayName: member.user?.displayName ?? null },
      contexts: [],
    };
    trainee.contexts.push({
      type: 'PRIVATE_COURSE',
      privateEnrollmentId: enrollment.id,
      name: privateCourse.name,
      sport: { id: privateCourse.sport.id, name: privateCourse.sport.name },
      status: enrollment.status,
    });
    byMember.set(member.userId, trainee);
  }
  return [...byMember.values()];
}

// Mọi học viên Coach phụ trách (lớp nhóm + khóa 1-1), có tên. Đi hết các trang vì ô chọn cần đủ danh sách.
export async function getCoachMembers(): Promise<TraineeMember[]> {
  const members: TraineeMember[] = [];
  for (let page = 1; ; page += 1) {
    const { data } = await apiClient.get<Paginated<CoachMemberListRow>>('/coaches/me/members', { params: { page, pageSize: 100 } });
    members.push(...data.items.map((row) => ({ id: row.id, memberCode: row.memberCode ?? `#${row.id}`, displayName: row.displayName })));
    if (data.items.length === 0 || page * data.pageSize >= data.total) return members;
  }
}

// Ngữ cảnh đánh giá của một học viên. /coaches/me/members chưa trả id lượt đăng ký lớp nên lấy từ hồ sơ học viên;
// backend đã lọc chỉ lớp/khóa của Coach đang đăng nhập. Lớp nhóm chỉ lấy lượt CONFIRMED (BR-46).
export async function getMemberContexts(memberId: number): Promise<AssessableContext[]> {
  const { data } = await apiClient.get<MemberProfileRow>(`/members/${memberId}`);
  return [
    ...data.classRegistrations
      .filter((registration) => registration.status === 'CONFIRMED')
      .map((registration): AssessableContext => ({
        type: 'GROUP_CLASS',
        classRegistrationId: registration.id,
        name: registration.class.name,
        sport: { name: registration.class.sport },
      })),
    ...data.privateEnrollments.map((enrollment): AssessableContext => ({
      type: 'PRIVATE_COURSE',
      privateEnrollmentId: enrollment.id,
      name: enrollment.course.name,
      sport: { name: enrollment.course.sport },
      status: enrollment.status,
    })),
  ];
}

// Một API tổng hợp thay cho chuỗi request Member → lớp → buổi → roster.
export async function getCoachSessions({ from, to }: { from: string; to: string }): Promise<CoachSession[]> {
  const { data } = await apiClient.get<CoachSession[]>('/coaches/me/sessions', { params: { from, to } });
  return data;
}
