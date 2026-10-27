export type PublicClassFilters = {
  sportId?: number;
  coachId?: number;
  date?: string;
  page: number;
  limit: number;
};

export type PublicGroupClass = {
  id: number;
  sportId: number;
  coachId: number;
  name: string;
  description: string | null;
  capacity: number;
  tuitionFee: string | number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startDate: string;
  endDate: string;
  status: 'OPEN';
  sport: { id: number; name: string; isActive: boolean };
  coach: { user: { id: number; displayName: string } };
  _count: { registrations: number };
};

export type PublicClassPage = {
  data: PublicGroupClass[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type PublicClassDetail = PublicGroupClass & {
  confirmedCount: number;
  remainingSeats: number;
  sessions: Array<{
    id: number;
    startsAt: string;
    endsAt: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    note: string | null;
    room: { id: number; code: string; name: string; location: string | null } | null;
  }>;
};

export type ClassRegistrationOrder = {
  orderId: number;
  orderNumber: string;
  amount: string | number;
  expiresAt: string;
  registrationId: number;
  status: 'PENDING_PAYMENT';
};

export type WaitlistEntry = {
  id: number;
  memberId: number;
  classId: number;
  status: 'WAITING' | 'OFFERED' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
  joinedAt: string;
  offeredAt: string | null;
  offerExpiresAt: string | null;
};
