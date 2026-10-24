import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { AppLayout } from '../layouts/AppLayout';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { LandingPage } from '../features/landing/pages/LandingPage';
import { MemberLayout } from '../layouts/MemberLayout';
import { MemberHomePage } from '../features/member/pages/MemberHomePage';
import { ClassSchedulePage } from '../features/member/pages/ClassSchedulePage';
import { MemberPaymentsPage } from '../features/finance/pages/MemberPaymentsPage';
import { PaymentResultPage } from '../features/finance/pages/PaymentResultPage';
import { CashierPage } from '../features/finance/pages/CashierPage';
import { ManagerFinancePage } from '../features/finance/pages/ManagerFinancePage';
import { RequireRole } from '../components/auth/RequireRole';
import { MemberTrainingPlanPage } from '../features/training/pages/MemberTrainingPlanPage';
import { MemberProgressPage } from '../features/training/pages/MemberProgressPage';
import { CoachLayout } from '../layouts/CoachLayout';
import { AttendanceHistoryPage } from '../features/training/pages/AttendanceHistoryPage';
import { SessionAttendancePage } from '../features/training/pages/SessionAttendancePage';
import { WorkoutPlansPage } from '../features/training/pages/WorkoutPlansPage';
import { WorkoutPlanDetailPage } from '../features/training/pages/WorkoutPlanDetailPage';
import { EnrollmentPlansPage } from '../features/training/pages/EnrollmentPlansPage';
import { AssessmentsPage } from '../features/training/pages/AssessmentsPage';
import { NewAssessmentPage } from '../features/training/pages/NewAssessmentPage';
import { RoleHomeRedirect } from '../components/auth/RoleHomeRedirect';
import { ProfilePage } from '../features/profile/pages/ProfilePage';
import { UsersPage } from '../features/users/pages/UsersPage';
import { StaffPage } from '../features/staff/pages/StaffPage';
import { MemberSupportPage } from '../features/support/pages/MemberSupportPage';
import { MemberSupportDetailPage } from '../features/support/pages/MemberSupportDetailPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/app',
    element: <RequireRole roles={['CENTER_MANAGER', 'RECEPTIONIST']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <RoleHomeRedirect /> },
          {
            element: <RequireRole roles={['CENTER_MANAGER']} />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'revenue', element: <ManagerFinancePage view="revenue" /> },
              { path: 'operations-report', element: <ManagerFinancePage view="classes" /> },
              { path: 'promotions', element: <ManagerFinancePage view="promotions" /> },
              { path: 'refunds', element: <ManagerFinancePage view="refunds" /> },
              { path: 'audit-logs', element: <ManagerFinancePage view="audit" /> },
              // FR-07: chỉ Manager quản lý nhân sự
              { path: 'staff', element: <StaffPage /> },
              { path: ':section', element: <ComingSoonPage /> },
            ],
          },
          {
            element: <RequireRole roles={['CENTER_MANAGER', 'RECEPTIONIST']} />,
            children: [
              { path: 'cashier', element: <CashierPage /> },
              // Đặt ở khối Manager + Receptionist: khối chỉ-Manager có ':section' sẽ chặn Receptionist
              { path: 'profile', element: <ProfilePage /> },
              // FR-09: Manager và Receptionist cùng dùng, backend tự giới hạn Receptionist chỉ thấy Member
              { path: 'users', element: <UsersPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/member',
    element: <MemberLayout />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <MemberHomePage /> },
      { path: 'classes', element: <ClassSchedulePage /> },
      { path: 'payments', element: <MemberPaymentsPage /> },
      { path: 'payments/result', element: <PaymentResultPage /> },
      {
        element: <RequireRole roles={['MEMBER']} />,
        children: [
          { path: 'training-plan', element: <MemberTrainingPlanPage /> },
          { path: 'progress', element: <MemberProgressPage /> },
          { path: 'profile', element: <ProfilePage /> },
          // FR-55: yêu cầu hỗ trợ của Member
          { path: 'support', element: <MemberSupportPage /> },
          { path: 'support/:requestId', element: <MemberSupportDetailPage /> },
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
          { path: 'workout-plans', element: <WorkoutPlansPage /> },
          { path: 'workout-plans/:planId', element: <WorkoutPlanDetailPage /> },
          { path: 'private-enrollments/:enrollmentId/plans', element: <EnrollmentPlansPage /> },
          { path: 'assessments', element: <AssessmentsPage /> },
          { path: 'assessments/new', element: <NewAssessmentPage /> },
          { path: 'profile', element: <ProfilePage /> },
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
