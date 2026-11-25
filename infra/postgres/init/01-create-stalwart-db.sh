#!/bin/sh
# Creates a database the Stalwart Community container can use.
# The control plane keeps its own database (POSTGRES_DB). Runs once, on a new volume.
set -eu

if [ -z "${STALWART_DB_PASSWORD:-}" ]; then
  echo "STALWART_DB_PASSWORD is required" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v stalwart_password="$STALWART_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE stalwart LOGIN PASSWORD %L', :'stalwart_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'stalwart')\gexec

SELECT 'CREATE DATABASE stalwart OWNER stalwart'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'stalwart')\gexec
SQL
