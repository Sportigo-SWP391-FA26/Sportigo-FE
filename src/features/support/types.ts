export type SupportCategory = 'ACCOUNT' | 'PAYMENT' | 'CLASS' | 'PRIVATE_COURSE' | 'FACILITY' | 'OTHER';
export type SupportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SupportStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';

export type SupportPerson = { id: number; displayName: string; role: string };

// Khớp Sportigo-BE/src/modules/support/support.service.ts → toSummary / toDetail
export type SupportRequestSummary = {
  id: number;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  createdAt: string;
  resolvedAt: string | null;
  requester: SupportPerson;
  assignee: SupportPerson | null;
  messageCount: number;
};

export type SupportMessage = {
  id: number;
  content: string;
  isInternal: boolean;
  sentAt: string;
  sender: SupportPerson;
};

export type SupportRequestDetail = SupportRequestSummary & {
  description: string;
  messages: SupportMessage[];
};

export type SupportListQuery = { status?: SupportStatus; page: number; pageSize: number };

// FR-56: hàng đợi nhân viên có thêm bộ lọc
export type SupportQueueQuery = SupportListQuery & { priority?: SupportPriority; mine?: boolean; q?: string };

export type SupportAssignment = {
  id: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  note: string | null;
  assignedAt: string;
  unassignedAt: string | null;
  assignedTo: SupportPerson;
  assignedBy: SupportPerson;
};

// FR-56: chi tiết cho nhân viên có thêm lịch sử phân công
export type StaffSupportDetail = SupportRequestDetail & { history: SupportAssignment[] };

export type UpdateSupportInput = {
  assigneeId?: number;
  status?: 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  note?: string;
};

export type SupportListPage = {
  items: SupportRequestSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateSupportInput = {
  subject: string;
  category: SupportCategory;
  description: string;
  priority: SupportPriority;
};
