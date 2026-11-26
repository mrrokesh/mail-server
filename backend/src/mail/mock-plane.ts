import crypto from 'node:crypto';
import type { MailPlane, StoredMessage } from './plane';

/** In-process mail plane used when Stalwart is not running. */
export class MockMailPlane implements MailPlane {
  readonly deliversMail = false;
  readonly tenants = new Map<string, { stalwartTenantId: string; name: string }>();
  readonly principals = new Map<string, { organizationId: string; address: string }>();
  readonly aliases = new Map<string, Set<string>>();
  readonly messages: StoredMessage[] = [];

  async ensureTenant(input: {
    organizationId: string;
    stalwartTenantId: string;
    name: string;
  }): Promise<{ syncStatus: 'synced' }> {
    this.tenants.set(input.organizationId, {
      stalwartTenantId: input.stalwartTenantId,
      name: input.name,
    });
    return { syncStatus: 'synced' };
  }

  async ensurePrincipal(input: {
    organizationId: string;
    principalId: string;
    address: string;
  }): Promise<{ syncStatus: 'synced' }> {
    this.principals.set(input.principalId, {
      organizationId: input.organizationId,
      address: input.address,
    });
    return { syncStatus: 'synced' };
  }

  async upsertAlias(input: {
    organizationId: string;
    principalId: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' }> {
    const principal = this.principals.get(input.principalId);
    if (!principal || principal.organizationId !== input.organizationId) {
      return { syncStatus: 'synced' };
    }
    const set = this.aliases.get(input.principalId) ?? new Set<string>();
    set.add(input.alias.toLowerCase());
    this.aliases.set(input.principalId, set);
    return { syncStatus: 'synced' };
  }

  async removeAlias(input: {
    principalId: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' }> {
    this.aliases.get(input.principalId)?.delete(input.alias.toLowerCase());
    return { syncStatus: 'synced' };
  }

  async submitMessage(input: {
    organizationId: string;
    principalId: string;
    from: string;
    to: string[];
    subject: string;
    text: string;
    sizeBytes: number;
  }): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    this.messages.push({ ...input, id, at: new Date().toISOString() });
    return { id };
  }

  async listMessages(
    organizationId: string,
    principalId: string,
    _address?: string,
  ): Promise<StoredMessage[]> {
    return this.messages.filter(
      (message) => message.organizationId === organizationId && message.principalId === principalId,
    );
  }
}
