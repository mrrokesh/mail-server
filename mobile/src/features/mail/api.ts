import { ERROR_CODES } from '@mrrokesh/shared';
import { ApiClientError, apiRequest } from '../../lib/api';
import { sampleMessages } from './samples';
import {
  messageListSchema,
  messageSchema,
  sentMessageSchema,
  type Mailbox,
  type Message,
} from './schema';

export type MailListResult = {
  messages: Message[];
  source: 'api' | 'sample';
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
  preview: boolean;
}): Promise<MailListResult> {
  if (input.preview) {
    return { source: 'sample', messages: filterMessages(sampleMessages, input) };
  }
  try {
    const remote = await listMessages(input.mailbox);
    return { source: 'api', messages: filterMessages(remote, input) };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return { source: 'sample', messages: filterMessages(sampleMessages, input) };
    }
    throw error;
  }
}

function findSample(id: string): Message | null {
  return sampleMessages.find((message) => message.id === id) ?? null;
}

export async function loadMessage(id: string, preview: boolean): Promise<Message> {
  if (preview || id.startsWith('sample-')) {
    const sample = findSample(id);
    if (!sample) {
      throw new ApiClientError(
        404,
        ERROR_CODES['API-RES-404'].code,
        ERROR_CODES['API-RES-404'].message,
      );
    }
    return sample;
  }
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
