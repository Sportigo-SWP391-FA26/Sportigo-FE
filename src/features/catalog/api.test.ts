import { afterEach, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import { createRoom, createSport, getRooms, getSports, updateRoom, updateSport } from './api';

afterEach(() => vi.restoreAllMocks());

test('uses the sports API contract and response wrapper', async () => {
  const rows = [{ id: 1, name: 'Bơi', description: null, imageUrl: null, isActive: true }];
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: rows } });
  expect(await getSports()).toEqual(rows);
  expect(get).toHaveBeenCalledWith('/sports');

  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: rows[0] } });
  const sportInput = { name: 'Bơi', isActive: true };
  await createSport(sportInput);
  expect(post).toHaveBeenCalledWith('/sports', sportInput);

  const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { success: true, data: rows[0] } });
  await updateSport(1, { isActive: false });
  expect(put).toHaveBeenCalledWith('/sports/1', { isActive: false });

});

test('uses the rooms API contract and response wrapper', async () => {
  const rows = [{ id: 5, code: 'R-01', name: 'Phòng 1', capacity: 20, location: null, status: 'AVAILABLE' as const }];
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: rows } });
  expect(await getRooms()).toEqual(rows);
  expect(get).toHaveBeenCalledWith('/rooms');

  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: rows[0] } });
  const roomInput = { code: 'R-01', name: 'Phòng 1', capacity: 20, status: 'AVAILABLE' as const };
  await createRoom(roomInput);
  expect(post).toHaveBeenCalledWith('/rooms', roomInput);

  const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { success: true, data: rows[0] } });
  await updateRoom(5, { status: 'MAINTENANCE' });
  expect(put).toHaveBeenCalledWith('/rooms/5', { status: 'MAINTENANCE' });

});
