-- Seed data for development/demo
-- Run this after the migration to get a working demo environment

-- Demo tenant: "GroenWerk Hengelo"
INSERT INTO tenants (id, name, logo_url, primary_color) VALUES
  ('11111111-1111-1111-1111-111111111111', 'GroenWerk Hengelo', NULL, '#16a34a');

-- Demo users
INSERT INTO users (id, tenant_id, name, phone, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Jan de Vries', '+31612345678', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Piet Bakker', '+31687654321', 'worker'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Kees Jansen', '+31611223344', 'worker');

-- Demo clients (addresses in Hengelo area)
INSERT INTO clients (id, tenant_id, name, address, lat, lng) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Fam. Smit', 'Brinkstraat 15, Hengelo', 52.2660, 6.7930),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Kantoor De Brinck', 'Marktstraat 8, Hengelo', 52.2650, 6.7920),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'Fam. De Groot', 'Deldenerstraat 42, Hengelo', 52.2640, 6.7890);

-- Demo jobs for today
INSERT INTO jobs (id, tenant_id, client_id, user_id, status, scheduled_date) VALUES
  ('aaa11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'open', CURRENT_DATE),
  ('bbb22222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'open', CURRENT_DATE),
  ('ccc33333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'open', CURRENT_DATE);
