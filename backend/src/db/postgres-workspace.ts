import postgres, { type Sql } from 'postgres';
import { WorkspaceStore, type ChatKind, type ModuleSnapshot } from '../v1/workspace';

type Row = Record<string, unknown>;

/**
 * Postgres adapter for the module store. The first request for an organisation
 * loads its rows into the in-memory working set. The response hook writes that
 * set back. One API process owns the working set.
 */
export class PostgresWorkspace extends WorkspaceStore {
  override readonly persistence = 'postgres' as const;

  private readonly loaded = new Set<string>();
  private readonly dirty = new Set<string>();
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly sql: Sql) {
    super();
  }

  override async hydrate(organizationId: string): Promise<void> {
    this.dirty.add(organizationId);
    if (this.loaded.has(organizationId)) return;
    const snap = await this.readOrg(organizationId);
    this.replaceOrg(organizationId, snap);
    this.loaded.add(organizationId);
  }

  override async flush(): Promise<void> {
    if (this.dirty.size === 0) return;
    const run = this.tail.then(() => this.flushNow());
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    await run;
  }

  override async prepareShareToken(token: string): Promise<void> {
    const rows = await this.sql`
      select app_v2_org_by_share_token(${token}) as organization_id
    `;
    await this.hydrateLookup(rows[0]);
  }

  override async prepareBookingSlug(slug: string): Promise<void> {
    const rows = await this.sql`
      select app_v2_org_by_booking_slug(${slug}) as organization_id
    `;
    await this.hydrateLookup(rows[0]);
  }

  override async prepareBrandHost(host: string): Promise<void> {
    const rows = await this.sql`
      select app_v2_org_by_brand_host(${host}) as organization_id
    `;
    await this.hydrateLookup(rows[0]);
  }

  override async prepareAliasAddress(address: string): Promise<void> {
    const rows = await this.sql`
      select app_v2_org_by_alias_address(${address}) as organization_id
    `;
    await this.hydrateLookup(rows[0]);
  }

  override async prepareUnsubscribeToken(token: string): Promise<void> {
    const rows = await this.sql`
      select app_v2_org_by_unsub_token(${token}) as organization_id
    `;
    await this.hydrateLookup(rows[0]);
  }

  private async hydrateLookup(value: unknown): Promise<void> {
    const row = asRow(value);
    const orgId = row ? textOrNull(row, 'organization_id') : null;
    if (orgId) await this.hydrate(orgId);
  }

  private async flushNow(): Promise<void> {
    const orgs = [...this.dirty];
    this.dirty.clear();
    for (const organizationId of orgs) {
      if (!this.loaded.has(organizationId)) continue;
      try {
        await this.writeOrg(organizationId);
      } catch (error) {
        this.dirty.add(organizationId);
        throw error;
      }
    }
  }

  private async readOrg(organizationId: string): Promise<ModuleSnapshot> {
    return this.sql.begin(async (tx) => {
      await tx`select set_config('app.current_org_id', ${organizationId}, true)`;
      const files = await tx`select * from drive_files where organization_id = ${organizationId}`;
      const shares = await tx`select * from drive_shares where organization_id = ${organizationId}`;
      const tasks = await tx`select * from tasks where organization_id = ${organizationId}`;
      const notes = await tx`select * from notes where organization_id = ${organizationId}`;
      const pages = await tx`select * from booking_pages where organization_id = ${organizationId}`;
      const appointments =
        await tx`select * from appointments where organization_id = ${organizationId}`;
      const conversations =
        await tx`select * from chat_conversations where organization_id = ${organizationId}`;
      const members =
        await tx`select * from chat_members where organization_id = ${organizationId}`;
      const messages =
        await tx`select * from chat_messages where organization_id = ${organizationId}`;
      const aliases =
        await tx`select * from masked_aliases where organization_id = ${organizationId}`;
      const keys = await tx`select * from privacy_keys where organization_id = ${organizationId}`;
      const privacy =
        await tx`select * from privacy_settings where organization_id = ${organizationId}`;
      const byok = await tx`select * from byok_keys where organization_id = ${organizationId}`;
      const siem =
        await tx`select * from siem_destinations where organization_id = ${organizationId}`;
      const simulations =
        await tx`select * from attack_simulations where organization_id = ${organizationId}`;
      const enterprise =
        await tx`select * from enterprise_settings where organization_id = ${organizationId}`;
      const brand =
        await tx`select * from partner_brands where organization_id = ${organizationId}`;
      const campaigns = await tx`select * from campaigns where organization_id = ${organizationId}`;
      const suppressions =
        await tx`select * from campaign_suppressions where organization_id = ${organizationId}`;
      const memberIds = new Map<string, string[]>();
      for (const item of members) {
        const row = asRow(item);
        if (!row) continue;
        const conversationId = text(row, 'conversation_id');
        const list = memberIds.get(conversationId) ?? [];
        list.push(text(row, 'user_id'));
        memberIds.set(conversationId, list);
      }
      const privacyRow = asRow(privacy[0]);
      const enterpriseRow = asRow(enterprise[0]);
      const brandRow = asRow(brand[0]);
      return {
        files: files.map((item) => mapFile(asRow(item))),
        shares: shares.map((item) => mapShare(asRow(item))),
        tasks: tasks.map((item) => mapTask(asRow(item))),
        notes: notes.map((item) => mapNote(asRow(item))),
        pages: pages.map((item) => mapPage(asRow(item))),
        appointments: appointments.map((item) => mapAppointment(asRow(item))),
        conversations: conversations.map((item) => mapConversation(asRow(item), memberIds)),
        messages: messages.map((item) => mapMessage(asRow(item))),
        aliases: aliases.map((item) => mapAlias(asRow(item))),
        keys: keys.map((item) => mapKey(asRow(item))),
        privacy: privacyRow
          ? { organizationId, addonEnabled: flag(privacyRow, 'addon_enabled') }
          : null,
        byok: byok.map((item) => mapByok(asRow(item))),
        siem: siem.map((item) => mapSiem(asRow(item))),
        simulations: simulations.map((item) => mapSimulation(asRow(item))),
        enterprise: enterpriseRow
          ? { organizationId, dedicatedIp: flag(enterpriseRow, 'dedicated_ip') }
          : null,
        brand: brandRow ? mapBrand(brandRow) : null,
        campaigns: campaigns.map((item) => mapCampaign(asRow(item))),
        suppressions: suppressions.map((item) => mapSuppression(asRow(item))),
      };
    });
  }

  private async writeOrg(organizationId: string): Promise<void> {
    const snap = structuredClone(this.exportOrg(organizationId));
    await this.sql.begin(async (tx) => {
      await tx`select set_config('app.current_org_id', ${organizationId}, true)`;
      await tx`delete from drive_shares where organization_id = ${organizationId}`;
      await tx`delete from appointments where organization_id = ${organizationId}`;
      await tx`delete from drive_files where organization_id = ${organizationId}`;
      await tx`delete from tasks where organization_id = ${organizationId}`;
      await tx`delete from notes where organization_id = ${organizationId}`;
      await tx`delete from booking_pages where organization_id = ${organizationId}`;
      await tx`delete from chat_messages where organization_id = ${organizationId} and thread_root_id is not null`;
      await tx`delete from chat_messages where organization_id = ${organizationId}`;
      await tx`delete from chat_members where organization_id = ${organizationId}`;
      await tx`delete from chat_conversations where organization_id = ${organizationId}`;
      await tx`delete from masked_aliases where organization_id = ${organizationId}`;
      await tx`delete from privacy_keys where organization_id = ${organizationId}`;
      await tx`delete from privacy_settings where organization_id = ${organizationId}`;
      await tx`delete from byok_keys where organization_id = ${organizationId}`;
      await tx`delete from siem_destinations where organization_id = ${organizationId}`;
      await tx`delete from attack_simulations where organization_id = ${organizationId}`;
      await tx`delete from enterprise_settings where organization_id = ${organizationId}`;
      await tx`delete from partner_brands where organization_id = ${organizationId}`;
      await tx`delete from campaign_suppressions where organization_id = ${organizationId}`;
      await tx`delete from campaigns where organization_id = ${organizationId}`;

      for (const file of snap.files) {
        await tx`
          insert into drive_files (
            id, organization_id, owner_user_id, name, content_type, size_bytes, created_at
          ) values (
            ${file.id}, ${file.organizationId}, ${file.ownerUserId}, ${file.name},
            ${file.contentType}, ${file.sizeBytes}, ${file.createdAt}
          )
        `;
      }
      for (const share of snap.shares) {
        await tx`
          insert into drive_shares (
            id, organization_id, file_id, token, password_hash, expires_at, max_downloads,
            downloads, view_only, created_at
          ) values (
            ${share.id}, ${share.organizationId}, ${share.fileId}, ${share.token},
            ${share.passwordHash}, ${share.expiresAt}, ${share.maxDownloads}, ${share.downloads},
            ${share.viewOnly}, ${share.createdAt}
          )
        `;
      }
      for (const task of snap.tasks) {
        await tx`
          insert into tasks (
            id, organization_id, owner_user_id, title, due_date, priority, done, created_at
          ) values (
            ${task.id}, ${task.organizationId}, ${task.ownerUserId}, ${task.title},
            ${task.dueDate}, ${task.priority}, ${task.done}, ${task.createdAt}
          )
        `;
      }
      for (const note of snap.notes) {
        await tx`
          insert into notes (id, organization_id, owner_user_id, title, body, created_at)
          values (
            ${note.id}, ${note.organizationId}, ${note.ownerUserId}, ${note.title},
            ${note.body}, ${note.createdAt}
          )
        `;
      }
      for (const page of snap.pages) {
        await tx`
          insert into booking_pages (
            id, organization_id, owner_user_id, title, slug, duration_minutes, timezone, created_at
          ) values (
            ${page.id}, ${page.organizationId}, ${page.ownerUserId}, ${page.title}, ${page.slug},
            ${page.durationMinutes}, ${page.timezone}, ${page.createdAt}
          )
        `;
      }
      for (const row of snap.appointments) {
        await tx`
          insert into appointments (id, page_id, organization_id, start_at, guest_name, guest_email)
          values (
            ${row.id}, ${row.pageId}, ${row.organizationId}, ${row.start}, ${row.name}, ${row.email}
          )
        `;
      }
      for (const row of snap.conversations) {
        await tx`
          insert into chat_conversations (
            id, organization_id, kind, title, created_by, created_at
          ) values (
            ${row.id}, ${row.organizationId}, ${row.kind}, ${row.title}, ${row.createdBy},
            ${row.createdAt}
          )
        `;
      }
      for (const row of snap.conversations) {
        for (const userId of row.memberUserIds) {
          await tx`
            insert into chat_members (conversation_id, organization_id, user_id)
            values (${row.id}, ${row.organizationId}, ${userId})
          `;
        }
      }
      const roots = snap.messages.filter((row) => row.threadRootId === null);
      const replies = snap.messages.filter((row) => row.threadRootId !== null);
      for (const row of [...roots, ...replies]) {
        await tx`
          insert into chat_messages (
            id, organization_id, conversation_id, thread_root_id, author_user_id, body,
            drive_file_id, created_at
          ) values (
            ${row.id}, ${row.organizationId}, ${row.conversationId}, ${row.threadRootId},
            ${row.authorUserId}, ${row.body}, ${row.driveFileId}, ${row.createdAt}
          )
        `;
      }
      for (const row of snap.aliases) {
        await tx`
          insert into masked_aliases (
            id, organization_id, owner_user_id, label, address, enabled, message_count, created_at
          ) values (
            ${row.id}, ${row.organizationId}, ${row.ownerUserId}, ${row.label}, ${row.address},
            ${row.enabled}, ${row.messageCount}, ${row.createdAt}
          )
        `;
      }
      for (const row of snap.keys) {
        await tx`
          insert into privacy_keys (
            organization_id, user_id, address, public_key_armored, wrapped_private_key,
            fingerprint, recovery_registered, created_at
          ) values (
            ${row.organizationId}, ${row.userId}, ${row.address}, ${row.publicKeyArmored},
            ${row.wrappedPrivateKey}, ${row.fingerprint}, ${row.recoveryRegistered}, ${row.createdAt}
          )
        `;
      }
      if (snap.privacy) {
        await tx`
          insert into privacy_settings (organization_id, addon_enabled)
          values (${organizationId}, ${snap.privacy.addonEnabled})
        `;
      }
      for (const row of snap.byok) {
        await tx`
          insert into byok_keys (id, organization_id, version, kms_key_ref, status, created_at)
          values (
            ${row.id}, ${row.organizationId}, ${row.version}, ${row.kmsKeyRef}, ${row.status},
            ${row.createdAt}
          )
        `;
      }
      for (const row of snap.siem) {
        await tx`
          insert into siem_destinations (id, organization_id, kind, target, enabled, created_at)
          values (
            ${row.id}, ${row.organizationId}, ${row.kind}, ${row.target}, ${row.enabled},
            ${row.createdAt}
          )
        `;
      }
      for (const row of snap.simulations) {
        await tx`
          insert into attack_simulations (id, organization_id, title, status, created_at)
          values (${row.id}, ${row.organizationId}, ${row.title}, ${row.status}, ${row.createdAt})
        `;
      }
      if (snap.enterprise) {
        await tx`
          insert into enterprise_settings (organization_id, dedicated_ip)
          values (${organizationId}, ${snap.enterprise.dedicatedIp})
        `;
      }
      if (snap.brand) {
        await tx`
          insert into partner_brands (organization_id, login_host, product_name, logo_url, updated_at)
          values (
            ${organizationId}, ${snap.brand.loginHost}, ${snap.brand.productName},
            ${snap.brand.logoUrl}, ${snap.brand.updatedAt}
          )
        `;
      }
      for (const row of snap.campaigns) {
        await tx`
          insert into campaigns (
            id, organization_id, owner_user_id, name, subject, status, unsubscribe_token, created_at
          ) values (
            ${row.id}, ${row.organizationId}, ${row.ownerUserId}, ${row.name}, ${row.subject},
            ${row.status}, ${row.unsubscribeToken}, ${row.createdAt}
          )
        `;
      }
      for (const row of snap.suppressions) {
        await tx`
          insert into campaign_suppressions (id, organization_id, campaign_id, email, created_at)
          values (
            ${row.id}, ${row.organizationId}, ${row.campaignId}, ${row.email}, ${row.createdAt}
          )
        `;
      }
    });
  }
}

