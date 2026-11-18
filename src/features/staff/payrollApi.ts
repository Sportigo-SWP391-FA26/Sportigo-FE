import { apiClient } from '../../api/client';

export type PayrollEntry = {
  id: number;
  staffId: number;
  staffName: string;
  staffCode: string | null;
  role: string;
  baseSalary: string;
  scheduledUnits: number;
  absentUnits: number;
  absenceDeduction: string;
  makeupCredit: string;
  allowanceTotal: string;
  deductionTotal: string;
  netAmount: string;
  lineItems: { name: string; kind: string; amount: number }[];
  reviewIssues: string[];
};
export type PayrollPeriod = {
  month: string;
  status: 'DRAFT' | 'APPROVED';
  entries: PayrollEntry[];
};
export type PayrollCompensation = {
  id: number;
  baseSalary: string;
  effectiveFromMonth: string;
  effectiveToMonth: string | null;
};
export type PayrollRecurringItem = {
  id: number;
  name: string;
  kind: 'ALLOWANCE' | 'DEDUCTION';
  amount: string;
  effectiveFromMonth: string;
  effectiveToMonth: string | null;
  isActive: boolean;
};

export const payrollApi = {
  period: async (month: string) =>
    (await apiClient.get<PayrollPeriod>(`/payroll/periods/${month}`)).data,
  build: async (month: string) =>
    (await apiClient.post<PayrollPeriod>(`/payroll/periods/${month}/build`))
      .data,
  approve: async (month: string) =>
    (await apiClient.post(`/payroll/periods/${month}/approve`)).data,
  compensations: async (staffId: number) =>
    (
      await apiClient.get<PayrollCompensation[]>(
        `/payroll/compensations/${staffId}`,
      )
    ).data,
  setCompensation: async (
    staffId: number,
    baseSalary: number,
    effectiveFromMonth: string,
    effectiveToMonth?: string | null,
  ) =>
    (
      await apiClient.put(`/payroll/compensations/${staffId}`, {
        baseSalary,
        effectiveFromMonth,
        effectiveToMonth,
      })
    ).data,
  recurring: async (staffId: number) =>
    (
      await apiClient.get<PayrollRecurringItem[]>(
        `/payroll/recurring-items/${staffId}`,
      )
    ).data,
  createRecurring: async (
    staffId: number,
    input: {
      name: string;
      kind: 'ALLOWANCE' | 'DEDUCTION';
      amount: number;
      effectiveFromMonth: string;
      effectiveToMonth?: string | null;
    },
  ) =>
    (await apiClient.post(`/payroll/recurring-items/${staffId}`, input)).data,
  updateRecurring: async (
    id: number,
    input: { effectiveToMonth?: string | null; isActive?: boolean },
  ) => (await apiClient.patch(`/payroll/recurring-items/${id}`, input)).data,
  myPayslips: async () =>
    (
      await apiClient.get<(PayrollEntry & { period: { month: string } })[]>(
        '/payroll/me/payslips',
      )
    ).data,
  myPerformance: async () =>
    (
      await apiClient.get<{
        from: string;
        to: string;
        performance: Record<string, string | number | null> | null;
      }>('/payroll/me/performance')
    ).data,
  export: async (url: string, filename: string) => {
    const { data } = await apiClient.get<Blob>(url, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  },
};
