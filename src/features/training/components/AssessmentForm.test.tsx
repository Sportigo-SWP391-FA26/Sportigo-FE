import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as api from '../api';
import { axiosError } from '../testing/axiosError';
import { renderWithProviders } from '../testing/renderWithProviders';
import type { AssessableSession, ProgressAssessment, TraineeMember } from '../types';
import { AssessmentForm } from './AssessmentForm';

vi.mock('../api');
const members: TraineeMember[] = [{ id: 3, memberCode: 'MEM-01', displayName: 'Trần Thị Bình' }];
const metric = { id: 11, sportId: 1, code: 'technique', name: 'Kỹ thuật bơi', unit: 'điểm', minValue: 0, maxValue: 100, direction: 'HIGHER_IS_BETTER' as const, isRequired: true, isActive: true, displayOrder: 1 };
const sessions: AssessableSession[] = [
  { type: 'GROUP_CLASS', id: 31, startsAt: '2026-11-03T11:00:00.000Z', endsAt: '2026-11-03T12:30:00.000Z', name: 'Bơi cơ bản', sport: { id: 1, name: 'Bơi lội' }, metricDefinitions: [metric], completedPlanItems: [] },
  { type: 'PRIVATE_COURSE', id: 42, sessionDate: '2026-11-04', startsAt: '2026-11-04T11:00:00.000Z', endsAt: '2026-11-04T12:30:00.000Z', name: 'Bơi 1-1', sport: { id: 1, name: 'Bơi lội' }, metricDefinitions: [metric], completedPlanItems: [{ id: 7, weekNumber: 1, sessionNumber: 1, itemOrder: 1, title: 'Nhịp thở', content: 'Thực hành nhịp thở', durationMinutes: 20, sets: null, repetitions: null, intensity: null, note: null }] },
];

function renderForm(onCreated = vi.fn()) {
  vi.mocked(api.getAssessableSessions).mockResolvedValue(sessions);
  renderWithProviders(<AssessmentForm members={members} onCreated={onCreated} onCancel={vi.fn()} />);
  return onCreated;
}
async function selectSession(label: RegExp) {
  fireEvent.change(screen.getByLabelText(/Học viên/), { target: { value: '3' } });
  const select = await screen.findByLabelText(/Buổi đã hoàn thành/);
  const option = screen.getByRole('option', { name: label }) as HTMLOptionElement;
  fireEvent.change(select, { target: { value: option.value } });
}

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('Form đánh giá theo buổi học Flow 4', () => {
  test('chỉ hiển thị các buổi backend xác nhận đủ điều kiện', async () => {
    renderForm();
    await selectSession(/Lớp nhóm · Bơi cơ bản/);
    expect(screen.getByRole('option', { name: /Khóa 1–1 · Bơi 1-1/ })).toBeInTheDocument();
    expect(api.getAssessableSessions).toHaveBeenCalledWith(3);
  });

  test('gửi session ID và metric definition, không gửi metric tự do', async () => {
    vi.mocked(api.createAssessment).mockResolvedValue({ id: 9 } as ProgressAssessment);
    const onCreated = renderForm();
    await selectSession(/Lớp nhóm · Bơi cơ bản/);
    fireEvent.change(screen.getByLabelText(/Kỹ thuật bơi/), { target: { value: '82' } });
    fireEvent.change(screen.getByLabelText(/Nhận xét/), { target: { value: 'Tiến bộ tốt.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));
    await waitFor(() => expect(api.createAssessment).toHaveBeenCalledWith(expect.objectContaining({ memberId: 3, classSessionId: 31, metricValues: [{ definitionId: 11, value: 82 }] })));
    expect(onCreated).toHaveBeenCalled();
  });

  test('khóa 1-1 cho phép ghi nhận mục giáo án hoàn thành trong cùng request', async () => {
    vi.mocked(api.createAssessment).mockResolvedValue({ id: 10 } as ProgressAssessment);
    renderForm();
    await selectSession(/Khóa 1–1 · Bơi 1-1/);
    fireEvent.change(screen.getByLabelText(/Kỹ thuật bơi/), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/Nhận xét/), { target: { value: 'Hoàn thành tốt.' } });
    fireEvent.click(screen.getByText(/Nhịp thở/).closest('label')!.querySelector('input')!);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));
    await waitFor(() => expect(api.createAssessment).toHaveBeenCalledWith(expect.objectContaining({ privateCourseAttendanceId: 42, completedWorkoutPlanItemIds: [7] })));
  });

  test('hiện lỗi nghiệp vụ từ backend', async () => {
    vi.mocked(api.createAssessment).mockRejectedValue(axiosError(403, { code: 'ASSESSMENT_CONTEXT_INVALID', message: 'Buổi học không thuộc Coach.' }));
    renderForm();
    await selectSession(/Lớp nhóm · Bơi cơ bản/);
    fireEvent.change(screen.getByLabelText(/Kỹ thuật bơi/), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/Nhận xét/), { target: { value: 'Nhận xét.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));
    expect(await screen.findByText('Buổi học không thuộc Coach.')).toBeInTheDocument();
  });
});
