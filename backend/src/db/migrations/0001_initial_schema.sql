-- Control-plane schema for MR Rokesh Mail.
-- Adapted from prompts/blueprints/master-blueprint.md:
--   * plan_tier is free | starter | business | business_plus | enterprise (PROJECT_BRIEF).
--   * org_role matches the product roles (owner, billing, user admin, helpdesk, security,
--     compliance, read-only, member).
--   * subscription_status adds read_only for the dunning path.
--   * Extra tables: password resets, GST invoices, checkouts, app passwords, sending counters.
--   * RLS hides rows when app.current_org_id is unset, instead of casting '' to uuid.
--   * Login, refresh, reset, checkout, passkey, slug, and domain lookups are SECURITY DEFINER
--     functions. They are the only intended RLS bypasses, and they are not HTTP endpoints.
--   * The API should connect as mrrokesh_app (NOBYPASSRLS). A superuser bypasses FORCE RLS.
--   * A managed login that cannot CREATE ROLE skips mrrokesh_app. RLS stays enabled, but
--     FORCE is left off so that table owner can still read and write. That owner bypass
--     is a managed-database limitation. Local Docker still creates the role and forces RLS.
-- USD prices are 0 until international billing (v2). SAC on invoices is chosen in application code.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mrrokesh_app') THEN
    BEGIN
      CREATE ROLE mrrokesh_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE LOGIN;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'mrrokesh_app was not created (%). The table owner bypasses row-level security.', SQLERRM;
    END;
  END IF;
END $$;

CREATE TYPE plan_tier AS ENUM ('free', 'starter', 'business', 'business_plus', 'enterprise');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'read_only', 'canceled', 'suspended'
);
CREATE TYPE org_role AS ENUM (
  'owner', 'billing_admin', 'user_admin', 'helpdesk',
  'security_admin', 'compliance_admin', 'read_only', 'member'
);
CREATE TYPE mailbox_kind AS ENUM ('user', 'shared', 'room_resource', 'equipment_resource');

