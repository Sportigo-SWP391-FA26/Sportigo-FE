import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { loginAs } from '../../users/testing/session';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { axiosError } from '../../training/testing/axiosError';
import * as coachApi from '../api';
import * as trainingApi from '../../training/api';
import * as profileApi from '../../profile/api';
import { CoachManagementPage, CoachOwnSchedulePage } from './CoachManagementPage';

vi.mock('../api');
vi.mock('../../training/api');
vi.mock('../../profile/api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});

function setupManagerPage() {
  loginAs('CENTER_MANAGER');
  vi.mocked(coachApi.getCoaches).mockResolvedValue([{
    id: 8,
    email: 'coach@sportigo.vn',
    phone: null,
    displayName: 'Coach An',
    role: 'COACH',
    status: 'ACTIVE',
    emailVerified: true,
    staffCode: 'COA-08',
    hiredAt: null,
    bio: null,
    coachStatus: 'ACTIVE',
    createdAt: '2029-01-01T00:00:00.000Z',
  }]);
  vi.mocked(coachApi.getCoachSports).mockResolvedValue([]);
  vi.mocked(coachApi.getCoachAvailability).mockResolvedValue([]);
  vi.mocked(coachApi.getCoachSchedule).mockResolvedValue([]);
  vi.mocked(trainingApi.getSports).mockResolvedValue([{ id: 2, name: 'Bơi lội', isActive: true }]);
  return renderWithProviders(<CoachManagementPage />, { path: '/app/coaches/:coachId', route: '/app/coaches/8' });
}

test('validates and saves Coach availability with the API contract fields', async () => {
  setupManagerPage();
  await screen.findByText('Môn chuyên môn');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm khung giờ' }));
  const dialog = screen.getByRole('dialog', { name: 'Thêm availability' });
  fireEvent.change(within(dialog).getByLabelText(/Thứ trong tuần/), { target: { value: '2' } });
  fireEvent.change(within(dialog).getByLabelText(/Giờ bắt đầu/), { target: { value: '09:00' } });
  fireEvent.change(within(dialog).getByLabelText(/Giờ kết thúc/), { target: { value: '09:00' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Thêm khung giờ' }));
  expect(await within(dialog).findByText('Giờ kết thúc phải sau giờ bắt đầu.')).toBeInTheDocument();
  expect(coachApi.createCoachAvailability).not.toHaveBeenCalled();

  fireEvent.change(within(dialog).getByLabelText(/Giờ kết thúc/), { target: { value: '11:00' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Thêm khung giờ' }));
  await waitFor(() => expect(coachApi.createCoachAvailability).toHaveBeenCalledWith(
    8,
    expect.objectContaining({ dayOfWeek: 2, startTime: '09:00', endTime: '11:00' }),
  ));
});

test('preserves availability form values when the backend reports an overlapping time slot', async () => {
  setupManagerPage();
  vi.mocked(coachApi.createCoachAvailability).mockRejectedValue(
    axiosError(409, { code: 'AVAILABILITY_CONFLICT', message: 'Khoảng thời gian khả dụng bị chồng chéo với lịch đã tồn tại.' }),
  );
  await screen.findByText('Môn chuyên môn');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm khung giờ' }));
  const dialog = screen.getByRole('dialog', { name: 'Thêm availability' });
  fireEvent.change(within(dialog).getByLabelText(/Thứ trong tuần/), { target: { value: '2' } });
  fireEvent.change(within(dialog).getByLabelText(/Giờ bắt đầu/), { target: { value: '09:00' } });
  fireEvent.change(within(dialog).getByLabelText(/Giờ kết thúc/), { target: { value: '11:00' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Thêm khung giờ' }));

  expect(await within(dialog).findByText('Khoảng thời gian khả dụng bị chồng chéo với lịch đã tồn tại.')).toBeInTheDocument();
  expect(within(dialog).getByLabelText(/Giờ bắt đầu/)).toHaveValue('09:00');
  expect(within(dialog).getByLabelText(/Giờ kết thúc/)).toHaveValue('11:00');
});

test('the Coach self-service schedule is view-only', async () => {
  loginAs('COACH');
  vi.mocked(profileApi.getMyProfile).mockResolvedValue({
    id: 8,
    email: 'coach@sportigo.vn',
    phone: null,
    displayName: 'Coach An',
    role: 'COACH',
    status: 'ACTIVE',
    emailVerifiedAt: null,
    createdAt: '2029-01-01T00:00:00.000Z',
    member: null,
    coach: { coachCode: 'COA-08', bio: null, hiredAt: null },
  });
  vi.mocked(coachApi.getCoachSports).mockResolvedValue([]);
  vi.mocked(coachApi.getCoachAvailability).mockResolvedValue([]);
  vi.mocked(coachApi.getCoachSchedule).mockResolvedValue([]);
  vi.mocked(trainingApi.getSports).mockResolvedValue([]);
  renderWithProviders(<CoachOwnSchedulePage />);
  expect(await screen.findByText('Lịch dạy của tôi')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Thêm khung giờ' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Gán môn' })).not.toBeInTheDocument();
});
