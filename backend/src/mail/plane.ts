import type { MailboxKind } from '../store/types';

export interface StoredMessage {
  id: string;
  organizationId: string;
  principalId: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  sizeBytes: number;
  at: string;
}

export interface MailPlane {
  ensureTenant(input: {
    organizationId: string;
    stalwartTenantId: string;
    name: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }>;
  ensurePrincipal(input: {
    organizationId: string;
    stalwartTenantId: string;
    principalId: string;
    address: string;
    kind: MailboxKind;
  }): Promise<{ syncStatus: 'synced' | 'pending' }>;
  upsertAlias(input: {
    organizationId: string;
    principalId: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }>;
  removeAlias(input: {
    organizationId: string;
    principalId: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }>;
  submitMessage(input: {
    organizationId: string;
    principalId: string;
    from: string;
    to: string[];
    subject: string;
    text: string;
    sizeBytes: number;
  }): Promise<{ id: string }>;
  listMessages(organizationId: string, principalId: string): Promise<StoredMessage[]>;
}
