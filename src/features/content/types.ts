export type SiteSetting = {
  id: number;
  hotline: string;
  openingHours: string;
  location: string;
  brandDescription: string;
  authPromotionTitle: string | null;
  authPromotionDescription: string | null;
};

export type LandingContentItem = {
  id: number;
  sortOrder: number;
  isActive: boolean;
};

export type LandingHeroSlide = LandingContentItem & {
  title: string;
  subtitle: string | null;
  imageUrl: string;
  sport: { id: number; name: string } | null;
};

export type LandingFacility = LandingContentItem & {
  name: string;
  description: string | null;
  imageUrl: string;
};

export type LandingPartner = LandingContentItem & {
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
};

export type FeaturedGroupClass = {
  id: number;
  name: string;
  capacity: number;
  tuitionFee: string | number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startDate: string;
  status: 'OPEN';
  sport: { id: number; name: string; imageUrl: string | null };
  coach: { user: { id: number; displayName: string; avatarUrl: string | null } };
  sessions: Array<{ id: number; startsAt: string; endsAt: string; room: { id: number; name: string } }>;
  _count: { registrations: number };
};

export type FeaturedPrivateCourse = {
  id: number;
  name: string;
  description: string | null;
  price: string | number;
  totalSessions: number;
  sport: { id: number; name: string; imageUrl: string | null };
  coaches: Array<{ coach: { user: { id: number; displayName: string; avatarUrl: string | null } } }>;
};

export type PublicLandingData = {
  heroSlides: LandingHeroSlide[];
  facilities: LandingFacility[];
  partners: LandingPartner[];
  settings: SiteSetting | null;
  stats: { activeMembers: number; sessionsThisWeek: number; activeCoaches: number; activeSports: number };
  featured: { groupClasses: FeaturedGroupClass[]; privateCourses: FeaturedPrivateCourse[] };
  coaches: Array<{
    userId: number;
    bio: string | null;
    user: { id: number; displayName: string; avatarUrl: string | null };
    coachSports: Array<{ sport: { id: number; name: string } }>;
  }>;
};

export type MemberHomeData = {
  profile: { id: number; displayName: string; avatarUrl: string | null };
  nextSession: MemberHomeSession | null;
  weekSchedule: MemberHomeSession[];
  recommendations: FeaturedGroupClass[];
  privateRecommendations?: FeaturedPrivateCourse[];
  activities: Array<{ id: string; type: 'NOTIFICATION' | 'PAYMENT'; title: string; description: string; occurredAt: string }>;
};

export type MemberHomeSession = {
  registrationId: number;
  classId: number;
  className: string;
  sport: { id: number; name: string; imageUrl: string | null };
  coach: { id: number; displayName: string; avatarUrl: string | null };
  sessionId: number;
  startsAt: string;
  endsAt: string;
  room: { id: number; name: string };
};

export type ManagerDashboardData = {
  activeMembers: number;
  newMembersThisMonth: number;
  classesToday: number;
  roomsInUse: number;
  totalRooms: number;
  roomsInMaintenance: number;
  monthlyRevenue: string | number;
  previousMonthRevenue: string | number;
  pendingRefunds: number;
  openSupportRequests: number;
  pendingOrders: number;
  classStatus: Record<string, number>;
  trend: Array<{ month: string; revenue: number; registrations: number }>;
  upcomingSessions: Array<{
    id: number;
    classId: number;
    className: string;
    startsAt: string;
    endsAt: string;
    sport: { id: number; name: string };
    coach: { id: number; displayName: string };
    room: { id: number; name: string };
  }>;
};
