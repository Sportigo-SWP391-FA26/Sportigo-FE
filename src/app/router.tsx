import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage';
import { AppLayout } from '../layouts/AppLayout';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { LandingPage } from '../features/landing/pages/LandingPage';
import { MemberLayout } from '../layouts/MemberLayout';
import { MemberHomePage } from '../features/member/pages/MemberHomePage';
import { ClassSchedulePage } from '../features/member/pages/ClassSchedulePage';
import { RequireRole } from '../components/auth/RequireRole';
import { MemberTrainingPlanPage } from '../features/training/pages/MemberTrainingPlanPage';
import { MemberProgressPage } from '../features/training/pages/MemberProgressPage';
import { CoachLayout } from '../layouts/CoachLayout';
import { AttendanceHistoryPage } from '../features/training/pages/AttendanceHistoryPage';
import { SessionAttendancePage } from '../features/training/pages/SessionAttendancePage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: ':section', element: <ComingSoonPage /> },
    ],
  },
  {
    path: '/member',
    element: <MemberLayout />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <MemberHomePage /> },
      { path: 'classes', element: <ClassSchedulePage /> },
      {
        element: <RequireRole roles={['MEMBER']} />,
        children: [
          { path: 'training-plan', element: <MemberTrainingPlanPage /> },
          { path: 'progress', element: <MemberProgressPage /> },
        ],
      },
      { path: ':section', element: <ComingSoonPage /> },
    ],
  },
  {
    path: '/coach',
    element: <RequireRole roles={['COACH']} />,
    children: [
      {
        element: <CoachLayout />,
        children: [
          { index: true, element: <Navigate to="attendance" replace /> },
          { path: 'attendance', element: <AttendanceHistoryPage scope="coach" /> },
          { path: 'sessions/:sessionId/attendance', element: <SessionAttendancePage /> },
        ],
      },
    ],
  },
  {
    path: '/manager',
    element: <RequireRole roles={['CENTER_MANAGER']} />,
    children: [
      {
        element: <AppLayout />,
        children: [{ path: 'attendance', element: <AttendanceHistoryPage scope="manager" /> }],
      },
    ],
  },
  { path: '/dashboard', element: <Navigate to="/app/dashboard" replace /> },
]);
