import type { MailPlane, StoredMessage } from './plane';

/**
 * Stub adapter for an unmodified Stalwart Community admin API.
 * The real principal payload is intentionally not invented here. Network
 * failures stay on the pending path so the control plane still answers.
 */
export class HttpStalwartPlane implements MailPlane {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async ensureTenant(input: {
    organizationId: string;
    stalwartTenantId: string;
    name: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    return this.post('/api/principal', input);
  }

  async ensurePrincipal(input: {
    organizationId: string;
    principalId: string;
    address: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    return this.post('/api/principal', input);
  }

  async upsertAlias(input: {
    principalId: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    return this.post('/api/principal/alias', input);
  }

  async removeAlias(input: {
    principalId: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    return this.post('/api/principal/alias/remove', input);
  }

  async submitMessage(): Promise<{ id: string }> {
    return { id: 'pending' };
  }

  async listMessages(): Promise<StoredMessage[]> {
    return [];
  }

  private async post(path: string, body: unknown): Promise<{ syncStatus: 'synced' | 'pending' }> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });
      return { syncStatus: response.ok ? 'synced' : 'pending' };
    } catch {
      return { syncStatus: 'pending' };
    }
  }
}
