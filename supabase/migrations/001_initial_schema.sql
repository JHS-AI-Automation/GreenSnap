-- GreenSnap initial schema
-- Multi-tenant before/after photo reporting for green services companies

-- Tenants (green services companies)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  whatsapp_number TEXT,
  primary_color TEXT DEFAULT '#16a34a',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (workers + owners)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('worker', 'owner')),
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_phone ON users(phone);

-- Clients (end customers of the green services company)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_location ON clients(lat, lng);

-- Jobs (visits/assignments)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'before_done', 'photos_complete', 'report_ready', 'sent')),
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_jobs_date ON jobs(scheduled_date);
CREATE INDEX idx_jobs_user ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('before', 'after')),
  storage_path TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  caption TEXT,
  source TEXT NOT NULL DEFAULT 'pwa' CHECK (source IN ('pwa', 'whatsapp')),
  matched BOOLEAN NOT NULL DEFAULT false,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_photos_job ON photos(job_id);
CREATE INDEX idx_photos_tenant ON photos(tenant_id);
CREATE INDEX idx_photos_user_date ON photos(user_id, taken_at);
CREATE INDEX idx_photos_unmatched ON photos(matched) WHERE matched = false;

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pdf_path TEXT,
  share_url TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_job ON reports(job_id);

-- Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see data from their own tenant
-- These use a helper function to get the current user's tenant_id

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY tenant_isolation ON tenants
  FOR ALL USING (id = get_user_tenant_id());

CREATE POLICY tenant_isolation ON users
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY tenant_isolation ON clients
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY tenant_isolation ON jobs
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY tenant_isolation ON photos
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY tenant_isolation ON reports
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

CREATE POLICY photo_upload ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');

CREATE POLICY photo_read ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
