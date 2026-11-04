export type Sport = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
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
};

export type RoomInput = {
  code?: string;
  name: string;
  capacity: number;
  location?: string | null;
  status: RoomStatus;
};
