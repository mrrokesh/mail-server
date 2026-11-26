import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Check,
  CheckSquare,
  ChevronLeft,
  Clock,
  Download,
  FileEdit,
  Forward,
  Inbox,
  Mail,
  PenSquare,
  Reply,
  ReplyAll,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field, SelectField, TextArea } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Avatar, Badge, EmptyState, QuotaMeter } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readLive, readToken, writeLive } from '../../lib/api';
import { formatWhen } from '../../lib/dates';
import {
  FOLDERS,
  parseThread,
  parseThreads,
  type FolderId,
  type MailThread,
} from '../../lib/schemas';
import { useSession } from '../../lib/session';
import { useDocumentTitle } from '../../lib/use-document-title';
import { MessageFrame, blockedImageCount } from './message-frame';

const FOLDER_LABEL: Record<FolderId, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  snoozed: 'Snoozed',
  archive: 'Archive',
  spam: 'Spam',
  trash: 'Trash',
};

const FOLDER_ICON = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  snoozed: Clock,
  archive: Archive,
  spam: ShieldAlert,
  trash: Trash2,
} as const;

const composeSchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(20000),
});

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  subject: z.string(),
  bodyText: z.string(),
});

const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  field: z.enum(['from', 'to', 'subject', 'body']),
  operator: z.enum(['contains', 'equals', 'ends_with']),
  value: z.string(),
  action: z.enum(['move_folder', 'add_label', 'star', 'mark_read']),
  actionTarget: z.string(),
  compiledSieve: z.string(),
});

const prefsSchema = z.object({
  signatureHtml: z.string(),
  vacationEnabled: z.boolean(),
  vacationSubject: z.string(),
  vacationInternal: z.string(),
  vacationExternal: z.string(),
  undoSendSec: z.number(),
  shortcutPreset: z.enum(['gmail', 'outlook']),
  readingPane: z.enum(['right', 'bottom', 'off']),
  focusedInbox: z.boolean(),
});

