import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { loadEnvFile } from '../config';

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes('CHANGE_ME')) {
  throw new Error('DATABASE_URL must be set to the migration role before db:migrate');
}

const sql = postgres(databaseUrl, { max: 1 });
const file = readFileSync(new URL('./migrations/0001_initial_schema.sql', import.meta.url), 'utf8');
await sql.unsafe(file);

const appPassword = process.env.APP_DB_PASSWORD;
if (appPassword && !appPassword.includes('CHANGE_ME')) {
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
console.log('Applied backend/src/db/migrations/0001_initial_schema.sql');
