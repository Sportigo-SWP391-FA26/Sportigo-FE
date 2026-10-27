import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as api from '../api';
import { addDays, todayInCenter } from '../format';
import { axiosError } from '../testing/axiosError';
import { renderWithProviders } from '../testing/renderWithProviders';
import type { ProgressAssessment, Trainee } from '../types';
import { AssessmentForm } from './AssessmentForm';

vi.mock('../api');

const swim = { id: 1, name: 'Bơi lội' };
const trainees: Trainee[] = [
  {
    member: { id: 3, memberCode: 'MEM-01', displayName: 'Trần Thị Bình' },
    contexts: [
      { type: 'GROUP_CLASS', classRegistrationId: 31, name: 'Bơi cơ bản', sport: swim },
      { type: 'PRIVATE_COURSE', privateEnrollmentId: 15, name: 'Bơi 1-1 – 12 buổi', sport: swim, status: 'ACTIVE' },
    ],
  },
  {
    member: { id: 4, memberCode: 'MEM-02', displayName: 'Phạm Minh Đức' },
    contexts: [{ type: 'GROUP_CLASS', classRegistrationId: 40, name: 'Cầu lông nâng cao', sport: { id: 2, name: 'Cầu lông' } }],
  },
];

function renderForm(onCreated = vi.fn()) {
  renderWithProviders(<AssessmentForm trainees={trainees} onCreated={onCreated} onCancel={vi.fn()} />);
  return onCreated;
}

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/Nhận xét/), { target: { value: 'Kỹ thuật thở tiến bộ rõ.' } });
  fireEvent.change(screen.getByLabelText('Tên chỉ số 1'), { target: { value: 'Kỹ thuật (1–10)' } });
  fireEvent.change(screen.getByLabelText('Giá trị chỉ số 1'), { target: { value: '8' } });
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Form đánh giá tiến độ (FR-52, BR-46)', () => {
  test('chỉ liệt kê ngữ cảnh của học viên đã chọn', () => {
    renderForm();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Học viên/), { target: { value: '3' } });
    expect(screen.getByRole('radio', { name: /Bơi cơ bản/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Bơi 1-1/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Cầu lông nâng cao/ })).not.toBeInTheDocument();
  });

  test('chỉ chọn và gửi đúng MỘT ngữ cảnh', async () => {
    vi.mocked(api.createAssessment).mockResolvedValue({ id: 9, member: trainees[0].member } as ProgressAssessment);
    const onCreated = renderForm();

    fireEvent.change(screen.getByLabelText(/Học viên/), { target: { value: '3' } });
    const group = screen.getByRole('radio', { name: /Bơi cơ bản/ });
    const privateCourse = screen.getByRole('radio', { name: /Bơi 1-1/ });
    fireEvent.click(group);
    fireEvent.click(privateCourse);
    expect(group).not.toBeChecked();
    expect(privateCourse).toBeChecked();

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));

    await waitFor(() => expect(api.createAssessment).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.createAssessment).mock.calls[0][0];
    expect(payload).toEqual({
      memberId: 3,
      privateEnrollmentId: 15,
      assessmentDate: todayInCenter(),
      coachComment: 'Kỹ thuật thở tiến bộ rõ.',
      metrics: { 'Kỹ thuật (1–10)': 8 },
    });
    expect(payload).not.toHaveProperty('classRegistrationId');
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  test('đổi học viên thì bỏ ngữ cảnh đã chọn và bắt chọn lại', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Học viên/), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('radio', { name: /Bơi cơ bản/ }));
    fireEvent.change(screen.getByLabelText(/Học viên/), { target: { value: '4' } });
    expect(screen.getByRole('radio', { name: /Cầu lông nâng cao/ })).not.toBeChecked();

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));
    expect(await screen.findByText('Vui lòng chọn đúng một ngữ cảnh đánh giá')).toBeInTheDocument();
    expect(api.createAssessment).not.toHaveBeenCalled();
  });

  test('không cho chọn ngày đánh giá ở tương lai', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Học viên/), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('radio', { name: /Bơi cơ bản/ }));
    fillRequired();
    const date = screen.getByLabelText(/^Ngày đánh giá\s*\*?$/);
    expect(date).toHaveAttribute('max', todayInCenter());
    fireEvent.change(date, { target: { value: addDays(todayInCenter(), 1) } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));
    expect(await screen.findByText('Ngày đánh giá không được ở tương lai')).toBeInTheDocument();
    expect(api.createAssessment).not.toHaveBeenCalled();
  });

  test('403 ASSESSMENT_CONTEXT_INVALID hiện tại ô ngữ cảnh', async () => {
    vi.mocked(api.createAssessment).mockRejectedValue(
      axiosError(403, {
        code: 'ASSESSMENT_CONTEXT_INVALID',
        message: 'Coach không phụ trách học viên hoặc ngữ cảnh đánh giá không hợp lệ.',
      }),
    );
    renderForm();
    fireEvent.change(screen.getByLabelText(/Học viên/), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('radio', { name: /Bơi cơ bản/ }));
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));

    const messages = await screen.findAllByText('Coach không phụ trách học viên hoặc ngữ cảnh đánh giá không hợp lệ.');
    expect(messages.some((element) => element.id.endsWith('-context-error'))).toBe(true);
  });
});
