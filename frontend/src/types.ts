export type UserRole = 'DELIVERY' | 'RECIPIENT' | 'GUARD' | 'ADMIN';

export type ParcelStatus = 'PENDING' | 'COLLECTED' | 'EXPIRED';

export interface Campus {
  id: string;
  name: string;
  code: string;
  location: string;
  kioskStation: string;
  totalLockers: number;
  activeParcels: number;
  totalParcels: number;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  cloudRegion?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  roomNumber?: string;
  room_number?: string;
  campus_id?: string;
  campusId?: string;
  emailConfirmed?: boolean;
}

export interface Parcel {
  id: string;
  tracking_code: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_room?: string;
  recipient_campus?: string;
  dropped_by_name?: string;
  image_key: string;
  imageUrl?: string;
  status: ParcelStatus;
  otp_attempts: number;
  reminder_count: number;
  last_reminded_at?: string;
  collected_at?: string;
  verified_by_name?: string;
  notes?: string;
  carrier?: string;
  campus_id?: string;
  locker_number?: string;
  locker_size?: 'SMALL' | 'MEDIUM' | 'LARGE' | string;
  package_condition?: 'INTACT' | 'SLIGHT_DAMAGE' | 'HEAVILY_DAMAGED' | string;
  otp_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  parcel_id?: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: UserRole;
  tracking_code?: string;
  action: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export interface OutboxItem {
  id: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_email: string;
  room_number?: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface DashboardMetrics {
  total: number;
  pending: number;
  collected: number;
  expired: number;
  stale: number;
  dropped_today: number;
}
