import type { ApiClientError} from '../../lib/api';
import { apiRequest } from '../../lib/api';
import {
  messageListSchema,
  messageSchema,
  sentMessageSchema,
  type Mailbox,
  type Message,
} from './schema';

export type MailListResult = {
  messages: Message[];
  source: 'api';
};

export function filterMessages(
  messages: readonly Message[],
  input: { mailbox: Mailbox; q: string },
): Message[] {
  const needle = input.q.trim().toLocaleLowerCase();
  return messages
    .filter((message) => {
      if (message.mailbox !== input.mailbox) return false;
      if (needle.length === 0) return true;
      const haystack = [
        message.fromName,
        message.fromAddress,
        message.subject,
        message.preview,
        message.bodyText,
      ]
        .join(' ')
        .toLocaleLowerCase();
      return haystack.includes(needle);
    })
    .slice()
    .sort((left, right) => (left.receivedAt < right.receivedAt ? 1 : -1));
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

export type { ApiClientError };
