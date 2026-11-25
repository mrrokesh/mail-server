import type { AppConfig } from './config';
import type { DnsLookup } from './dns/lookup';
import type { MemoryRateLimiter } from './http/rate-limit';
import type { MailPlane } from './mail/plane';
import type { ControlStore } from './store/types';
import type { WorkspaceStore } from './v1/workspace';

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
  workspace: WorkspaceStore;
  mail: MailPlane;
  dns: DnsLookup;
  challenges: Map<string, WebAuthnChallenge>;
  rates: MemoryRateLimiter;
  now: () => Date;
}
