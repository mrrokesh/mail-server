-- v2 module tables. Chat is MR Rokesh's own service (mrrokesh-chat).
-- Keep chat in this repository. Do not vendor another chat server.
-- Drive, tasks, notes, and booking are the v1 tables this migration persists.
-- Docs, Meet, calendar events, contacts, AI, compliance, and SSO stay in process memory.
-- Public lookups are SECURITY DEFINER so the app role can resolve a token before
-- it sets app.current_org_id. They are not HTTP endpoints.

CREATE TABLE IF NOT EXISTS drive_files (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  content_type      TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drive_shares (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_id           UUID NOT NULL REFERENCES drive_files(id) ON DELETE CASCADE,
  token             TEXT NOT NULL UNIQUE,
  password_hash     TEXT,
  expires_at        TIMESTAMPTZ,
  max_downloads     INTEGER,
  downloads         INTEGER NOT NULL DEFAULT 0,
  view_only         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  due_date          DATE,
  priority          TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
  done              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_pages (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  slug              CITEXT NOT NULL UNIQUE,
  duration_minutes  INTEGER NOT NULL,
  timezone          TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id                UUID PRIMARY KEY,
  page_id           UUID NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  start_at          TEXT NOT NULL,
  guest_name        TEXT NOT NULL,
  guest_email       CITEXT NOT NULL,
  UNIQUE (page_id, start_at)
);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL CHECK (kind IN ('direct', 'group', 'channel')),
  title             TEXT NOT NULL,
  created_by        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_members (
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  thread_root_id    UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  author_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body              TEXT NOT NULL,
  drive_file_id     UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages (organization_id, conversation_id, created_at);

CREATE TABLE IF NOT EXISTS masked_aliases (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  address           CITEXT NOT NULL UNIQUE,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  message_count     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_keys (
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address               TEXT NOT NULL,
  public_key_armored    TEXT NOT NULL,
  wrapped_private_key   TEXT NOT NULL,
  fingerprint           TEXT NOT NULL,
  recovery_registered   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id, address)
);

CREATE TABLE IF NOT EXISTS privacy_settings (
  organization_id   UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  addon_enabled     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS byok_keys (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version           SMALLINT NOT NULL CHECK (version > 0),
  kms_key_ref       TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('registered')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, version)
);

CREATE TABLE IF NOT EXISTS siem_destinations (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL CHECK (kind IN ('webhook', 'syslog')),
  target            TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attack_simulations (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('placeholder')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_settings (
  organization_id   UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  dedicated_ip      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS partner_brands (
  organization_id   UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  login_host        CITEXT NOT NULL UNIQUE,
  product_name      TEXT NOT NULL,
  logo_url          TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                  UUID PRIMARY KEY,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  subject             TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('draft')),
  unsubscribe_token   TEXT NOT NULL UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_suppressions (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  email             CITEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email)
);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'drive_files', 'drive_shares', 'tasks', 'notes', 'booking_pages', 'appointments',
    'chat_conversations', 'chat_members', 'chat_messages', 'masked_aliases', 'privacy_keys',
    'privacy_settings', 'byok_keys', 'siem_destinations', 'attack_simulations',
    'enterprise_settings', 'partner_brands', 'campaigns', 'campaign_suppressions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- FORCE ROW LEVEL SECURITY only when mrrokesh_app exists. Docker still forces it.
    -- A single managed login owns the tables and would be locked out by FORCE.
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

CREATE OR REPLACE FUNCTION app_v2_org_by_share_token(p_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id FROM drive_shares WHERE token = p_token
$$;

CREATE OR REPLACE FUNCTION app_v2_org_by_booking_slug(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id FROM booking_pages WHERE slug = p_slug::citext
$$;

CREATE OR REPLACE FUNCTION app_v2_org_by_brand_host(p_host text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id FROM partner_brands WHERE login_host = p_host::citext
$$;

CREATE OR REPLACE FUNCTION app_v2_org_by_alias_address(p_address text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id FROM masked_aliases WHERE address = p_address::citext
$$;

CREATE OR REPLACE FUNCTION app_v2_org_by_unsub_token(p_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id FROM campaigns WHERE unsubscribe_token = p_token
$$;

REVOKE ALL ON FUNCTION app_v2_org_by_share_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_v2_org_by_booking_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_v2_org_by_brand_host(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_v2_org_by_alias_address(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_v2_org_by_unsub_token(text) FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mrrokesh_app') THEN
    RETURN;
  END IF;
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_v2_org_by_share_token(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_v2_org_by_booking_slug(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_v2_org_by_brand_host(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_v2_org_by_alias_address(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_v2_org_by_unsub_token(text) TO mrrokesh_app';
END $$;
