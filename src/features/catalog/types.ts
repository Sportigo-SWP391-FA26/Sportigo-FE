export type Sport = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  passingScore?: string | number | null;
};

export type RoomStatus = 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE';

export type Room = {
  id: number;
  code: string;
  name: string;
  capacity: number;
  location: string | null;
  status: RoomStatus;
};

export type SportInput = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  passingScore?: number | null;
};

export type AssessmentMetric = {
  id: number; sportId: number; code: string; name: string; unit: string;
  minValue: string | number; maxValue: string | number;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
  isRequired: boolean; isActive: boolean; displayOrder: number;
};
export type AssessmentMetricInput = Omit<AssessmentMetric, 'id' | 'sportId'>;

export type RoomInput = {
  code?: string;
  name: string;
  capacity: number;
  location?: string | null;
  status: RoomStatus;
};
