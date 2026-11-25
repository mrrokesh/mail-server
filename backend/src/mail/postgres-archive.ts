import type { Sql } from 'postgres';
import type { StoredMessage } from './plane';

type Row = Record<string, unknown>;

export interface MailArchive {
  save(message: StoredMessage): Promise<void>;
  list(organizationId: string, principalId: string): Promise<StoredMessage[]>;
}

/**
 * Sent and delivered copies live in Postgres so a restart does not empty the mailbox.
 * The row-level policy reads app.current_org_id, so every statement runs inside a transaction.
 */
export class PostgresMailArchive implements MailArchive {
  constructor(private readonly sql: Sql) {}

  async save(message: StoredMessage): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`select set_config('app.current_org_id', ${message.organizationId}, true)`;
      await tx`
        insert into stored_mail (
          id, organization_id, principal_id, from_address, to_addresses, subject, body_text, size_bytes, created_at
        ) values (
          ${message.id}, ${message.organizationId}, ${message.principalId}, ${message.from},
          ${message.to}, ${message.subject}, ${message.text}, ${message.sizeBytes}, ${message.at}
        )
        on conflict (id) do nothing
      `;
    });
  }

  async list(organizationId: string, principalId: string): Promise<StoredMessage[]> {
    const rows = await this.sql.begin(async (tx) => {
      await tx`select set_config('app.current_org_id', ${organizationId}, true)`;
      return tx`
        select id, organization_id, principal_id, from_address, to_addresses, subject, body_text, size_bytes, created_at
        from stored_mail
        where organization_id = ${organizationId} and principal_id = ${principalId}
        order by created_at desc
      `;
    });
    return [...rows].map((item) => mapRow(item as Row));
  }
}

function text(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Expected text ${key}`);
  return value;
}

function addresses(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1);
    if (!inner) return [];
    return inner.split(',').map((item) => item.replace(/^"|"$/g, ''));
  }
  return [];
}

function when(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  throw new Error('Expected timestamp created_at');
}

function mapRow(row: Row): StoredMessage {
  const size = row.size_bytes;
  const sizeBytes = typeof size === 'number' ? size : Number(size);
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    principalId: text(row, 'principal_id'),
    from: text(row, 'from_address'),
    to: addresses(row.to_addresses),
    subject: text(row, 'subject'),
    text: text(row, 'body_text'),
    sizeBytes,
    at: when(row.created_at),
  };
}
