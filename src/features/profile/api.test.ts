import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../api/client';
import { changePassword } from './api';

vi.mock('../../api/client', () => ({ apiClient: { put: vi.fn() } }));

afterEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

describe('changePassword (FR-62)', () => {
  test('gọi PUT /users/me/password và thay access token đang lưu', async () => {
    localStorage.setItem('accessToken', 'old-token');
    vi.mocked(apiClient.put).mockResolvedValue({ data: { message: 'ok', accessToken: 'new-token' } });
    const input = { currentPassword: 'oldpass123', newPassword: 'newpass123', confirmPassword: 'newpass123' };

    const result = await changePassword(input);

    expect(apiClient.put).toHaveBeenCalledWith('/users/me/password', input);
    expect(localStorage.getItem('accessToken')).toBe('new-token');
    expect(result).toEqual({ message: 'ok', accessToken: 'new-token' });
  });

  test('lỗi thì giữ nguyên token cũ', async () => {
    localStorage.setItem('accessToken', 'old-token');
    vi.mocked(apiClient.put).mockRejectedValue(new Error('400'));

    await expect(changePassword({ currentPassword: 'x', newPassword: 'newpass123', confirmPassword: 'newpass123' })).rejects.toThrow();
    expect(localStorage.getItem('accessToken')).toBe('old-token');
  });
});
