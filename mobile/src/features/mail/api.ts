import type { ApiClientError } from '../../lib/api';
import { apiRequest } from '../../lib/api';
import {
  draftResponseSchema,
  messageListSchema,
  messageSchema,
  sentMessageSchema,
  updateStateSchema,
  type Mailbox,
  type Message,
} from './schema';

export type MailListResult = {
  messages: Message[];
  source: 'api';
};

export type MailFilter = 'all' | 'unread' | 'starred';

export function filterMessages(
  messages: readonly Message[],
  input: { mailbox: Mailbox; q: string; filter?: MailFilter },
): Message[] {
  const needle = input.q.trim().toLocaleLowerCase();
  return messages
    .filter((message) => {
      if (message.mailbox !== input.mailbox) return false;
      if (input.filter === 'unread' && !message.unread) return false;
      if (input.filter === 'starred' && !message.starred) return false;
      if (needle.length === 0) return true;
      const haystack = [
        message.fromName,
        message.fromAddress,
        message.subject,
        message.preview,
        message.bodyText,
        ...message.labels,
        message.internalNote ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase();
      return haystack.includes(needle);
    })
    .slice()
    .sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      return left.receivedAt < right.receivedAt ? 1 : -1;
    });
}

export async function listMessages(mailbox: Mailbox): Promise<Message[]> {
  const params = new URLSearchParams({ mailbox });
  const result = await apiRequest(`/api/v1/mail/messages?${params.toString()}`, messageListSchema, {
    auth: true,
  });
  return result.messages;
}

export async function loadMailbox(input: {
  mailbox: Mailbox;
  q: string;
  filter?: MailFilter;
}): Promise<MailListResult> {
  const remote = await listMessages(input.mailbox);
  return { source: 'api', messages: filterMessages(remote, input) };
}

export async function loadMessage(id: string): Promise<Message> {
  return apiRequest(`/api/v1/mail/messages/${encodeURIComponent(id)}`, messageSchema, {
    auth: true,
  });
}

export async function sendMessage(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  await apiRequest('/api/v1/mail/messages', sentMessageSchema, {
    method: 'POST',
    auth: true,
    body: input,
  });
}

export async function updateMessageState(
  id: string,
  patch: {
    folder?: Mailbox;
    unread?: boolean;
    starred?: boolean;
    pinned?: boolean;
    muted?: boolean;
    snoozeUntil?: string | null;
    labels?: string[];
    internalNote?: string | null;
  },
): Promise<void> {
  await apiRequest(`/api/v1/mail/messages/${encodeURIComponent(id)}`, updateStateSchema, {
    method: 'PATCH',
    auth: true,
    body: patch,
  });
}

export async function saveDraft(input: {
  id?: string;
  to: string[];
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  return apiRequest('/api/v1/mail/drafts', draftResponseSchema, {
    method: 'POST',
    auth: true,
    body: input,
  });
}

export type { ApiClientError };
