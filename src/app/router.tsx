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
import { MemberPaymentsPage } from '../features/finance/pages/MemberPaymentsPage';
import { PaymentResultPage } from '../features/finance/pages/PaymentResultPage';
import { CashierPage } from '../features/finance/pages/CashierPage';
import { ManagerFinancePage } from '../features/finance/pages/ManagerFinancePage';

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
      { path: 'cashier', element: <CashierPage /> },
      { path: 'revenue', element: <ManagerFinancePage view="revenue" /> },
      { path: 'promotions', element: <ManagerFinancePage view="promotions" /> },
      { path: 'refunds', element: <ManagerFinancePage view="refunds" /> },
      { path: 'audit-logs', element: <ManagerFinancePage view="audit" /> },
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
      { path: 'payments', element: <MemberPaymentsPage /> },
      { path: 'payments/result', element: <PaymentResultPage /> },
      { path: ':section', element: <ComingSoonPage /> },
    ],
  },
  { path: '/dashboard', element: <Navigate to="/app/dashboard" replace /> },
]);
