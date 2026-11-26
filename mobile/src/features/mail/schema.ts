import { z } from 'zod';

export const MAILBOXES = ['inbox', 'sent', 'drafts', 'snoozed', 'archive', 'trash'] as const;

export type Mailbox = (typeof MAILBOXES)[number];

export const MAILBOX_LABEL: Record<Mailbox, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  snoozed: 'Snoozed',
  archive: 'Archive',
  trash: 'Trash',
};

export const messageSchema = z.object({
  id: z.string().min(1),
  mailbox: z.enum(MAILBOXES).optional().default('inbox'),
  fromName: z.string(),
  fromAddress: z.string(),
  toEmail: z.string().optional().default(''),
  subject: z.string(),
  preview: z.string(),
  bodyText: z.string().optional().default(''),
  receivedAt: z.string().min(1),
  unread: z.boolean().optional().default(false),
  starred: z.boolean().optional().default(false),
  pinned: z.boolean().optional().default(false),
  muted: z.boolean().optional().default(false),
  snoozeUntil: z.string().nullable().optional().default(null),
  labels: z.array(z.string()).optional().default([]),
  internalNote: z.string().nullable().optional().default(null),
});

export const messageListSchema = z.object({
  messages: z.array(messageSchema),
});

export const sentMessageSchema = z.object({
  id: z.string().optional(),
});

export const updateStateSchema = z.object({
  ok: z.boolean().optional(),
});

export const draftResponseSchema = z.object({
  id: z.string(),
});

export type Message = z.infer<typeof messageSchema>;
