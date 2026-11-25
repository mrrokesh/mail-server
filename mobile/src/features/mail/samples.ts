import type { Message } from './schema';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** Local sample mail used until `/api/v1/mail` returns a list. */
export const sampleMessages: Message[] = [
  {
    id: 'sample-dns',
    mailbox: 'inbox',
    fromName: 'Priya Shah',
    fromAddress: 'priya@example.com',
    subject: 'DNS records to publish',
    preview: 'TXT, MX, and DKIM are ready to copy into the registrar.',
    bodyText:
      'The domain check finished. Publish the TXT record first, then the MX and DKIM records. Tell me when the registrar has saved them and I will run the check again.',
    receivedAt: hoursAgo(1),
    unread: true,
  },
  {
    id: 'sample-invoice',
    mailbox: 'inbox',
    fromName: 'Accounts',
    fromAddress: 'billing@example.com',
    subject: 'November invoice is ready',
    preview: 'The invoice for this month is attached as a summary below.',
    bodyText:
      'Your November invoice is ready in the billing area. This sample has no attachment. The amount and tax lines will show there once billing is connected.',
    receivedAt: hoursAgo(3),
    unread: true,
  },
  {
    id: 'sample-support',
    mailbox: 'inbox',
    fromName: 'Alex Chen',
    fromAddress: 'alex@example.com',
    subject: 'Access to the support mailbox',
    preview: 'Please add me as a reader on support@ for the week.',
    bodyText:
      'I am covering support next week. Please add me as a reader on the shared mailbox. I do not need permission to send.',
    receivedAt: hoursAgo(20),
    unread: false,
  },
  {
    id: 'sample-notes',
    mailbox: 'inbox',
    fromName: 'Jordan Lee',
    fromAddress: 'jordan@example.com',
    subject: 'Notes from this morning',
    preview: 'Three follow-ups from the onboarding call.',
    bodyText:
      'Three follow-ups from this morning: confirm the mailbox name, send the app password steps, and book a time to review folders.',
    receivedAt: hoursAgo(26),
    unread: false,
  },
  {
    id: 'sample-away',
    mailbox: 'inbox',
    fromName: 'Office',
    fromAddress: 'office@example.com',
    subject: 'Out of office next week',
    preview: 'I will be away Monday and back on Tuesday afternoon.',
    bodyText:
      'I will be away on Monday and back Tuesday afternoon. Mail sent to me will wait until then. Urgent notes can go to the office list.',
    receivedAt: hoursAgo(50),
    unread: false,
  },
  {
    id: 'sample-sent',
    mailbox: 'sent',
    fromName: 'You',
    fromAddress: 'you@example.com',
    subject: 'Introduction for the new mailbox',
    preview: 'The mailbox is open. Reply here if a message bounces.',
    bodyText:
      'The new mailbox is open. Reply here if a message bounces and I will check the domain records.',
    receivedAt: hoursAgo(5),
    unread: false,
  },
  {
    id: 'sample-draft',
    mailbox: 'drafts',
    fromName: 'You',
    fromAddress: 'you@example.com',
    subject: 'Draft reply about DNS',
    preview: 'Still writing the note about the TXT record.',
    bodyText: 'Still writing the note about the TXT record.',
    receivedAt: hoursAgo(2),
    unread: false,
  },
  {
    id: 'sample-archive',
    mailbox: 'archive',
    fromName: 'Sam Patel',
    fromAddress: 'sam@example.com',
    subject: 'Welcome notes',
    preview: 'Glad the mailbox is in place. Nothing else needed today.',
    bodyText: 'Glad the mailbox is in place. Nothing else is needed from me today.',
    receivedAt: hoursAgo(72),
    unread: false,
  },
];
