export type TenantId = string;
export type UserId = string;

export interface Tenant {
  id: TenantId;
  name: string;
  logo_url: string | null;
  whatsapp_number: string | null;
  primary_color: string;
  created_at: string;
}

export type UserRole = "worker" | "owner";

export interface User {
  id: UserId;
  tenant_id: TenantId;
  name: string;
  phone: string;
  role: UserRole;
  telegram_chat_id: number | null;
  active: boolean;
  link_code: string | null;
  link_code_expires_at: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  tenant_id: TenantId;
  name: string;
  address: string;
  lat: number;
  lng: number;
  notes: string | null;
  external_id: string | null;
  external_source: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export type JobStatus = "open" | "before_done" | "photos_complete" | "report_ready" | "sent";

export interface Job {
  id: string;
  tenant_id: TenantId;
  client_id: string;
  user_id: UserId | null;
  status: JobStatus;
  scheduled_date: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
  client?: Client;
  photos?: Photo[];
}

export type TimeEntrySource = "manual_telegram" | "geofence_telegram" | "dashboard";

export interface TimeEntry {
  id: string;
  tenant_id: TenantId;
  job_id: string;
  user_id: UserId;
  started_at: string;
  stopped_at: string | null;
  source: TimeEntrySource;
  created_at: string;
}

export interface WorkerLocation {
  user_id: UserId;
  tenant_id: TenantId;
  lat: number;
  lng: number;
  updated_at: string;
  near_client_id: string | null;
  prompted_job_id: string | null;
}

export type PhotoType = "before" | "after";
export type PhotoSource = "pwa" | "whatsapp" | "telegram";

export interface Photo {
  id: string;
  job_id: string | null;
  tenant_id: TenantId;
  user_id: UserId;
  type: PhotoType;
  storage_path: string;
  lat: number | null;
  lng: number | null;
  caption: string | null;
  source: PhotoSource;
  matched: boolean;
  taken_at: string;
  created_at: string;
}

export interface Report {
  id: string;
  job_id: string;
  tenant_id: TenantId;
  pdf_path: string | null;
  share_url: string | null;
  sent_at: string | null;
  created_at: string;
}
