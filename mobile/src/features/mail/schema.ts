import { z } from 'zod';

export const MAILBOXES = ['inbox', 'sent', 'drafts', 'archive'] as const;

export type Mailbox = (typeof MAILBOXES)[number];

export const MAILBOX_LABEL: Record<Mailbox, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  archive: 'Archive',
};

export const messageSchema = z.object({
  id: z.string().min(1),
  mailbox: z.enum(MAILBOXES).optional().default('inbox'),
  fromName: z.string(),
  fromAddress: z.string(),
  subject: z.string(),
  preview: z.string(),
  bodyText: z.string().optional().default(''),
  receivedAt: z.string().min(1),
  unread: z.boolean().optional().default(false),
});

export const messageListSchema = z.object({
  messages: z.array(messageSchema),
});

export const sentMessageSchema = z.object({
  id: z.string().optional(),
});

export type Message = z.infer<typeof messageSchema>;
