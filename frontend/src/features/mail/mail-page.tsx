import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ChevronLeft, FileEdit, Inbox, Send, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Icon } from '../../components/ui/icon';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ErrorNote, Field, TextArea } from '../../components/ui/field';
import { readLive, writeLive, ApiProblem } from '../../lib/api';
import { formatWhen } from '../../lib/dates';
import { useSession } from '../../lib/session';
import {
  FOLDERS,
  parseThread,
  parseThreads,
  type FolderId,
  type MailThread,
} from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';
import { MessageFrame, blockedImageCount } from './message-frame';
import type { ErrorCode } from '@mrrokesh/shared';

const FOLDER_LABEL: Record<FolderId, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  archive: 'Archive',
  spam: 'Spam',
};

const FOLDER_ICON = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  archive: Archive,
  spam: ShieldAlert,
} as const;

const composeSchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(20000),
});

function matches(thread: MailThread, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const from = /^from:(.+)$/.exec(needle);
  if (from?.[1]) {
    const who = from[1].trim();
    return (
      thread.fromEmail.toLowerCase().includes(who) || thread.fromName.toLowerCase().includes(who)
    );
  }
  return [thread.subject, thread.fromName, thread.fromEmail, thread.preview].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export function MailPage() {
  useDocumentTitle('Mail');
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const requested = params.get('thread');
  const threads = useQuery({
    queryKey: ['mail', 'threads'],
    queryFn: () => readLive('/mail/threads', parseThreads),
    staleTime: 5 * 60 * 1000,
  });
  const [folder, setFolder] = useState<FolderId>('inbox');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(requested);
  const [pane, setPane] = useState<'folders' | 'list' | 'read'>(requested ? 'read' : 'list');
  const [composeOpen, setComposeOpen] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const visible = useMemo(() => {
    return (threads.data ?? []).filter(
      (thread) => thread.folder === folder && matches(thread, query),
    );
  }, [folder, query, threads.data]);

  const visibleKey = visible.map((thread) => thread.id).join('|');

  useEffect(() => {
    if (!requested || !threads.data) return;
    const match = threads.data.find((thread) => thread.id === requested);
    if (!match) return;
    setFolder(match.folder);
    setSelectedId(match.id);
  }, [requested, threads.data]);

  useEffect(() => {
    if (visible.some((thread) => thread.id === selectedId)) return;
    setSelectedId(visible[0]?.id ?? null);
  }, [selectedId, visible, visibleKey]);

  const selected = visible.find((thread) => thread.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    queryClient.setQueryData<MailThread[]>(['mail', 'threads'], (current) =>
      current?.map((thread) =>
        thread.id === selectedId && thread.unread ? { ...thread, unread: false } : thread,
      ),
    );
  }, [queryClient, selectedId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, dialog'))
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (composeOpen) return;
      const index = visible.findIndex((thread) => thread.id === selectedId);
      if (event.key === 'j' || event.key === 'ArrowDown') {
        const next = visible[Math.min(index + 1, visible.length - 1)];
        if (next) setSelectedId(next.id);
        event.preventDefault();
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        const next = visible[Math.max(index - 1, 0)];
        if (next) setSelectedId(next.id);
        event.preventDefault();
      } else if (event.key === 'c') {
        setComposeOpen(true);
      } else if (event.key === 'Enter' && selected) {
        setPane('read');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [composeOpen, selected, selectedId, visible]);

  function openThread(id: string) {
    setSelectedId(id);
    setShowImages(false);
    setPane('read');
  }

  async function onSend(event: FormEvent) {
    event.preventDefault();
    const parsed = composeSchema.safeParse({ to, subject, text });
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.path[0];
      setCode(issue === 'to' ? 'API-MAIL-005' : 'API-VAL-001');
      return;
    }
    if (!user) return;
    setPending(true);
    setCode(null);
    try {
      const result = await writeLive(
        '/mail/messages',
        { method: 'POST', body: JSON.stringify(parsed.data) },
        parseThread,
      );
      queryClient.setQueryData<MailThread[]>(['mail', 'threads'], (current = []) => [
        result.data,
        ...current.filter((thread) => thread.id !== result.data.id),
      ]);
      setComposeOpen(false);
      setTo('');
      setSubject('');
      setText('');
      setFolder('sent');
      setSelectedId(result.data.id);
      setPane('read');
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  const counts = FOLDERS.map((id) => ({
    id,
    label: FOLDER_LABEL[id],
    count: (threads.data ?? []).filter((thread) => thread.folder === id).length,
  }));

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">Mail</h1>
      <section className="pane pane-nav" aria-label="Folders">
        <button
          type="button"
          className="btn btn-primary folder-compose"
          onClick={() => setComposeOpen(true)}
        >
          Compose
        </button>
        {counts.map((item) => (
          <button
            key={item.id}
            type="button"
            className="folder"
            aria-current={folder === item.id ? 'page' : undefined}
            onClick={() => {
              setFolder(item.id);
              setPane('list');
            }}
          >
            <span className="cluster">
              <Icon icon={FOLDER_ICON[item.id]} />
              <span>{item.label}</span>
            </span>
            <span className="caption muted">{item.count}</span>
          </button>
        ))}
      </section>
      <section className="pane pane-list" aria-label="Message list">
        <div className="pane-head">
          <button
            type="button"
            className="icon-btn mobile-only"
            aria-label="Show folders"
            onClick={() => setPane('folders')}
          >
            <Icon icon={ChevronLeft} />
          </button>
          <label className="visually-hidden" htmlFor="mail-search">
            Search mail
          </label>
          <input
            id="mail-search"
            className="input"
            type="search"
            placeholder="Search or from:name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {threads.isPending ? <SkeletonLines /> : null}
        {!threads.isPending && visible.length === 0 ? (
          <p className="read muted">No messages in this view.</p>
        ) : null}
        <div role="listbox" aria-label={FOLDER_LABEL[folder]}>
          {visible.map((thread) => (
            <button
              key={thread.id}
              type="button"
              role="option"
              className="thread"
              aria-selected={thread.id === selected?.id}
              onClick={() => openThread(thread.id)}
            >
              <span className="thread-top">
                <span className={thread.unread ? 'strong' : undefined}>{thread.fromName}</span>
                <span className="caption muted">{formatWhen(thread.receivedAt)}</span>
              </span>
              <span className={thread.unread ? 'strong' : undefined}>{thread.subject}</span>
              <span className="muted">{thread.preview}</span>
            </button>
          ))}
        </div>
      </section>
      <article className="pane pane-read" aria-label="Reading pane">
        {selected ? (
          <div className="read">
            <button
              type="button"
              className="btn btn-text mobile-only"
              onClick={() => setPane('list')}
            >
              Back to list
            </button>
            <h2 className="h3">{selected.subject}</h2>
            <p className="caption muted break">
              {selected.fromName} · {selected.fromEmail} to {selected.toEmail}
            </p>
            {blockedImageCount(selected.bodyHtml) > 0 ? (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setShowImages((value) => !value)}
              >
                {showImages ? 'Hide images' : 'Show images'}
              </button>
            ) : null}
            <MessageFrame html={selected.bodyHtml} allowImages={showImages} />
          </div>
        ) : (
          <div className="empty-read">
            <p className="h3">{FOLDER_LABEL[folder]} is clear</p>
            <p className="muted">Messages you receive will stay in this pane.</p>
            <button type="button" className="btn btn-primary" onClick={() => setComposeOpen(true)}>
              Compose message
            </button>
          </div>
        )}
      </article>
      <Sheet open={composeOpen} title="New message" onClose={() => setComposeOpen(false)}>
        <form className="sheet-form" onSubmit={onSend} noValidate>
          <Field
            label="To"
            type="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            autoComplete="email"
          />
          <Field
            label="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          <TextArea
            label="Message"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Sending message' : 'Send message'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
