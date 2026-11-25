import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { loadEnvFile } from '../config';

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes('CHANGE_ME')) {
  throw new Error('DATABASE_URL must be set to the migration role before db:migrate');
}

const sql = postgres(databaseUrl, { max: 1 });
await sql`
  create table if not exists schema_migrations (
    id text primary key,
    applied_at timestamptz not null default now()
  )
`;

const files = [
  '0001_initial_schema.sql',
  '0002_v2_modules.sql',
  '0003_workspace_modules.sql',
  '0004_stored_mail.sql',
];
for (const name of files) {
  const seen = await sql`select id from schema_migrations where id = ${name}`;
  if (seen.length > 0) {
    console.log(`Skipping ${name}`);
    continue;
  }
  if (name.startsWith('0001')) {
    const existing = await sql<{ name: string | null }[]>`
      select to_regclass('public.organizations') as name
    `;
    if (existing[0]?.name) {
      await sql`insert into schema_migrations (id) values (${name}) on conflict do nothing`;
      console.log('Recorded the existing initial schema');
      continue;
    }
  }
  const body = readFileSync(new URL(`./migrations/${name}`, import.meta.url), 'utf8');
  await sql.unsafe(body);
  await sql`insert into schema_migrations (id) values (${name})`;
  console.log(`Applied backend/src/db/migrations/${name}`);
}

const appRole = await sql`select 1 as ok from pg_roles where rolname = 'mrrokesh_app'`;
const appPassword = process.env.APP_DB_PASSWORD;
if (appRole.length === 0) {
  console.warn(
    'mrrokesh_app was not created. This login cannot create roles. Point APP_DATABASE_URL at the same URL as DATABASE_URL. The table owner bypasses row-level security. That bypass is a managed-database limitation.',
  );
} else if (appPassword && !appPassword.includes('CHANGE_ME')) {
  const statement = await sql<{ set_password: string }[]>`
    select format('ALTER ROLE mrrokesh_app WITH LOGIN PASSWORD %L', ${appPassword}) as set_password
  `;
  const command = statement[0]?.set_password;
  if (!command) throw new Error('Could not build the app role password statement');
  await sql.unsafe(command);
  console.log('mrrokesh_app password updated. Point APP_DATABASE_URL at that role.');
} else {
  console.warn(
    'APP_DB_PASSWORD is unset. mrrokesh_app cannot log in, and a superuser DATABASE_URL bypasses row-level security.',
  );
}

await sql.end();
