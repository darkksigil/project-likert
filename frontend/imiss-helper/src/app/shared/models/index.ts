// src/app/shared/models/index.ts

export type DutyStatus  = 'pending' | 'in_progress' | 'done' | 'endorsed' | 'failed';
export type ConcernType = 'hardware' | 'network' | 'system' | 'data' | 'other';
export type UserRole    = 'admin' | 'administrative' | 'hardware' | 'system' | 'data' | 'cybersecurity';

export interface DutyData {
  name:        string;
  department:  string;
  concern:     string;
  localNum:    string;
  concernType: ConcernType;
}

export interface Duty {
  id:              number;
  data:            DutyData;
  status:          DutyStatus;
  concern_type:    ConcernType;
  created_at:      string;
  updated_at:      string;
  created_by_name: string | null;
}

export interface CreateDutyPayload {
  name?:       string;
  department:  string;
  concern:     string;
  localNum?:   string;
  concernType: ConcernType;
}

export interface UpdateDutyPayload {
  name?:       string;
  department?: string;
  concern?:    string;
  localNum?:   string;
  concernType?: ConcernType;
}

export interface ActivityLog {
  id:         number;
  duty_id:    number;
  action:     string;       // 'status_change' | 'edit' | 'delete'
  from_value: string | null;
  to_value:   string | null;
  actor_name: string;
  actor_role: string;
  created_at: string;
}

export interface User {
  id:         number;
  username:   string;
  full_name:  string;
  role:       UserRole;
  is_active:  boolean;
  created_at: string;
}

export interface AuthUser {
  id:       number;
  username: string;
  role:     UserRole;
}

export interface Department {
  id:        number;
  code:      string;
  name:      string;
  grp:       string;
  is_active: boolean;
}

export const CONCERN_TYPE_LABELS: Record<ConcernType, string> = {
  hardware: 'Hardware',
  network:  'Network',
  system:   'System',
  data:     'Data',
  other:    'Other',
};

export const CONCERN_TYPE_COLORS: Record<ConcernType, string> = {
  hardware: '#F59E0B',
  network:  '#3B82F6',
  system:   '#8B5CF6',
  data:     '#10B981',
  other:    '#6B7280',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:          'Administrator',
  administrative: 'Administrative',
  hardware:       'Hardware',
  system:         'System',
  data:           'Data',
  cybersecurity:  'Cybersecurity',
};