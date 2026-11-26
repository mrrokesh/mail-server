CREATE TABLE IF NOT EXISTS org_workspace_extensions (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['org_workspace_extensions']
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