function matches(thread: MailThread, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (needle === 'is:unread') return thread.unread;
  if (needle === 'is:starred') return Boolean(thread.starred);
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
  const navigate = useNavigate();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const requested = params.get('thread');

  const threads = useQuery({
    queryKey: ['mail', 'threads'],
    queryFn: () => readLive('/mail/threads', parseThreads),
    staleTime: 60 * 1000,
  });

  const templatesQuery = useQuery({
    queryKey: ['mail', 'templates'],
    queryFn: () =>
      readLive('/mail/templates', (input) => {
        const p = z.object({ templates: z.array(templateSchema) }).safeParse(input);
        return p.success ? p.data.templates : null;
      }),
  });

  const rulesQuery = useQuery({
    queryKey: ['mail', 'rules'],
    queryFn: () =>
      readLive('/mail/rules', (input) => {
        const p = z.object({ rules: z.array(ruleSchema) }).safeParse(input);
        return p.success ? p.data.rules : null;
      }),
  });

  const prefsQuery = useQuery({
    queryKey: ['mail', 'preferences'],
    queryFn: () =>
      readLive('/mail/preferences', (input) => {
        const p = prefsSchema.safeParse(input);
        return p.success ? p.data : null;
      }),
  });

  const mailboxesQuery = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () =>
      readLive('/mailboxes', (input) => {
        const p = z
          .array(
            z.object({
              id: z.string(),
              address: z.string(),
              usedBytes: z.number(),
              quotaBytes: z.number(),
            }),
          )
          .safeParse(input);
        return p.success ? p.data : null;
      }),
  });

  const [folder, setFolder] = useState<FolderId>('inbox');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'starred'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(requested);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [pane, setPane] = useState<'folders' | 'list' | 'read'>(requested ? 'read' : 'list');
  const [composeOpen, setComposeOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [quickReply, setQuickReply] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  // Rules & Preferences state
  const [ruleName, setRuleName] = useState('');
  const [ruleField, setRuleField] = useState<'from' | 'to' | 'subject' | 'body'>('subject');
  const [ruleOp, setRuleOp] = useState<'contains' | 'equals' | 'ends_with'>('contains');
  const [ruleVal, setRuleVal] = useState('');
  const [ruleAction, setRuleAction] = useState<'move_folder' | 'add_label' | 'star' | 'mark_read'>(
    'move_folder',
  );
  const [ruleTarget, setRuleTarget] = useState('Archive');
  const [sigDraft, setSigDraft] = useState('');
  const [oooEnabled, setOooEnabled] = useState(false);
  const [oooBody, setOooBody] = useState('');

  useEffect(() => {
    if (prefsQuery.data) {
      setSigDraft(prefsQuery.data.signatureHtml);
      setOooEnabled(prefsQuery.data.vacationEnabled);
      setOooBody(prefsQuery.data.vacationExternal);
    }
  }, [prefsQuery.data]);

  useEffect(() => {
    if (params.get('compose') === '1') {
      const preTo = params.get('to');
      if (preTo) setTo(preTo);
      setComposeOpen(true);
      params.delete('compose');
      params.delete('to');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const allThreads = useMemo(() => threads.data ?? [], [threads.data]);

  const visible = useMemo(() => {
    return allThreads.filter((thread) => {
      if (thread.folder !== folder) return false;
      if (filterMode === 'unread' && !thread.unread) return false;
      if (filterMode === 'starred' && !thread.starred) return false;
      return matches(thread, query);
    });
  }, [allThreads, filterMode, folder, query]);

  useEffect(() => {
    if (!requested || allThreads.length === 0) return;
    const match = allThreads.find((thread) => thread.id === requested);
    if (!match) return;
    setFolder(match.folder);
    setSelectedId(match.id);
  }, [allThreads, requested]);

  useEffect(() => {
    if (visible.some((thread) => thread.id === selectedId)) return;
    setSelectedId(visible[0]?.id ?? null);
  }, [selectedId, visible]);

  const selected = visible.find((thread) => thread.id === selectedId) ?? null;

  function showBanner(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }

  async function patchThread(
    id: string,
    patch: Partial<{
      folder: FolderId;
      unread: boolean;
      starred: boolean;
      snoozeUntil: string | null;
    }>,
  ) {
    queryClient.setQueryData<MailThread[]>(['mail', 'threads'], (current = []) =>
      current.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
    try {
      await writeLive(
        `/mail/messages/${id}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
        (input) => Boolean(input),
      );
    } catch {
      void queryClient.invalidateQueries({ queryKey: ['mail', 'threads'] });
    }
  }

  async function bulkMove(targetFolder: FolderId) {
    if (checkedIds.length === 0) return;
    const ids = [...checkedIds];
    setCheckedIds([]);
    queryClient.setQueryData<MailThread[]>(['mail', 'threads'], (current = []) =>
      current.map((t) => (ids.includes(t.id) ? { ...t, folder: targetFolder } : t)),
    );
    await writeLive(
      '/mail/messages/bulk',
      { method: 'POST', body: JSON.stringify({ ids, folder: targetFolder }) },
      (input) => Boolean(input),
    );
    showBanner(`Moved ${ids.length} message(s) to ${FOLDER_LABEL[targetFolder]}.`);
  }

  function openThread(thread: MailThread) {
    setSelectedId(thread.id);
    setShowImages(false);
    setAiSummary(null);
    setPane('read');
    if (thread.unread) {
      void patchThread(thread.id, { unread: false });
    }
  }

  function startReply(mode: 'reply' | 'replyAll' | 'forward') {
    if (!selected) return;
    setTo(mode === 'forward' ? '' : selected.fromEmail);
    setSubject(
      mode === 'forward'
        ? `Fwd: ${selected.subject.replace(/^Fwd:\s*/i, '')}`
        : `Re: ${selected.subject.replace(/^Re:\s*/i, '')}`,
    );
    const quote = selected.bodyText ?? selected.preview;
    setText(`\n\n--- ${selected.fromName} <${selected.fromEmail}> wrote ---\n${quote}`);
    setComposeOpen(true);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, dialog'))
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (composeOpen || rulesOpen) return;
      const index = visible.findIndex((thread) => thread.id === selectedId);
      if (event.key === 'j' || event.key === 'ArrowDown') {
        const next = visible[Math.min(index + 1, visible.length - 1)];
        if (next) openThread(next);
        event.preventDefault();
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        const next = visible[Math.max(index - 1, 0)];
        if (next) openThread(next);
        event.preventDefault();
      } else if (event.key === 'c') {
        setComposeOpen(true);
      } else if (event.key === 'r' && selected) {
        startReply('reply');
      } else if (event.key === 'e' && selected) {
        void patchThread(selected.id, { folder: 'archive' });
        showBanner('Archived conversation.');
      } else if (event.key === 's' && selected) {
        void patchThread(selected.id, { starred: !selected.starred });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
    const bodyWithSig = sigDraft.trim()
      ? `${parsed.data.text}\n\n--\n${sigDraft.trim()}`
      : parsed.data.text;
    try {
      const result = await writeLive(
        '/mail/messages',
        {
          method: 'POST',
          body: JSON.stringify({ ...parsed.data, text: bodyWithSig }),
        },
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
      showBanner(`Sent to ${parsed.data.to}.`);
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  async function onSaveDraft() {
    setCode(null);
    try {
      const saved = await writeLive(
        '/mail/drafts',
        {
          method: 'POST',
          body: JSON.stringify({
            to: to.trim() ? [to.trim()] : [],
            subject: subject.trim(),
            bodyText: text,
          }),
        },
        (input) => Boolean(input),
      );
      if (saved.data) {
        setComposeOpen(false);
        setFolder('drafts');
        await queryClient.invalidateQueries({ queryKey: ['mail', 'threads'] });
        showBanner('Draft saved.');
      }
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function onQuickReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || !quickReply.trim()) return;
    setPending(true);
    try {
      const result = await writeLive(
        '/mail/messages',
        {
          method: 'POST',
          body: JSON.stringify({
            to: selected.fromEmail,
            subject: `Re: ${selected.subject.replace(/^Re:\s*/i, '')}`,
            text: quickReply.trim(),
          }),
        },
        parseThread,
      );
      queryClient.setQueryData<MailThread[]>(['mail', 'threads'], (current = []) => [
        result.data,
        ...current,
      ]);
      setQuickReply('');
      showBanner(`Reply sent to ${selected.fromEmail}.`);
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  async function onCreateTaskFromMail() {
    if (!selected) return;
    await writeLive(
      '/tasks',
      {
        method: 'POST',
        body: JSON.stringify({ title: `Follow up: ${selected.subject}`, priority: 'normal' }),
      },
      (input) => Boolean(input),
    );
    showBanner('Added to Tasks.');
  }

  async function onAiSummarize() {
    if (!selected) return;
    try {
      const res = await writeLive(
        '/ai/summarize',
        { method: 'POST', body: JSON.stringify({ text: selected.bodyText ?? selected.preview }) },
        (input) => {
          const p = z.object({ summary: z.string() }).safeParse(input);
          return p.success ? p.data : null;
        },
      );
      setAiSummary(res.data.summary);
    } catch (error) {
      const problem = error instanceof ApiProblem ? error.message : 'AI summary unavailable.';
      setAiSummary(problem);
    }
  }

  async function onDownloadEml() {
    if (!selected) return;
    const token = readToken();
    const res = await fetch(`/api/v1/mail/messages/${selected.id}/eml`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selected.id}.eml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onAddRule(event: FormEvent) {
    event.preventDefault();
    if (!ruleName.trim() || !ruleVal.trim()) return;
    await writeLive(
      '/mail/rules',
      {
        method: 'POST',
        body: JSON.stringify({
          name: ruleName.trim(),
          field: ruleField,
          operator: ruleOp,
          value: ruleVal.trim(),
          action: ruleAction,
          actionTarget: ruleTarget.trim() || 'Archive',
        }),
      },
      (input) => Boolean(input),
    );
    setRuleName('');
    setRuleVal('');
    await queryClient.invalidateQueries({ queryKey: ['mail', 'rules'] });
  }

  async function onSavePrefs(event: FormEvent) {
    event.preventDefault();
    await writeLive(
      '/mail/preferences',
      {
        method: 'PUT',
        body: JSON.stringify({
          signatureHtml: sigDraft,
          vacationEnabled: oooEnabled,
          vacationExternal: oooBody,
        }),
      },
      (input) => Boolean(input),
    );
    await queryClient.invalidateQueries({ queryKey: ['mail', 'preferences'] });
    showBanner('Mail preferences saved.');
    setRulesOpen(false);
  }

  const mailboxes = mailboxesQuery.data ?? [];
  const totalQuotaBytes = mailboxes.reduce((s, m) => s + m.quotaBytes, 0) || 5 * 1024 ** 3;
  const totalUsedBytes = mailboxes.reduce((s, m) => s + m.usedBytes, 0);
  const usedMb = (totalUsedBytes / (1024 * 1024)).toFixed(1);
  const quotaGb = Math.max(1, Math.round(totalQuotaBytes / 1024 ** 3));
  const usedPct = (totalUsedBytes / totalQuotaBytes) * 100;

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">Mail</h1>

      <section className="pane pane-nav" aria-label="Folders">
        <button
          type="button"
          className="btn btn-primary folder-compose"
          onClick={() => {
            setTo('');
            setSubject('');
            setText('');
            setComposeOpen(true);
          }}
        >
          <Icon icon={PenSquare} size={17} />
          <span>Compose</span>
        </button>

        <div className="folder-list">
          {FOLDERS.map((id) => {
            const items = allThreads.filter((t) => t.folder === id);
            const unread = items.filter((t) => t.unread).length;
            const count = id === 'inbox' ? unread || items.length : items.length;
            return (
              <button
                key={id}
                type="button"
                className="folder"
                aria-current={folder === id ? 'page' : undefined}
                onClick={() => {
                  setFolder(id);
                  setCheckedIds([]);
                  setPane('list');
                }}
              >
                <span className="cluster-2">
                  <Icon icon={FOLDER_ICON[id]} size={17} />
                  <span>{FOLDER_LABEL[id]}</span>
                </span>
                {count > 0 ? (
                  <span
                    className={
                      id === 'inbox' && unread > 0 ? 'badge badge-brand' : 'caption muted tabular'
                    }
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="pane-note">
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            style={{ width: '100%' }}
            onClick={() => setRulesOpen(true)}
          >
            <Icon icon={Settings} size={15} />
            <span>Rules &amp; signature</span>
          </button>
        </div>

        <div className="mail-storage-foot">
          <QuotaMeter
            label="Mailbox storage"
            usedLabel={`${usedMb} MB / ${quotaGb} GB`}
            percent={usedPct}
          />
          {mailboxes.length === 0 ? (
            <Link className="caption strong" to="/admin/domains">
              Connect domain &amp; mailbox
            </Link>
          ) : (
            <span className="caption muted truncate">{mailboxes[0]?.address}</span>
          )}
        </div>
      </section>

      <section className="pane pane-list" aria-label="Message list">
        <div className="pane-head">
          <button
            type="button"
            className="icon-btn icon-btn-sm mobile-only"
            aria-label="Show folders"
            onClick={() => setPane('folders')}
          >
            <Icon icon={ChevronLeft} size={18} />
          </button>
          <label className="visually-hidden" htmlFor="mail-search">
            Search mail
          </label>
          <input
            id="mail-search"
            className="input"
            type="search"
            placeholder="Search mail or from:name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="filter-strip">
          {(['all', 'unread', 'starred'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className="chip"
              aria-pressed={filterMode === mode}
              onClick={() => setFilterMode(mode)}
            >
              {mode === 'all' ? 'All' : mode === 'unread' ? 'Unread' : 'Starred'}
            </button>
          ))}
          {checkedIds.length > 0 ? (
            <>
              <button type="button" className="chip" onClick={() => void bulkMove('archive')}>
                Archive ({checkedIds.length})
              </button>
              <button type="button" className="chip" onClick={() => void bulkMove('trash')}>
                Trash
              </button>
            </>
          ) : null}
        </div>

        {threads.isPending ? (
          <div className="pane-note">
            <SkeletonLines count={5} />
          </div>
        ) : null}

        {!threads.isPending && visible.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={`${FOLDER_LABEL[folder]} is clear`}
            description={
              mailboxes.length === 0
                ? 'Connect a domain and create your first mailbox in Admin to start sending and receiving mail.'
                : 'No messages match this folder or filter.'
            }
            action={
              mailboxes.length === 0 ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/admin/domains')}
                >
                  Connect domain
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => setComposeOpen(true)}
                >
                  Compose message
                </button>
              )
            }
          />
        ) : null}

        <div role="listbox" aria-label={FOLDER_LABEL[folder]}>
          {visible.map((thread) => {
            const isChecked = checkedIds.includes(thread.id);
            return (
              <div
                key={thread.id}
                role="option"
                className="thread-row"
                aria-selected={thread.id === selected?.id}
              >
                <div className="stack-2" style={{ justifyItems: 'center', paddingTop: 2 }}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${thread.subject}`}
                    checked={isChecked}
                    onChange={() =>
                      setCheckedIds((prev) =>
                        prev.includes(thread.id)
                          ? prev.filter((id) => id !== thread.id)
                          : [...prev, thread.id],
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm"
                    aria-label={thread.starred ? 'Remove star' : 'Star message'}
                    onClick={() => void patchThread(thread.id, { starred: !thread.starred })}
                  >
                    <Icon icon={Star} size={15} />
                  </button>
                </div>
                <button type="button" className="thread-row-btn" onClick={() => openThread(thread)}>
                  <span className="thread-top">
                    <span className="cluster-2 truncate">
                      {thread.unread ? <span className="unread-dot" aria-hidden="true" /> : null}
                      <span
                        className={thread.unread ? 'caption strong truncate' : 'caption truncate'}
                      >
                        {thread.fromName}
                      </span>
                    </span>
                    <span className="caption muted tabular">{formatWhen(thread.receivedAt)}</span>
                  </span>
                  <span className={thread.unread ? 'caption strong truncate' : 'caption truncate'}>
                    {thread.subject}
                  </span>
                  <span className="thread-preview">{thread.preview}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <article className="pane pane-read" aria-label="Reading pane">
        {selected ? (
          <>
            <div className="read-toolbar">
              <div className="cluster-2">
                <button
                  type="button"
                  className="btn btn-text mobile-only"
                  onClick={() => setPane('list')}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => startReply('reply')}
                >
                  <Icon icon={Reply} size={15} />
                  <span>Reply</span>
                </button>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => startReply('replyAll')}
                >
                  <Icon icon={ReplyAll} size={15} />
                  <span>Reply all</span>
                </button>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => startReply('forward')}
                >
                  <Icon icon={Forward} size={15} />
                  <span>Forward</span>
                </button>
              </div>
              <div className="cluster-2">
                <button
                  type="button"
                  className="icon-btn icon-btn-sm"
                  title="Snooze until tomorrow"
                  aria-label="Snooze conversation"
                  onClick={() => {
                    void patchThread(selected.id, {
                      folder: 'snoozed',
                      snoozeUntil: new Date(Date.now() + 86_400_000).toISOString(),
                    });
                    showBanner('Snoozed for 24 hours.');
                  }}
                >
                  <Icon icon={Clock} size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm"
                  title="Archive (E)"
                  aria-label="Archive conversation"
                  onClick={() => {
                    void patchThread(selected.id, { folder: 'archive' });
                    showBanner('Moved to Archive.');
                  }}
                >
                  <Icon icon={Archive} size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm"
                  title="Turn into Task"
                  aria-label="Create task from message"
                  onClick={() => void onCreateTaskFromMail()}
                >
                  <Icon icon={CheckSquare} size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm"
                  title="AI Summarize"
                  aria-label="Summarize thread with AI"
                  onClick={() => void onAiSummarize()}
                >
                  <Icon icon={Sparkles} size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm"
                  title="Download .EML"
                  aria-label="Download raw EML"
                  onClick={() => void onDownloadEml()}
                >
                  <Icon icon={Download} size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm"
                  title="Move to Trash"
                  aria-label="Move to Trash"
                  onClick={() => {
                    void patchThread(selected.id, { folder: 'trash' });
                    showBanner('Moved to Trash.');
                  }}
                >
                  <Icon icon={Trash2} size={16} />
                </button>
              </div>
            </div>

            <div className="read">
              <header className="read-header">
                <div className="spread">
                  <h2 className="h3">{selected.subject}</h2>
                  <Badge tone="success">
                    <Icon icon={ShieldCheck} size={12} />
                    <span>Sandboxed</span>
                  </Badge>
                </div>
                <div className="sender-row">
                  <div className="cluster">
                    <Avatar name={selected.fromName} />
                    <div>
                      <p className="caption strong">{selected.fromName}</p>
                      <p className="caption muted break">
                        {selected.fromEmail} to {selected.toEmail || 'you'}
                      </p>
                    </div>
                  </div>
                  <span className="caption muted tabular">{formatWhen(selected.receivedAt)}</span>
                </div>
              </header>

              {aiSummary ? (
                <div className="privacy-bar">
                  <div className="stack-2">
                    <span className="caption strong">Thread summary</span>
                    <p className="caption">{aiSummary}</p>
                  </div>
                </div>
              ) : null}

              {blockedImageCount(selected.bodyHtml) > 0 ? (
                <div className="privacy-bar">
                  <span className="caption muted">
                    Remote images are blocked to protect your privacy (WEB-IMG-001).
                  </span>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => setShowImages((value) => !value)}
                  >
                    {showImages ? 'Hide images' : 'Show images'}
                  </button>
                </div>
              ) : null}

              <MessageFrame html={selected.bodyHtml} allowImages={showImages} />

              <form className="quick-reply" onSubmit={(event) => void onQuickReply(event)}>
                <label className="caption strong" htmlFor="quick-reply-input">
                  Quick reply to {selected.fromName}
                </label>
                <textarea
                  id="quick-reply-input"
                  className="textarea"
                  style={{ minHeight: 88 }}
                  placeholder="Write a reply..."
                  value={quickReply}
                  onChange={(event) => setQuickReply(event.target.value)}
                />
                <div className="spread">
                  <span className="caption muted">Press R for full composer</span>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={pending || !quickReply.trim()}
                  >
                    <Icon icon={Send} size={14} />
                    <span>Send reply</span>
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Inbox}
            title="Select a conversation"
            description="Choose a message from the list, or compose a new email from your custom domain."
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setComposeOpen(true)}
              >
                Compose message
              </button>
            }
          />
        )}
      </article>

      <Sheet open={composeOpen} title="New message" size="lg" onClose={() => setComposeOpen(false)}>
        <form className="sheet-form" onSubmit={(event) => void onSend(event)} noValidate>
          {templatesQuery.data && templatesQuery.data.length > 0 ? (
            <SelectField
              label="Insert template"
              value=""
              onChange={(event) => {
                const tpl = templatesQuery.data?.find((item) => item.id === event.target.value);
                if (!tpl) return;
                setSubject(tpl.subject);
                setText(tpl.bodyText);
              }}
            >
              <option value="">Choose a saved template...</option>
              {templatesQuery.data.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.category})
                </option>
              ))}
            </SelectField>
          ) : null}
          <Field
            label="To"
            type="email"
            placeholder="kavya@client.example"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
          />
          <Field
            label="Subject"
            placeholder="Quarterly update"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />
          <TextArea
            label="Message"
            placeholder="Write your message..."
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
          />
          {code ? <ErrorNote code={code} /> : null}
          <div className="spread">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => void onSaveDraft()}
              disabled={pending}
            >
              Save draft
            </button>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              <Icon icon={Send} size={16} />
              <span>{pending ? 'Sending...' : 'Send message'}</span>
            </button>
          </div>
        </form>
      </Sheet>

      <Sheet
        open={rulesOpen}
        title="Mail preferences & Sieve rules"
        size="lg"
        onClose={() => setRulesOpen(false)}
      >
        <div className="stack-6" style={{ marginTop: 16 }}>
          <form className="stack" onSubmit={(event) => void onSavePrefs(event)}>
            <h3 className="strong">Signature &amp; Out of office</h3>
            <TextArea
              label="Email signature"
              style={{ minHeight: 80 }}
              value={sigDraft}
              placeholder="Ada Iyer · Northwind Studio"
              onChange={(event) => setSigDraft(event.target.value)}
            />
            <label className="check" style={{ paddingInline: 0 }}>
              <input
                type="checkbox"
                checked={oooEnabled}
                onChange={(event) => setOooEnabled(event.target.checked)}
              />
              <span>Enable automatic out-of-office reply</span>
            </label>
            {oooEnabled ? (
              <TextArea
                label="Auto-reply message"
                style={{ minHeight: 72 }}
                value={oooBody}
                onChange={(event) => setOooBody(event.target.value)}
              />
            ) : null}
            <button className="btn btn-primary btn-sm" type="submit">
              Save preferences
            </button>
          </form>

          <form className="stack" onSubmit={(event) => void onAddRule(event)}>
            <h3 className="strong">Visual Sieve filter rules</h3>
            <div className="two-col">
              <Field
                label="Rule name"
                placeholder="Archive GST invoices"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
              />
              <SelectField
                label="When field"
                value={ruleField}
                onChange={(e) => setRuleField(e.target.value as typeof ruleField)}
              >
                <option value="subject">Subject</option>
                <option value="from">From</option>
                <option value="to">To</option>
                <option value="body">Body</option>
              </SelectField>
            </div>
            <div className="two-col">
              <SelectField
                label="Condition"
                value={ruleOp}
                onChange={(e) => setRuleOp(e.target.value as typeof ruleOp)}
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="ends_with">Ends with</option>
              </SelectField>
              <Field
                label="Match value"
                placeholder="GST Invoice"
                value={ruleVal}
                onChange={(e) => setRuleVal(e.target.value)}
              />
            </div>
            <div className="two-col">
              <SelectField
                label="Action"
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value as typeof ruleAction)}
              >
                <option value="move_folder">Move to folder</option>
                <option value="add_label">Add label</option>
                <option value="star">Star message</option>
                <option value="mark_read">Mark as read</option>
              </SelectField>
              <Field
                label="Target"
                value={ruleTarget}
                onChange={(e) => setRuleTarget(e.target.value)}
              />
            </div>
            <button className="btn btn-quiet btn-sm" type="submit">
              Add Sieve rule
            </button>
          </form>

          {(rulesQuery.data ?? []).length > 0 ? (
            <div className="stack-2">
              {(rulesQuery.data ?? []).map((rule) => (
                <div key={rule.id} className="card">
                  <div className="spread">
                    <span className="caption strong">{rule.name}</span>
                    <Badge tone="brand">{rule.action}</Badge>
                  </div>
                  <pre className="mono" style={{ marginTop: 8, overflowX: 'auto' }}>
                    {rule.compiledSieve}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Sheet>

      {toast ? (
        <div className="toast-bar" role="status" aria-live="polite">
          <Icon icon={Check} size={16} />
          <span className="caption">{toast}</span>
        </div>
      ) : null}
    </div>
  );
}
