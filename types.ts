
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
