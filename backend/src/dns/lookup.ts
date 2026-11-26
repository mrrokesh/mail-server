import { Resolver } from 'node:dns/promises';
import { ApiError } from '../errors';

export interface DnsLookup {
  resolveTxt(hostname: string): Promise<string[]>;
  resolveMx(hostname: string): Promise<Array<{ exchange: string; priority: number }>>;
  resolveCname(hostname: string): Promise<string[]>;
}

export class MapDns implements DnsLookup {
  readonly txt = new Map<string, string[]>();
  readonly mx = new Map<string, Array<{ exchange: string; priority: number }>>();
  readonly cname = new Map<string, string[]>();

  setTxt(hostname: string, values: string[]): void {
    this.txt.set(hostname.toLowerCase(), values);
  }

  setMx(hostname: string, values: Array<{ exchange: string; priority: number }>): void {
    this.mx.set(hostname.toLowerCase(), values);
  }

  setCname(hostname: string, values: string[]): void {
    this.cname.set(hostname.toLowerCase(), values);
  }

  async resolveTxt(hostname: string): Promise<string[]> {
    return this.txt.get(hostname.toLowerCase()) ?? [];
  }

  async resolveMx(hostname: string): Promise<Array<{ exchange: string; priority: number }>> {
    return this.mx.get(hostname.toLowerCase()) ?? [];
  }

  async resolveCname(hostname: string): Promise<string[]> {
    return this.cname.get(hostname.toLowerCase()) ?? [];
  }
}

export class LiveDns implements DnsLookup {
  private readonly resolver = new Resolver();

  async resolveTxt(hostname: string): Promise<string[]> {
    return this.quiet(async () => {
      const rows = await this.resolver.resolveTxt(hostname);
      return rows.map((chunks) => chunks.join(''));
    });
  }

  async resolveMx(hostname: string): Promise<Array<{ exchange: string; priority: number }>> {
    return this.quiet(async () => {
      const rows = await this.resolver.resolveMx(hostname);
      return rows.map((row) => ({ exchange: row.exchange, priority: row.priority }));
    });
  }

  async resolveCname(hostname: string): Promise<string[]> {
    return this.quiet(() => this.resolver.resolveCname(hostname));
  }

  private async quiet<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ENOENT' || code === 'ESERVFAIL') {
        return [] as T;
      }
      throw new ApiError('API-DNS-008');
    }
  }
}
