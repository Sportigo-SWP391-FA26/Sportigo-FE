import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { axiosError } from '../../training/testing/axiosError';
import * as coachApi from '../../coaches/api';
import * as catalogApi from '../../catalog/api';
import * as api from '../api';
import { GroupClassesPage } from './GroupClassesPage';

vi.mock('../api');
vi.mock('../../coaches/api');
vi.mock('../../catalog/api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('shows an explicit empty state when the manager has no group classes', async () => {
  vi.mocked(api.getGroupClasses).mockResolvedValue([]);
  renderWithProviders(<GroupClassesPage />);
  expect(await screen.findByText('Chưa có lớp nhóm')).toBeInTheDocument();
});

test('shows and retries API errors instead of showing an empty list', async () => {
  vi.mocked(api.getGroupClasses)
    .mockRejectedValueOnce(axiosError(500, { message: 'Máy chủ chưa sẵn sàng.' }))
    .mockRejectedValueOnce(axiosError(500, { message: 'Máy chủ chưa sẵn sàng.' }))
    .mockResolvedValueOnce([]);
  renderWithProviders(<GroupClassesPage />);
  expect(await screen.findByText('Không tải được dữ liệu', {}, { timeout: 4000 })).toBeInTheDocument();
  screen.getByRole('button', { name: 'Thử lại' }).click();
  expect(await screen.findByText('Chưa có lớp nhóm')).toBeInTheDocument();
});

test('creates a draft using active sport and coach data without sending a status', async () => {
  vi.mocked(api.getGroupClasses).mockResolvedValue([]);
  vi.mocked(api.createGroupClass).mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof api.createGroupClass>>);
  vi.mocked(catalogApi.getSports).mockResolvedValue([
    { id: 2, name: 'Cầu lông', description: null, imageUrl: null, isActive: true },
    { id: 4, name: 'Ngừng hoạt động', description: null, imageUrl: null, isActive: false },
  ]);
  vi.mocked(coachApi.getQualifiedCoaches).mockResolvedValue([{
    id: 8, displayName: 'Coach An', avatarUrl: null, coachCode: 'COA-08', bio: null, status: 'ACTIVE',
    sports: [{ id: 2, name: 'Cầu lông', isActive: true }],
  }]);
  renderWithProviders(<GroupClassesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tạo lớp nhóm' }));
  const dialog = screen.getByRole('dialog', { name: 'Tạo lớp nhóm' });
  await within(dialog).findByRole('option', { name: 'Cầu lông' });
  fireEvent.change(within(dialog).getByLabelText(/Môn thể thao/), { target: { value: '2' } });
  await waitFor(() => expect(coachApi.getQualifiedCoaches).toHaveBeenCalledWith(2));
  await within(dialog).findByRole('option', { name: /Coach An/ });
  fireEvent.change(within(dialog).getByLabelText(/Coach/), { target: { value: '8' } });
  fireEvent.change(within(dialog).getByLabelText(/Tên lớp/), { target: { value: 'Lớp cầu lông mới' } });
  fireEvent.change(within(dialog).getByLabelText(/Sức chứa/), { target: { value: '10' } });
  fireEvent.change(within(dialog).getByLabelText(/Học phí/), { target: { value: '500000' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo bản nháp' }));
  await waitFor(() => expect(api.createGroupClass).toHaveBeenCalledWith(expect.objectContaining({
    sportId: 2,
    coachId: 8,
    name: 'Lớp cầu lông mới',
    capacity: 10,
    tuitionFee: 500000,
  })));
  expect(vi.mocked(api.createGroupClass).mock.calls[0]?.[0]).not.toHaveProperty('status');
  expect(within(dialog).queryByRole('option', { name: 'Ngừng hoạt động' })).not.toBeInTheDocument();
});
