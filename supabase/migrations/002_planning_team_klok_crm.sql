-- Migratie 002: dagplanning, teambeheer, klokregistratie, CRM-koppeling
-- Spec: docs/superpowers/specs/2026-06-12-planning-team-klok-crm-design.md

-- === users: Telegram-koppeling + soft-delete ===
ALTER TABLE users ADD COLUMN telegram_chat_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN link_code TEXT;
ALTER TABLE users ADD COLUMN link_code_expires_at TIMESTAMPTZ;

CREATE INDEX idx_users_telegram_chat ON users(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX idx_users_link_code ON users(link_code) WHERE link_code IS NOT NULL;

-- === jobs: route-volgorde + niet-toegewezen mogelijk ===
ALTER TABLE jobs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ALTER COLUMN user_id DROP NOT NULL;

-- === time_entries: klokregistratie ===
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  source TEXT NOT NULL CHECK (source IN ('manual_telegram', 'geofence_telegram', 'dashboard')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Max 1 lopende klok per medewerker (race-safe via partial unique index)
CREATE UNIQUE INDEX idx_one_running_clock ON time_entries(user_id) WHERE stopped_at IS NULL;
CREATE INDEX idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX idx_time_entries_job ON time_entries(job_id);
CREATE INDEX idx_time_entries_user_started ON time_entries(user_id, started_at);

-- === worker_locations: laatste live-locatie + geofence-state (DB-backed wegens serverless) ===
CREATE TABLE worker_locations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  near_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  prompted_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL
);

-- === clients: CRM-sync velden ===
ALTER TABLE clients ADD COLUMN external_id TEXT;
ALTER TABLE clients ADD COLUMN external_source TEXT;
ALTER TABLE clients ADD COLUMN email TEXT;
ALTER TABLE clients ADD COLUMN phone TEXT;

CREATE UNIQUE INDEX idx_clients_external ON clients(tenant_id, external_source, external_id)
  WHERE external_id IS NOT NULL;

-- === tenants: API-key voor inbound CRM-webhook ===
ALTER TABLE tenants ADD COLUMN integration_api_key TEXT UNIQUE;

-- === bugfix: bot schrijft source 'telegram', constraint stond alleen pwa/whatsapp toe ===
ALTER TABLE photos DROP CONSTRAINT photos_source_check;
ALTER TABLE photos ADD CONSTRAINT photos_source_check
  CHECK (source IN ('pwa', 'whatsapp', 'telegram'));

-- === RLS voor nieuwe tabellen (zelfde tenant-isolatie als bestaand) ===
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON time_entries
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY tenant_isolation ON worker_locations
  FOR ALL USING (tenant_id = get_user_tenant_id());
