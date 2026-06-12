// Shared constants used across API routes, UI and tests.
// Single source of truth - update here only.

// Multi-tenant identifiers (PoC fase: 1 tenant, 1 demo medewerker)
// TODO bij multi-tenant lancering: vervangen door waarden uit de auth-sessie.
export const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

// Geocoding
export const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
export const NOMINATIM_RATE_LIMIT_MS = 1100;
export const NOMINATIM_TIMEOUT_MS = 5000;
export const GEOCODE_COUNTRY = "nl";
export const NOMINATIM_USER_AGENT = "GreenSnap/1.0 (foto-rapportage app)";

// Photo upload
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// CSV bulk import
export const MAX_CSV_ROWS = 200;

// Storage buckets
export const PHOTOS_BUCKET = "photos";
export const SIGNED_URL_EXPIRY_SECONDS = 3600;

// Geo matching
export const MATCH_RADIUS_METERS = 150;
export const TIME_WINDOW_HOURS = 8;

// Geofence klokregistratie (enter/exit hysterese)
export const GEOFENCE_ENTER_METERS = 150;
export const GEOFENCE_EXIT_METERS = 300;

// Telegram-koppelcodes
export const LINK_CODE_LENGTH = 6;
export const LINK_CODE_TTL_HOURS = 24;

// Auth / sessions
export const PASSWORD_MIN_LENGTH = 8;
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Telegram
export const TELEGRAM_API_BASE = "https://api.telegram.org";

// Job statuses (single source)
export const JOB_STATUSES = [
  "open",
  "before_done",
  "photos_complete",
  "report_ready",
  "sent",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
