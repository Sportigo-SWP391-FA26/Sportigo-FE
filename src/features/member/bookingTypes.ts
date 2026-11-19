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
  sport: { id: number; name: string; imageUrl?: string | null; isActive: boolean };
  coach: { user: { id: number; displayName: string; avatarUrl?: string | null } };
  _count: { registrations: number };
};

export type PublicClassPage = {
  data: PublicGroupClass[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type PublicClassDetail = Omit<PublicGroupClass, 'coach'> & {
  coach: {
    coachCode?: string;
    bio?: string | null;
    status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
    hiredAt?: string | null;
    user: { id: number; displayName: string; avatarUrl?: string | null };
    coachSports?: Array<{ sport: { id: number; name: string } }>;
  };
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

export type MyClassRegistration = {
  id: number;
  memberId: number;
  classId: number;
  status: 'PENDING_PAYMENT' | 'CONFIRMED';
  registeredAt: string;
  price: string | number;
  groupClass: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    sport: { id: number; name: string; imageUrl: string | null };
    coach: { user: { id: number; displayName: string; avatarUrl: string | null } };
    sessions: Array<{
      id: number;
      startsAt: string;
      endsAt: string;
      status: 'SCHEDULED';
      room: { id: number; code: string; name: string } | null;
    }>;
  };
  order: {
    id: number;
    orderNumber: string;
    status: string;
    finalAmount: string | number;
    expiresAt: string | null;
  } | null;
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

export type WaitlistInvitationStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_EXPIRED'
  | 'FULFILLED';

export type WaitlistInvitation = {
  id: number;
  waitlistId: number;
  status: WaitlistInvitationStatus;
  offeredAt: string;
  expiresAt: string;
  respondedAt: string | null;
  orderId: number | null;
  failureReason: string | null;
  order: {
    id: number;
    orderNumber: string;
    status: string;
    expiresAt: string | null;
    payments: Array<{ id: number; status: string; amount: string | number; paidAt: string | null }>;
  } | null;
};

export type WaitlistRecord = WaitlistEntry & {
  groupClass: { id: number; name: string; status: string; capacity: number };
  invitations: WaitlistInvitation[];
  member?: { user: { id: number; displayName: string; email: string } };
};

export type WaitlistPage = {
  items: WaitlistRecord[];
  page: number;
  limit: number;
  total: number;
};

export type WaitlistFilters = {
  page: number;
  limit: number;
  classId?: number;
  status?: WaitlistEntry['status'];
};

export type WaitlistHistory = Omit<
  Pick<
    WaitlistRecord,
    'id' | 'memberId' | 'classId' | 'status' | 'joinedAt' | 'offeredAt' | 'offerExpiresAt' | 'invitations' | 'member'
  >,
  'member'
> & {
  groupClass: { id: number; name: string; status: string };
  member: { user: { id: number; displayName: string; email: string } };
};

export type WaitlistResponse = {
  waitlist: WaitlistEntry;
  order: {
    id: number;
    orderNumber: string;
    status: string;
    finalAmount: string | number;
    expiresAt: string | null;
  } | null;
  registration?: {
    id: number;
    memberId: number;
    classId: number;
    status: 'PENDING_PAYMENT';
    registeredAt: string;
    price: string | number;
  };
};
