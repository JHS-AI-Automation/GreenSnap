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
  created_at: string;
}

export type JobStatus = "open" | "before_done" | "photos_complete" | "report_ready" | "sent";

export interface Job {
  id: string;
  tenant_id: TenantId;
  client_id: string;
  user_id: UserId;
  status: JobStatus;
  scheduled_date: string;
  notes: string | null;
  created_at: string;
  client?: Client;
  photos?: Photo[];
}

export type PhotoType = "before" | "after";
export type PhotoSource = "pwa" | "whatsapp";

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
