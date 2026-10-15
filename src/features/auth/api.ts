import { apiClient } from '../../api/client';
import type { LoginInput, RegisterInput } from './schema';

type LoginResponse = {
  accessToken: string;
  user: { id: number; email: string; role: string };
};

type RegisterResponse = {
  message: string;
  email: string;
  emailSent: boolean;
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
  const response = await apiClient.post<RegisterResponse>('/auth/register', input)
  return response.data
}

export async function verifyEmail(email: string, code: string) {
  const response = await apiClient.post<{ message: string }>('/auth/verify-email', { email, code });
  return response.data;
}

export async function resendVerification(email: string) {
  const response = await apiClient.post<{ message: string }>('/auth/resend-verification', { email });
  return response.data;
}

export async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    localStorage.removeItem('accessToken');
  }
}
