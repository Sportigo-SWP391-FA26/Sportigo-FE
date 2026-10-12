export type AppRole = 'CENTER_MANAGER' | 'COACH' | 'MEMBER' | 'RECEPTIONIST';

// Tạm đọc role từ payload JWT cho tới khi backend có GET /api/auth/me (FR-04).
// Chỉ dùng để điều hướng giao diện; backend vẫn kiểm tra quyền ở mọi API (BR-06).
export function getSessionRole(): AppRole | null {
  let token: string | null;
  try {
    token = localStorage.getItem('accessToken');
  } catch {
    return null;
  }
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof claims.role === 'string' ? (claims.role as AppRole) : null;
  } catch {
    return null;
  }
}

export const roleHomePath: Record<AppRole, string> = {
  CENTER_MANAGER: '/app/dashboard',
  COACH: '/coach/attendance',
  MEMBER: '/member/home',
  RECEPTIONIST: '/',
};
