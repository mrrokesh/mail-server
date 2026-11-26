import type { MailboxKind } from '../store/types';

/** Folder a message sits in on the mail engine, when the engine reports one. */
export type StoredFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash';

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
  /** Set by engines that track folders. Callers fall back to inbox/sent by sender. */
  folder?: StoredFolder;
}

export interface MailPlane {
  /**
   * True when the engine delivers mail to local recipients by itself (real SMTP).
   * When false, the caller copies a sent message into each local recipient's box.
   */
  readonly deliversMail: boolean;
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
    /** Primary address of the mailbox that owns the alias. */
    address: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }>;
  removeAlias(input: {
    organizationId: string;
    principalId: string;
    address: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }>;
  submitMessage(input: {
    organizationId: string;
    principalId: string;
    /** Primary address of the sending mailbox (the From may be one of its aliases). */
    mailboxAddress: string;
    from: string;
    to: string[];
    subject: string;
    text: string;
    sizeBytes: number;
  }): Promise<{ id: string }>;
  listMessages(
    organizationId: string,
    principalId: string,
    address: string,
  ): Promise<StoredMessage[]>;
}
