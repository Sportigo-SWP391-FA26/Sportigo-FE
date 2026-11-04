import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  withCredentials: true,
  // Không để một request bị treo vô hạn khi Supabase hoặc Render đang khởi động.
  // 30 giây vẫn đủ cho cold start của Render Free.
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshRequest: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (error.response?.status !== 401 || request?._retry || request?.url?.includes('/auth/')) {
      return Promise.reject(error);
    }
    request._retry = true;
    refreshRequest ??= apiClient.post<{ accessToken: string }>('/auth/refresh')
      .then((response) => {
        localStorage.setItem('accessToken', response.data.accessToken);
        return response.data.accessToken;
      })
      .finally(() => { refreshRequest = null; });
    try {
      request.headers.Authorization = 'Bearer ' + await refreshRequest;
      return apiClient(request);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      return Promise.reject(refreshError);
    }
  },
);