CREATE TABLE subscription_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier                plan_tier UNIQUE NOT NULL,
  display_name        TEXT NOT NULL,
  price_inr_monthly   INTEGER NOT NULL,
  price_inr_annual    INTEGER NOT NULL,
  price_usd_monthly   INTEGER NOT NULL,
  price_usd_annual    INTEGER NOT NULL,
  storage_gb_per_seat INTEGER NOT NULL,
  is_storage_pooled   BOOLEAN NOT NULL DEFAULT FALSE,
  max_domains         INTEGER NOT NULL,
  max_aliases_per_box INTEGER NOT NULL,
  entitlements        JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  slug                   CITEXT UNIQUE NOT NULL,
  stalwart_tenant_id     TEXT UNIQUE NOT NULL,
  data_residency_region  TEXT NOT NULL DEFAULT 'ap-south-1',
  enforce_mfa            BOOLEAN NOT NULL DEFAULT FALSE,
  sso_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  sso_config_enc         BYTEA,
  sso_config_iv          BYTEA,
  kms_key_version        SMALLINT NOT NULL DEFAULT 1,
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'suspended', 'pending_deletion')),
  sending_paused         BOOLEAN NOT NULL DEFAULT FALSE,
  gstin                  TEXT,
  place_of_supply        TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE org_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                UUID NOT NULL REFERENCES subscription_plans(id),
  status                 subscription_status NOT NULL DEFAULT 'active',
  cycle                  billing_cycle NOT NULL DEFAULT 'annual',
  currency               TEXT NOT NULL CHECK (currency IN ('INR', 'USD')),
  seat_limit             INTEGER NOT NULL CHECK (seat_limit > 0),
  extra_storage_gb       INTEGER NOT NULL DEFAULT 0,
  dedicated_ip_addon     BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_pack_addon  BOOLEAN NOT NULL DEFAULT FALSE,
  payment_gateway        TEXT NOT NULL CHECK (payment_gateway IN ('razorpay', 'stripe')),
  gateway_customer_id    TEXT,
  gateway_sub_id         TEXT UNIQUE,
  current_period_start   TIMESTAMPTZ NOT NULL,
  current_period_end     TIMESTAMPTZ NOT NULL,
  paid_at                TIMESTAMPTZ,
  limit_overrides        JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email                  CITEXT NOT NULL,
  full_name              TEXT NOT NULL,
  role                   org_role NOT NULL DEFAULT 'member',
  password_hash          TEXT NOT NULL,
  pepper_version         SMALLINT NOT NULL DEFAULT 1,
  totp_secret_enc        BYTEA,
  totp_secret_iv         BYTEA,
  mfa_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at             TIMESTAMPTZ,
  last_login_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE refresh_tokens (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash             TEXT UNIQUE NOT NULL,
  family_id              UUID NOT NULL,
  device_label           TEXT,
  platform               TEXT CHECK (platform IS NULL OR platform IN ('web', 'android', 'ios')),
  ip_address             INET,
  expires_at             TIMESTAMPTZ NOT NULL,
  revoked_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webauthn_passkeys (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credential_id          TEXT UNIQUE NOT NULL,
  public_key             BYTEA NOT NULL,
  sign_count             BIGINT NOT NULL DEFAULT 0,
  transports             TEXT[],
  label                  TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE domains (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_name            CITEXT UNIQUE NOT NULL,
  verification_txt       TEXT NOT NULL,
  is_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  mx_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  spf_verified           BOOLEAN NOT NULL DEFAULT FALSE,
  dkim_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  dmarc_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  mta_sts_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  dane_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  bimi_svg_url           TEXT,
  deliverability_score   SMALLINT NOT NULL DEFAULT 0 CHECK (deliverability_score BETWEEN 0 AND 100),
  catch_all_mailbox_id   UUID,
  last_dns_checked_at    TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE domain_dkim_keys (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id              UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  selector               TEXT NOT NULL,
  algorithm              TEXT NOT NULL CHECK (algorithm IN ('rsa-2048', 'ed25519')),
  public_key_dns         TEXT NOT NULL,
  private_key_enc        BYTEA NOT NULL,
  private_key_iv         BYTEA NOT NULL,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  rotate_after           TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain_id, selector)
);

CREATE TABLE mailboxes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_id                UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
  user_id                  UUID REFERENCES users(id) ON DELETE SET NULL,
  kind                     mailbox_kind NOT NULL DEFAULT 'user',
  address                  CITEXT UNIQUE NOT NULL,
  stalwart_principal_id    TEXT UNIQUE NOT NULL,
  quota_bytes              BIGINT NOT NULL,
  used_bytes               BIGINT NOT NULL DEFAULT 0,
  zero_access_pgp_pub      TEXT,
  zero_access_pgp_priv_enc BYTEA,
  archive_auto_expand      BOOLEAN NOT NULL DEFAULT FALSE,
  litigation_hold_until    TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE domains
  ADD CONSTRAINT fk_catch_all_mailbox
  FOREIGN KEY (catch_all_mailbox_id) REFERENCES mailboxes(id) ON DELETE SET NULL;

CREATE TABLE mailbox_aliases (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mailbox_id             UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  domain_id              UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  alias_address          CITEXT UNIQUE NOT NULL,
  is_disposable_masked   BOOLEAN NOT NULL DEFAULT FALSE,
  label                  TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mailbox_delegations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mailbox_id             UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  delegate_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_read               BOOLEAN NOT NULL DEFAULT TRUE,
  can_send_as            BOOLEAN NOT NULL DEFAULT FALSE,
  can_send_on_behalf     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mailbox_id, delegate_user_id)
);

CREATE TABLE transport_rules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  priority               INTEGER NOT NULL DEFAULT 100,
  direction              TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  conditions_json        JSONB NOT NULL,
  actions_json           JSONB NOT NULL,
  compiled_sieve         TEXT NOT NULL,
  is_enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE migration_jobs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_mailbox_id      UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  source_provider        TEXT NOT NULL CHECK (source_provider IN ('imap', 'google_workspace', 'microsoft_365')),
  source_credentials_enc BYTEA NOT NULL,
  source_credentials_iv  BYTEA NOT NULL,
  status                 TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  messages_total         INTEGER NOT NULL DEFAULT 0,
  messages_migrated      INTEGER NOT NULL DEFAULT 0,
  last_error_code        TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id             UUID NOT NULL,
  action                 TEXT NOT NULL,
  target_type            TEXT NOT NULL,
  target_id              UUID,
  ip_address             INET,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash             TEXT UNIQUE NOT NULL,
  expires_at             TIMESTAMPTZ NOT NULL,
  used_at                TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billing_checkouts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tier                   plan_tier NOT NULL,
  cycle                  billing_cycle NOT NULL,
  seats                  INTEGER NOT NULL CHECK (seats > 0),
  amount_paise           INTEGER NOT NULL CHECK (amount_paise >= 0),
  gstin                  TEXT,
  place_of_supply        TEXT NOT NULL,
  status                 TEXT NOT NULL CHECK (status IN ('created', 'paid', 'failed')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gst_invoices (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  checkout_id            UUID NOT NULL REFERENCES billing_checkouts(id),
  invoice_number         TEXT NOT NULL UNIQUE,
  gstin                  TEXT,
  place_of_supply        TEXT NOT NULL,
  taxable_paise          INTEGER NOT NULL,
  cgst_paise             INTEGER NOT NULL,
  sgst_paise             INTEGER NOT NULL,
  igst_paise             INTEGER NOT NULL,
  total_paise            INTEGER NOT NULL,
  sac_code               TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_passwords (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mailbox_id             UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label                  TEXT NOT NULL,
  password_hash          TEXT NOT NULL,
  pepper_version         SMALLINT NOT NULL,
  revoked_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sending_daily (
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day                    DATE NOT NULL,
  messages_sent          INTEGER NOT NULL DEFAULT 0,
  recipients_total       INTEGER NOT NULL DEFAULT 0,
  recipients_external    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, user_id, day)
);

CREATE TABLE sending_minute (
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minute_bucket          TEXT NOT NULL,
  messages_sent          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, user_id, minute_bucket)
);

CREATE INDEX idx_audit_org_created ON audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_mailboxes_org ON mailboxes (organization_id);
CREATE INDEX idx_domains_org ON domains (organization_id);
CREATE INDEX idx_users_org ON users (organization_id);

CREATE OR REPLACE FUNCTION app_tenant_visible(row_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT row_org = NULLIF(current_setting('app.current_org_id', true), '')::uuid
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select ON organizations;
DROP POLICY IF EXISTS org_update ON organizations;
DROP POLICY IF EXISTS org_insert ON organizations;
CREATE POLICY org_select ON organizations FOR SELECT USING (app_tenant_visible(id));
CREATE POLICY org_update ON organizations FOR UPDATE
  USING (app_tenant_visible(id)) WITH CHECK (app_tenant_visible(id));
CREATE POLICY org_insert ON organizations FOR INSERT WITH CHECK (true);

DO $$
DECLARE
  tbl text;
  force_rls boolean;
BEGIN
  -- Docker creates mrrokesh_app above, so FORCE ROW LEVEL SECURITY still applies there.
  -- A managed database with one login cannot create that role. Forcing RLS would reject
  -- the owner's writes and the SECURITY DEFINER lookups, so FORCE stays off.
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mrrokesh_app') INTO force_rls;

  IF force_rls THEN
    EXECUTE 'ALTER TABLE organizations FORCE ROW LEVEL SECURITY';
  END IF;

  FOREACH tbl IN ARRAY ARRAY[
    'org_subscriptions', 'users', 'refresh_tokens', 'webauthn_passkeys',
    'domains', 'domain_dkim_keys', 'mailboxes', 'mailbox_aliases',
    'mailbox_delegations', 'transport_rules', 'migration_jobs', 'audit_logs',
    'password_reset_tokens', 'billing_checkouts', 'gst_invoices', 'app_passwords',
    'sending_daily', 'sending_minute'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    IF force_rls THEN
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (app_tenant_visible(organization_id)) WITH CHECK (app_tenant_visible(organization_id))',
      tbl
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION app_lookup_user_by_email(p_email text)
RETURNS SETOF users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT * FROM users WHERE email = p_email::citext
$$;

CREATE OR REPLACE FUNCTION app_lookup_refresh_by_hash(p_hash text)
RETURNS SETOF refresh_tokens
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT * FROM refresh_tokens WHERE token_hash = p_hash
$$;

CREATE OR REPLACE FUNCTION app_lookup_reset_by_hash(p_hash text)
RETURNS SETOF password_reset_tokens
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT * FROM password_reset_tokens WHERE token_hash = p_hash
$$;

CREATE OR REPLACE FUNCTION app_lookup_checkout(p_id uuid)
RETURNS SETOF billing_checkouts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT * FROM billing_checkouts WHERE id = p_id
$$;

CREATE OR REPLACE FUNCTION app_lookup_passkey(p_credential_id text)
RETURNS SETOF webauthn_passkeys
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT * FROM webauthn_passkeys WHERE credential_id = p_credential_id
$$;

CREATE OR REPLACE FUNCTION app_lookup_org_by_slug(p_slug text)
RETURNS SETOF organizations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT * FROM organizations WHERE slug = p_slug::citext
$$;

CREATE OR REPLACE FUNCTION app_lookup_domain_by_name(p_name text)
RETURNS SETOF domains
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT * FROM domains WHERE domain_name = p_name::citext
$$;

REVOKE ALL ON FUNCTION app_lookup_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_lookup_refresh_by_hash(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_lookup_reset_by_hash(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_lookup_checkout(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_lookup_passkey(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_lookup_org_by_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_lookup_domain_by_name(text) FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mrrokesh_app') THEN
    RAISE NOTICE 'Skipping grants to mrrokesh_app; the role is absent.';
    RETURN;
  END IF;

  EXECUTE 'GRANT EXECUTE ON FUNCTION app_lookup_user_by_email(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_lookup_refresh_by_hash(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_lookup_reset_by_hash(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_lookup_checkout(uuid) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_lookup_passkey(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_lookup_org_by_slug(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_lookup_domain_by_name(text) TO mrrokesh_app';
  EXECUTE 'GRANT EXECUTE ON FUNCTION app_tenant_visible(uuid) TO mrrokesh_app';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO mrrokesh_app';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mrrokesh_app';
  EXECUTE 'REVOKE UPDATE, DELETE ON audit_logs FROM mrrokesh_app';
  EXECUTE 'REVOKE DELETE ON organizations FROM mrrokesh_app';
END $$;

INSERT INTO subscription_plans (
  tier, display_name, price_inr_monthly, price_inr_annual,
  price_usd_monthly, price_usd_annual, storage_gb_per_seat, is_storage_pooled,
  max_domains, max_aliases_per_box, entitlements
) VALUES
  ('free', 'Free', 0, 0, 0, 0, 5, FALSE, 1, 5, '{}'::jsonb),
  ('starter', 'Starter', 8500, 6900, 0, 0, 15, FALSE, 3, 50, '{}'::jsonb),
  ('business', 'Business', 17900, 14900, 0, 0, 50, FALSE, 10, 300, '{}'::jsonb),
  ('business_plus', 'Business Plus', 41900, 34900, 0, 0, 100, FALSE, 50, 300, '{}'::jsonb),
  ('enterprise', 'Enterprise', 69900, 69900, 0, 0, 100, TRUE, -1, 400, '{}'::jsonb)
ON CONFLICT (tier) DO NOTHING;
