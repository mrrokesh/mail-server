import type { AppConfig } from './config';
import type { DnsLookup } from './dns/lookup';
import type { MemoryRateLimiter } from './http/rate-limit';
import type { MailPlane } from './mail/plane';
import type { ControlStore } from './store/types';

export interface WebAuthnChallenge {
  challenge: string;
  userId?: string;
  organizationId?: string;
  purpose: 'register' | 'authenticate';
  expiresAt: number;
}

export interface AppDeps {
  config: AppConfig;
  store: ControlStore;
  mail: MailPlane;
  dns: DnsLookup;
  challenges: Map<string, WebAuthnChallenge>;
  rates: MemoryRateLimiter;
  now: () => Date;
}
