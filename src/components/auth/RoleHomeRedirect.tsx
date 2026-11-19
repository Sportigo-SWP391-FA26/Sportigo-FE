import { Navigate } from 'react-router-dom';
import { getSessionRole, roleHomePath } from './session';

export function RoleHomeRedirect() {
  const role = getSessionRole();
  return <Navigate to={role ? roleHomePath[role] : '/login'} replace />;
}
