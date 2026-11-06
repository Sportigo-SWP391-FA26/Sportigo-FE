/* eslint-disable react-refresh/only-export-components -- route-level lazy modules are configuration, not Fast Refresh component exports */
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { MemberLayout } from '../layouts/MemberLayout';
import { RequireRole } from '../components/auth/RequireRole';
import { CoachLayout } from '../layouts/CoachLayout';
import { RoleHomeRedirect } from '../components/auth/RoleHomeRedirect';
import { getSessionRole } from '../components/auth/session';
import { LandingPage } from '../features/landing/pages/LandingPage';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const VerifyEmailPage = lazy(() => import('../features/auth/pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ComingSoonPage = lazy(() => import('../pages/ComingSoonPage').then((module) => ({ default: module.ComingSoonPage })));
const MemberHomePage = lazy(() => import('../features/member/pages/MemberHomePage').then((module) => ({ default: module.MemberHomePage })));
const WaitlistPage = lazy(() => import('../features/member/pages/WaitlistPage').then((module) => ({ default: module.WaitlistPage })));
const ClassSchedulePage = lazy(() => import('../features/member/pages/ClassSchedulePage').then((module) => ({ default: module.ClassSchedulePage })));
const GroupClassBookingDetailPage = lazy(() => import('../features/member/pages/GroupClassBookingDetailPage').then((module) => ({ default: module.GroupClassBookingDetailPage })));
const MemberPaymentsPage = lazy(() => import('../features/finance/pages/MemberPaymentsPage').then((module) => ({ default: module.MemberPaymentsPage })));
const PaymentResultPage = lazy(() => import('../features/finance/pages/PaymentResultPage').then((module) => ({ default: module.PaymentResultPage })));
const CashierPage = lazy(() => import('../features/finance/pages/CashierPage').then((module) => ({ default: module.CashierPage })));
const ManagerFinancePage = lazy(() => import('../features/finance/pages/ManagerFinancePage').then((module) => ({ default: module.ManagerFinancePage })));
const MemberTrainingPlanPage = lazy(() => import('../features/training/pages/MemberTrainingPlanPage').then((module) => ({ default: module.MemberTrainingPlanPage })));
const MemberProgressPage = lazy(() => import('../features/training/pages/MemberProgressPage').then((module) => ({ default: module.MemberProgressPage })));
const AttendanceHistoryPage = lazy(() => import('../features/training/pages/AttendanceHistoryPage').then((module) => ({ default: module.AttendanceHistoryPage })));
const SessionAttendancePage = lazy(() => import('../features/training/pages/SessionAttendancePage').then((module) => ({ default: module.SessionAttendancePage })));
const WorkoutPlansPage = lazy(() => import('../features/training/pages/WorkoutPlansPage').then((module) => ({ default: module.WorkoutPlansPage })));
const WorkoutPlanDetailPage = lazy(() => import('../features/training/pages/WorkoutPlanDetailPage').then((module) => ({ default: module.WorkoutPlanDetailPage })));
const PrivateEnrollmentsPage = lazy(() => import('../features/training/pages/PrivateEnrollmentsPage').then((module) => ({ default: module.PrivateEnrollmentsPage })));
const EnrollmentPlansPage = lazy(() => import('../features/training/pages/EnrollmentPlansPage').then((module) => ({ default: module.EnrollmentPlansPage })));
const AssessmentsPage = lazy(() => import('../features/training/pages/AssessmentsPage').then((module) => ({ default: module.AssessmentsPage })));
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const UsersPage = lazy(() => import('../features/users/pages/UsersPage').then((module) => ({ default: module.UsersPage })));
const MembersPage = lazy(() => import('../features/users/pages/UsersPage').then((module) => ({ default: module.MembersPage })));
const StaffPage = lazy(() => import('../features/staff/pages/StaffPage').then((module) => ({ default: module.StaffPage })));
const MemberSupportPage = lazy(() => import('../features/support/pages/MemberSupportPage').then((module) => ({ default: module.MemberSupportPage })));
const MemberSupportDetailPage = lazy(() => import('../features/support/pages/MemberSupportDetailPage').then((module) => ({ default: module.MemberSupportDetailPage })));
const SupportQueuePage = lazy(() => import('../features/support/pages/SupportQueuePage').then((module) => ({ default: module.SupportQueuePage })));
const StaffSupportDetailPage = lazy(() => import('../features/support/pages/StaffSupportDetailPage').then((module) => ({ default: module.StaffSupportDetailPage })));
const MemberDetailPage = lazy(() => import('../features/members/pages/MemberDetailPage').then((module) => ({ default: module.MemberDetailPage })));
const CoachMembersPage = lazy(() => import('../features/members/pages/CoachMembersPage').then((module) => ({ default: module.CoachMembersPage })));
const CoachManagementListPage = lazy(() => import('../features/coaches/pages/CoachManagementPage').then((module) => ({ default: module.CoachManagementListPage })));
const CoachManagementPage = lazy(() => import('../features/coaches/pages/CoachManagementPage').then((module) => ({ default: module.CoachManagementPage })));
const CoachOwnSchedulePage = lazy(() => import('../features/coaches/pages/CoachManagementPage').then((module) => ({ default: module.CoachOwnSchedulePage })));
const CoachAvailabilityPage = lazy(() => import('../features/coaches/pages/CoachAvailabilityPage').then((module) => ({ default: module.CoachAvailabilityPage })));
const ManagerAvailabilityPage = lazy(() => import('../features/coaches/pages/ManagerAvailabilityPage').then((module) => ({ default: module.ManagerAvailabilityPage })));
const GroupClassDetailPage = lazy(() => import('../features/group-classes/pages/GroupClassDetailPage').then((module) => ({ default: module.GroupClassDetailPage })));
const GroupClassesPage = lazy(() => import('../features/group-classes/pages/GroupClassesPage').then((module) => ({ default: module.GroupClassesPage })));
const MemberPrivateSchedulePage = lazy(() => import('../features/private-courses/pages/MemberPrivateSchedulePage').then((module) => ({ default: module.MemberPrivateSchedulePage })));
const PrivateCourseDetailPage = lazy(() => import('../features/private-courses/pages/PrivateCourseDetailPage').then((module) => ({ default: module.PrivateCourseDetailPage })));
const PrivateCoursesPage = lazy(() => import('../features/private-courses/pages/PrivateCoursesPage').then((module) => ({ default: module.PrivateCoursesPage })));
const RoomsManagementPage = lazy(() => import('../features/catalog/pages/RoomsManagementPage').then((module) => ({ default: module.RoomsManagementPage })));
const SportsManagementPage = lazy(() => import('../features/catalog/pages/SportsManagementPage').then((module) => ({ default: module.SportsManagementPage })));
const LandingContentPage = lazy(() => import('../features/content/pages/LandingContentPage').then((module) => ({ default: module.LandingContentPage })));

function WaitlistRouteLayout() {
  return getSessionRole() === 'CENTER_MANAGER' ? <AppLayout /> : <MemberLayout />;
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/waitlist',
    element: <RequireRole roles={['MEMBER', 'CENTER_MANAGER']} />,
    children: [
      {
        element: <WaitlistRouteLayout />,
        children: [{ index: true, element: <WaitlistPage /> }],
      },
    ],
  },
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
              { path: 'website-content', element: <LandingContentPage /> },
              // FR-07: chỉ Manager quản lý nhân sự
              { path: 'staff', element: <StaffPage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'coaches', element: <CoachManagementListPage /> },
              { path: 'coaches/:coachId', element: <CoachManagementPage /> },
              { path: 'coach-availability', element: <ManagerAvailabilityPage /> },
              { path: 'sports', element: <SportsManagementPage /> },
              { path: 'rooms', element: <RoomsManagementPage /> },
              { path: 'classes', element: <GroupClassesPage /> },
              { path: 'classes/:classId', element: <GroupClassDetailPage /> },
              { path: 'private-courses', element: <PrivateCoursesPage /> },
              { path: 'private-courses/:courseId', element: <PrivateCourseDetailPage /> },
              { path: ':section', element: <ComingSoonPage /> },
            ],
          },
          {
            element: <RequireRole roles={['CENTER_MANAGER', 'RECEPTIONIST']} />,
            children: [
              { path: 'cashier', element: <CashierPage /> },
              { path: 'class-bookings', element: <ClassSchedulePage receptionistMode /> },
              { path: 'class-bookings/:classId', element: <GroupClassBookingDetailPage /> },
              // Đặt ở khối Manager + Receptionist: khối chỉ-Manager có ':section' sẽ chặn Receptionist
              { path: 'profile', element: <ProfilePage /> },
              // FR-09: Manager và Receptionist cùng dùng, backend tự giới hạn Receptionist chỉ thấy Member
              { path: 'users', element: <UsersPage /> },
              // FR-56: hàng đợi hỗ trợ cho Receptionist và Manager
              { path: 'support', element: <SupportQueuePage /> },
              { path: 'support/:requestId', element: <StaffSupportDetailPage /> },
              // FR-10: hồ sơ tổng hợp hội viên (khối này để Receptionist cũng vào được)
              { path: 'members/:memberId', element: <MemberDetailPage backTo="/app/users" backLabel="Danh sách người dùng" /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/member',
    element: <RequireRole roles={['MEMBER']} />,
    children: [
      {
        element: <MemberLayout />,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: 'home', element: <MemberHomePage /> },
          { path: 'classes', element: <ClassSchedulePage /> },
          { path: 'classes/:classId', element: <GroupClassBookingDetailPage /> },
          { path: 'payments', element: <MemberPaymentsPage /> },
          { path: 'payments/result', element: <PaymentResultPage /> },
          { path: 'training-plan', element: <MemberTrainingPlanPage /> },
          { path: 'progress', element: <MemberProgressPage /> },
          { path: 'private-courses', element: <Navigate to="/member/classes?type=private" replace /> },
          { path: 'private-courses/:courseId', element: <PrivateCourseDetailPage /> },
          { path: 'my-schedule', element: <MemberPrivateSchedulePage /> },
          { path: 'profile', element: <ProfilePage /> },
          // FR-55: yêu cầu hỗ trợ của Member
          { path: 'support', element: <MemberSupportPage /> },
          { path: 'support/:requestId', element: <MemberSupportDetailPage /> },
          { path: ':section', element: <ComingSoonPage /> },
        ],
      },
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
          { path: 'schedule', element: <CoachOwnSchedulePage /> },
          { path: 'availability', element: <CoachAvailabilityPage /> },
          { path: 'sessions/:sessionId/attendance', element: <SessionAttendancePage /> },
          { path: 'workout-plans', element: <WorkoutPlansPage /> },
          { path: 'workout-plans/:planId', element: <WorkoutPlanDetailPage /> },
          { path: 'private-enrollments', element: <PrivateEnrollmentsPage /> },
          { path: 'private-enrollments/:enrollmentId/plans', element: <EnrollmentPlansPage /> },
          { path: 'assessments', element: <AssessmentsPage /> },
          { path: 'assessments/new', element: <AssessmentsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          // FR-11: học viên của Coach + hồ sơ tổng hợp (FR-10, backend tự giới hạn theo Coach)
          { path: 'members', element: <CoachMembersPage /> },
          { path: 'members/:memberId', element: <MemberDetailPage backTo="/coach/members" backLabel="Học viên của tôi" /> },
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
