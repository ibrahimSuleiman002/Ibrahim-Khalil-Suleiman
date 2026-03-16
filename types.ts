
export enum UserRole {
  RIDER = 'RIDER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN'
}

export enum RideType {
  SHARED = 'SHARED',
  PRIVATE = 'PRIVATE'
}

export enum RideStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  ACCEPTED = 'ACCEPTED',
  ARRIVING = 'ARRIVING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  vehicleType?: string;
  plateNumber?: string;
  nin?: string;
  plateNumberImage?: string;
  vehicleDocument?: string;
  isDriverVerified?: boolean;
}

export interface Keke {
  id: string;
  plateNumber: string;
  color: string;
  ownerId: string;
}

export interface RideRequest {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: Location;
  destination: Location;
  type: RideType;
  baseFare: number;
  negotiatedFare?: number;
  seatsOccupied: number;
  status: RideStatus;
  createdAt: number;
}

export interface RideHistoryItem {
  id: string;
  date: string;
  price: number;
  pickup: string;
  destination: string;
  partnerName: string; // Driver name for Rider, Rider name for Driver
  partnerAvatar?: string;
  status: RideStatus.COMPLETED;
}