export function createPostgresWorkspace(url: string): PostgresWorkspace {
  if (!url) {
    throw new Error('APP_DATABASE_URL or DATABASE_URL is required when CONTROL_STORE=postgres');
  }
  return new PostgresWorkspace(postgres(url, { max: 4 }));
}

function asRow(value: unknown): Row | null {
  if (!value || typeof value !== 'object') return null;
  return value as Row;
}

function text(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Expected text ${key}`);
  return value;
}

function textOrNull(row: Row, key: string): string | null {
  const value = row[key];
  if (value == null) return null;
  return text(row, key);
}

function flag(row: Row, key: string): boolean {
  const value = row[key];
  if (typeof value !== 'boolean') throw new Error(`Expected boolean ${key}`);
  return value;
}

function num(row: Row, key: string): number {
  const value = row[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  throw new Error(`Expected number ${key}`);
}

function numOrNull(row: Row, key: string): number | null {
  if (row[key] == null) return null;
  return num(row, key);
}

function iso(row: Row, key: string): string {
  const value = row[key];
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`Expected timestamp ${key}`);
}

function dayOrNull(row: Row, key: string): string | null {
  const value = row[key];
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  throw new Error(`Expected date ${key}`);
}

function mapFile(row: Row | null) {
  if (!row) throw new Error('drive file');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    ownerUserId: text(row, 'owner_user_id'),
    name: text(row, 'name'),
    contentType: text(row, 'content_type'),
    sizeBytes: num(row, 'size_bytes'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapShare(row: Row | null) {
  if (!row) throw new Error('drive share');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    fileId: text(row, 'file_id'),
    token: text(row, 'token'),
    passwordHash: textOrNull(row, 'password_hash'),
    expiresAt: row.expires_at == null ? null : iso(row, 'expires_at'),
    maxDownloads: numOrNull(row, 'max_downloads'),
    downloads: num(row, 'downloads'),
    viewOnly: flag(row, 'view_only'),
    createdAt: iso(row, 'created_at'),
  };
}

function taskPriority(value: string): 'low' | 'normal' | 'high' {
  if (value === 'low' || value === 'normal' || value === 'high') return value;
  throw new Error('task priority');
}

function mapTask(row: Row | null) {
  if (!row) throw new Error('task');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    ownerUserId: text(row, 'owner_user_id'),
    title: text(row, 'title'),
    dueDate: dayOrNull(row, 'due_date'),
    priority: taskPriority(text(row, 'priority')),
    done: flag(row, 'done'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapNote(row: Row | null) {
  if (!row) throw new Error('note');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    ownerUserId: text(row, 'owner_user_id'),
    title: text(row, 'title'),
    body: text(row, 'body'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapPage(row: Row | null) {
  if (!row) throw new Error('booking page');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    ownerUserId: text(row, 'owner_user_id'),
    title: text(row, 'title'),
    slug: text(row, 'slug'),
    durationMinutes: num(row, 'duration_minutes'),
    timezone: text(row, 'timezone'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapAppointment(row: Row | null) {
  if (!row) throw new Error('appointment');
  return {
    id: text(row, 'id'),
    pageId: text(row, 'page_id'),
    organizationId: text(row, 'organization_id'),
    start: text(row, 'start_at'),
    name: text(row, 'guest_name'),
    email: text(row, 'guest_email'),
  };
}

function mapConversation(row: Row | null, memberIds: Map<string, string[]>) {
  if (!row) throw new Error('conversation');
  const kind = text(row, 'kind');
  if (kind !== 'direct' && kind !== 'group' && kind !== 'channel') throw new Error('chat kind');
  const id = text(row, 'id');
  return {
    id,
    organizationId: text(row, 'organization_id'),
    kind: kind as ChatKind,
    title: text(row, 'title'),
    createdBy: text(row, 'created_by'),
    memberUserIds: memberIds.get(id) ?? [],
    createdAt: iso(row, 'created_at'),
  };
}

function mapMessage(row: Row | null) {
  if (!row) throw new Error('message');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    conversationId: text(row, 'conversation_id'),
    threadRootId: textOrNull(row, 'thread_root_id'),
    authorUserId: text(row, 'author_user_id'),
    body: text(row, 'body'),
    driveFileId: textOrNull(row, 'drive_file_id'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapAlias(row: Row | null) {
  if (!row) throw new Error('alias');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    ownerUserId: text(row, 'owner_user_id'),
    label: text(row, 'label'),
    address: text(row, 'address'),
    enabled: flag(row, 'enabled'),
    messageCount: num(row, 'message_count'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapKey(row: Row | null) {
  if (!row) throw new Error('privacy key');
  return {
    organizationId: text(row, 'organization_id'),
    userId: text(row, 'user_id'),
    address: text(row, 'address'),
    publicKeyArmored: text(row, 'public_key_armored'),
    wrappedPrivateKey: text(row, 'wrapped_private_key'),
    fingerprint: text(row, 'fingerprint'),
    recoveryRegistered: flag(row, 'recovery_registered'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapByok(row: Row | null) {
  if (!row) throw new Error('byok');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    version: num(row, 'version'),
    kmsKeyRef: text(row, 'kms_key_ref'),
    status: 'registered' as const,
    createdAt: iso(row, 'created_at'),
  };
}

function siemKind(value: string): 'webhook' | 'syslog' {
  if (value === 'webhook' || value === 'syslog') return value;
  throw new Error('siem kind');
}

function mapSiem(row: Row | null) {
  if (!row) throw new Error('siem');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    kind: siemKind(text(row, 'kind')),
    target: text(row, 'target'),
    enabled: flag(row, 'enabled'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapSimulation(row: Row | null) {
  if (!row) throw new Error('simulation');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    title: text(row, 'title'),
    status: 'placeholder' as const,
    createdAt: iso(row, 'created_at'),
  };
}

function mapBrand(row: Row) {
  return {
    organizationId: text(row, 'organization_id'),
    loginHost: text(row, 'login_host'),
    productName: text(row, 'product_name'),
    logoUrl: textOrNull(row, 'logo_url'),
    updatedAt: iso(row, 'updated_at'),
  };
}

function mapCampaign(row: Row | null) {
  if (!row) throw new Error('campaign');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    ownerUserId: text(row, 'owner_user_id'),
    name: text(row, 'name'),
    subject: text(row, 'subject'),
    status: 'draft' as const,
    unsubscribeToken: text(row, 'unsubscribe_token'),
    createdAt: iso(row, 'created_at'),
  };
}

function mapSuppression(row: Row | null) {
  if (!row) throw new Error('suppression');
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    campaignId: text(row, 'campaign_id'),
    email: text(row, 'email'),
    createdAt: iso(row, 'created_at'),
  };
}
