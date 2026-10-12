import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from '../feedback/toast';
import { getSessionRole, roleHomePath, type AppRole } from './session';

function ForbiddenRedirect({ to }: { to: string }) {
  useEffect(() => {
    toast('Bạn không có quyền truy cập trang này.', 'error');
  }, []);
  return <Navigate to={to} replace />;
}

// Route guard phía giao diện: chưa đăng nhập thì về /login, sai role thì về trang của role đó.
export function RequireRole({ roles }: { roles: AppRole[] }) {
  const location = useLocation();
  const role = getSessionRole();

  if (!role) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(role)) return <ForbiddenRedirect to={roleHomePath[role] ?? '/'} />;
  return <Outlet />;
}
