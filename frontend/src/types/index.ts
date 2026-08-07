export type Role = "ADMIN" | "COORDINATOR" | "VOLUNTEER";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  volunteerId?: string;
}

export interface ProgramArea {
  id: string;
  name: string;
  description?: string;
}

export interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
  programAreaId?: string;
  programArea?: ProgramArea;
}

export interface Shift {
  id: string;
  title: string;
  description?: string;
  programAreaId: string;
  programArea?: ProgramArea;
  location: string;
  startTime: string;
  endTime: string;
  capacity: number;
  requiresBackgroundCheck: boolean;
  confirmedCount?: number;
  waitlistedCount?: number;
}

export interface BookShiftResponse {
  status: "CONFIRMED" | "WAITLISTED" | "REDIRECTED";
  redirectUrl?: string;
  message: string;
}

export interface BackgroundCheck {
  id: string;
  volunteerId: string;
  provider: string;
  referenceNumber: string;
  status: "PENDING" | "CLEARED" | "EXPIRED" | "REJECTED";
  requestedAt: string;
  issuedAt?: string;
  expiresAt?: string;
  notes?: string;
}

export interface RetentionPoint {
  month: string;
  retentionRate: number;
  activeVolunteers: number;
}

export interface RetentionSeries {
  programArea: string;
  monthly: RetentionPoint[];
}

export interface NoShowRow {
  programArea: string;
  attended: number;
  noShow: number;
  totalScheduled: number;
  noShowRate: number;
}

export interface DashboardSummary {
  upcomingShifts: number;
  activeVolunteers: number;
  pendingChecks: number;
  expiringChecks: number;
}
