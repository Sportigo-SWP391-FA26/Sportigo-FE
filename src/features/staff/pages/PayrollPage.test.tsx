import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../training/testing/renderWithProviders';
import { PayrollPage } from './PayrollPage';
import { payrollApi } from '../payrollApi';
import * as staffApi from '../api';

vi.mock('../payrollApi', () => ({ payrollApi: { period: vi.fn(), compensations: vi.fn(), recurring: vi.fn() } }));
vi.mock('../api', () => ({ getStaffPerformance: vi.fn() }));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('Manager payroll', () => {
  test('shows unresolved attendance and blocks approval', async () => {
    vi.mocked(payrollApi.period).mockResolvedValue({ month: '2026-10', status: 'DRAFT', entries: [{ id: 1, staffId: 7, staffName: 'Coach Lan', staffCode: 'COACH-07', role: 'COACH', baseSalary: '6000000', scheduledUnits: 20, absentUnits: 1, absenceDeduction: '300000', makeupCredit: '0', allowanceTotal: '0', deductionTotal: '0', netAmount: '5700000', lineItems: [], reviewIssues: ['Buổi nhóm #42 chưa hoàn tất điểm danh'] }] });
    vi.mocked(staffApi.getStaffPerformance).mockResolvedValue({ from: '2026-11-01', to: '2026-11-18', totals: { groupSessionsHeld: 0, privateSessions: 0, supportResolved: 0, cashCollected: 0, membersCreated: 0 }, coaches: [], receptionists: [] });
    renderWithProviders(<PayrollPage />, { path: '/app/payroll', route: '/app/payroll' });
    expect(await screen.findByText('Coach Lan')).toBeInTheDocument();
    expect(screen.getByText(/Buổi nhóm #42 chưa hoàn tất điểm danh/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duyệt kỳ lương' })).toBeDisabled();
  });
});
