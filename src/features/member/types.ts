export type ClassType = 'GROUP' | 'PRIVATE';
export type ClassStatus = 'AVAILABLE' | 'ALMOST_FULL' | 'FULL' | 'REGISTERED';

export type MemberProfile = {
  id: string;
  name: string;
  avatar: string;
};

export type ClassSchedule = {
  id: string;
  title: string;
  sport: string;
  type: ClassType;
  status: ClassStatus;
  date: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  room: string;
  coach: string;
  image: string;
  capacity: number;
  booked: number;
};

export type CoachAvailability = {
  id: string;
  name: string;
  sport: string;
  avatar: string;
  rating: number;
  nextAvailable: string;
};

export type RecentActivity = {
  id: string;
  type: 'PAYMENT' | 'REMINDER';
  title: string;
  description: string;
  time: string;
};
