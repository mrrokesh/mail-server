-- Docs, Meet, calendar, contacts, AI usage, compliance, SSO, and SCIM.
-- These rows used to live only in the API process.

CREATE TABLE IF NOT EXISTS documents (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  kind              TEXT NOT NULL CHECK (kind IN ('document', 'spreadsheet', 'presentation')),
  template          TEXT,
  version           INTEGER NOT NULL DEFAULT 1,
  size_bytes        BIGINT NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_rooms (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  host_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  passcode          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  calendar          TEXT NOT NULL CHECK (calendar IN ('personal', 'work', 'holidays')),
  title             TEXT NOT NULL,
  event_date        DATE NOT NULL,
  start_at          TEXT,
  end_at            TEXT,
  location          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS contacts (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  book              TEXT NOT NULL DEFAULT 'personal',
  name              TEXT NOT NULL,
  email             TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  role              TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ai_usage (
  organization_id   UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  usage_day         DATE NOT NULL,
  used              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS compliance_settings (
  organization_id   UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  archive_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  retention_days    INTEGER NOT NULL DEFAULT 365,
  cases_json        TEXT NOT NULL DEFAULT '[]',
  holds_json        TEXT NOT NULL DEFAULT '[]',
  journals_json     TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS sso_configs (
  organization_id   UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  protocol          TEXT NOT NULL CHECK (protocol IN ('saml', 'oidc')),
  issuer            TEXT NOT NULL,
  metadata_enc      TEXT NOT NULL,
  metadata_iv       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scim_tokens (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash        TEXT NOT NULL UNIQUE,
  label             TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scim_users (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_name         TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT TRUE
);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'documents', 'meeting_rooms', 'calendar_events', 'contacts', 'ai_usage',
    'compliance_settings', 'sso_configs', 'scim_tokens', 'scim_users'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mrrokesh_app') THEN
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO mrrokesh_app',
        tbl
      );
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (app_tenant_visible(organization_id)) WITH CHECK (app_tenant_visible(organization_id))',
      tbl
    );
  END LOOP;
END $$;
