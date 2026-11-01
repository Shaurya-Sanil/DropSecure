import { User, Parcel, AuditLog, OutboxItem, DashboardMetrics, Campus } from '../types';

const API_BASE = '/api';

export const tokenStorage = {
  get: () => localStorage.getItem('dropsecure_token'),
  set: (token: string) => localStorage.setItem('dropsecure_token', token),
  clear: () => localStorage.removeItem('dropsecure_token'),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getCurrentUser: () => request<{ user: User }>('/auth/me'),

  getDemoUsers: () => request<{ users: User[] }>('/auth/demo-users'),

  confirmEmailSubscription: () =>
    request<{ message: string }>('/auth/confirm-email', { method: 'POST' }),

  // Users
  getRecipients: (campusId?: string) => {
    const qs = campusId && campusId !== 'ALL' ? `?campusId=${encodeURIComponent(campusId)}` : '';
    return request<{ recipients: User[] }>(`/users/recipients${qs}`);
  },

  createStudent: (studentData: {
    name: string;
    email: string;
    phone?: string;
    roomNumber?: string;
    campusId: string;
  }) =>
    request<{ message: string; student: User }>('/users/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    }),

  deleteStudent: (id: string) =>
    request<{ message: string }>(`/users/students/${id}`, {
      method: 'DELETE',
    }),

  // Parcels
  getUploadUrl: (fileName: string, mimeType: string) =>
    request<{ uploadUrl: string; imageKey: string; expiresIn: number }>('/parcels/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, mimeType }),
    }),

  uploadPhotoBinary: async (uploadUrl: string, file: Blob, mimeType: string) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Failed to upload photo to storage (${res.status})`);
    }
    return true;
  },

  createParcel: (parcelData: {
    recipientId: string;
    imageKey: string;
    notes?: string;
    carrier?: string;
    campusId?: string;
    lockerNumber?: string;
    lockerSize?: string;
    packageCondition?: string;
  }) =>
    request<{ message: string; parcel: Parcel }>('/parcels', {
      method: 'POST',
      body: JSON.stringify(parcelData),
    }),

  lookupParcel: (code: string) =>
    request<{ parcel: Parcel }>(`/parcels/lookup/${encodeURIComponent(code)}`),

  getKioskPending: (campusId?: string) => {
    const qs = campusId ? `?campusId=${encodeURIComponent(campusId)}` : '';
    return request<{ pendingParcels: Parcel[] }>(`/parcels/kiosk/pending${qs}`);
  },

  getCampuses: () => request<{ campuses: Campus[] }>('/parcels/campuses'),

  verifyOtp: (payload: { parcelId?: string; trackingCode?: string; otp: string }) =>
    request<{ message: string; parcel: Parcel }>('/parcels/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getParcels: (params?: { my_drops?: boolean; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.my_drops) query.set('my_drops', 'true');
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return request<{ parcels: Parcel[] }>(`/parcels${qs ? `?${qs}` : ''}`);
  },

  getParcelById: (id: string) => request<{ parcel: Parcel }>(`/parcels/${id}`),

  // Stats & Dashboard
  getDashboardStats: (campusId?: string) => {
    const qs = campusId && campusId !== 'ALL' ? `?campusId=${encodeURIComponent(campusId)}` : '';
    return request<{ metrics: DashboardMetrics; recentAudit: AuditLog[] }>(`/stats/dashboard${qs}`);
  },

  getAuditLogs: (limit = 50, campusId?: string) => {
    const qs = new URLSearchParams();
    qs.set('limit', String(limit));
    if (campusId && campusId !== 'ALL') qs.set('campusId', campusId);
    return request<{ auditLogs: AuditLog[] }>(`/stats/audit-logs?${qs.toString()}`);
  },

  getOutbox: (campusId?: string) => {
    const qs = campusId && campusId !== 'ALL' ? `?campusId=${encodeURIComponent(campusId)}` : '';
    return request<{ outbox: OutboxItem[] }>(`/stats/outbox${qs}`);
  },

  triggerSweepNow: () =>
    request<{ message: string; remindedCount: number }>('/stats/sweep-now', {
      method: 'POST',
    }),
};
