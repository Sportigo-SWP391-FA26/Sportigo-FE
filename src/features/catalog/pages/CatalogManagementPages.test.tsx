import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import * as api from '../api';
import { RoomsManagementPage } from './RoomsManagementPage';
import { SportsManagementPage } from './SportsManagementPage';

vi.mock('../api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('shows an explicit empty state for sports', async () => {
  vi.mocked(api.getSports).mockResolvedValue([]);
  renderWithProviders(<SportsManagementPage />);
  expect(await screen.findByText('Chưa có bộ môn')).toBeInTheDocument();
});

test('creates a sport using backend fields and updates active state', async () => {
  vi.mocked(api.getSports).mockResolvedValue([{ id: 1, name: 'Bơi', description: null, imageUrl: null, isActive: true }]);
  vi.mocked(api.createSport).mockResolvedValue({ id: 2, name: 'Yoga', description: null, imageUrl: null, isActive: true });
  vi.mocked(api.updateSport).mockResolvedValue({ id: 1, name: 'Bơi', description: null, imageUrl: null, isActive: false });
  renderWithProviders(<SportsManagementPage />);
  await screen.findByText('Bơi');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm bộ môn' }));
  const dialog = screen.getByRole('dialog', { name: 'Thêm bộ môn' });
  fireEvent.change(within(dialog).getByLabelText(/Tên bộ môn/), { target: { value: 'Yoga' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu bộ môn' }));
  await waitFor(() => expect(api.createSport).toHaveBeenCalledWith({
    name: 'Yoga', description: null, imageUrl: null, isActive: true,
  }));
  await screen.findByRole('button', { name: 'Ngừng' });
  fireEvent.click(screen.getByRole('button', { name: 'Ngừng' }));
  await waitFor(() => expect(api.updateSport).toHaveBeenCalledWith(1, { isActive: false }));
});

test('shows an explicit empty state for rooms and validates positive capacity', async () => {
  vi.mocked(api.getRooms).mockResolvedValue([]);
  renderWithProviders(<RoomsManagementPage />);
  expect(await screen.findByText('Chưa có phòng tập')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thêm phòng' }));
  const dialog = screen.getByRole('dialog', { name: 'Thêm phòng' });
  fireEvent.change(within(dialog).getByLabelText(/Mã phòng/), { target: { value: 'A-01' } });
  fireEvent.change(within(dialog).getByLabelText(/Tên phòng/), { target: { value: 'Phòng A' } });
  fireEvent.change(within(dialog).getByLabelText(/Sức chứa/), { target: { value: '0' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu phòng' }));
  expect(await within(dialog).findByText('Sức chứa phải là số nguyên dương.')).toBeInTheDocument();
  expect(api.createRoom).not.toHaveBeenCalled();
});
