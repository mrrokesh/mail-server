CREATE TABLE IF NOT EXISTS stored_mail (
  id              UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  principal_id    TEXT NOT NULL,
  from_address    TEXT NOT NULL,
  to_addresses    TEXT[] NOT NULL,
  subject         TEXT NOT NULL,
  body_text       TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stored_mail_box
  ON stored_mail (organization_id, principal_id, created_at DESC);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['stored_mail']
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
