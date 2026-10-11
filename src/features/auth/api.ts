import { apiClient } from '../../api/client';
import type { LoginInput, RegisterInput } from './schema';

type LoginResponse = {
  accessToken: string;
  user: { id: number; email: string; role: string };
};

export async function login(input: LoginInput) {
  const response = await apiClient.post<LoginResponse>('/auth/login', {
    identifier: input.identifier,
    password: input.password,
  });
  localStorage.setItem('accessToken', response.data.accessToken);
  return response.data;
}

export async function registerMember(input: RegisterInput) {
  const response = await apiClient.post('/auth/register', input)
  return response.data
}
