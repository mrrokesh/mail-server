import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, MessageSquare, Plus, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { formatWhen } from '../../lib/dates';
import { useDocumentTitle } from '../../lib/use-document-title';

const conversationSchema = z.object({
  id: z.string(),
  kind: z.enum(['direct', 'group', 'channel']),
  title: z.string(),
  memberUserIds: z.array(z.string()),
});

const messageSchema = z.object({
  id: z.string(),
  threadRootId: z.string().nullable(),
  authorUserId: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

const listSchema = z.object({
  engine: z.literal('mrrokesh-chat'),
  adapter: z.enum(['memory', 'postgres']),
  conversations: z.array(conversationSchema),
});

type Conversation = z.infer<typeof conversationSchema>;

export function ChatPage() {
  useDocumentTitle('Team Chat');
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () =>
      readOrFallback(
        '/chat/conversations',
        (input) => {
          const parsed = listSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null,
      ),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'direct' | 'group' | 'channel'>('channel');
  const [title, setTitle] = useState('');
  const [memberId, setMemberId] = useState('');
  const [body, setBody] = useState('');
  const [threadRootId, setThreadRootId] = useState<string | null>(null);
  const [code, setCode] = useState<ErrorCode | null>(null);

  const conversations = list.data?.conversations ?? [];
  const selected = conversations.find((row) => row.id === selectedId) ?? conversations[0] ?? null;

  const messages = useQuery({
    queryKey: ['chat', 'messages', selected?.id ?? 'none'],
    enabled: Boolean(selected?.id),
    queryFn: () =>
      readOrFallback(
        `/chat/conversations/${selected?.id ?? ''}/messages`,
        (input) => {
          const parsed = z.object({ messages: z.array(messageSchema) }).safeParse(input);
          return parsed.success ? parsed.data.messages : null;
        },
        [],
      ),
  });

  async function createConversation(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    const memberUserIds = memberId.trim() ? [memberId.trim()] : [];
    try {
      const created = await writeOrFallback(
        '/chat/conversations',
        {
          method: 'POST',
          body: JSON.stringify({
            kind,
            title: title.trim(),
            ...(memberUserIds.length > 0 ? { memberUserIds } : {}),
          }),
        },
        (input) => {
          const parsed = conversationSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        () => null,
      );
      if (!created.data) {
        setCode('API-VAL-001');
        return;
      }
      setTitle('');
      setOpen(false);
      setSelectedId(created.data.id);
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !body.trim()) return;
    setCode(null);
    try {
      await writeOrFallback(
        `/chat/conversations/${selected.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: body.trim(),
            ...(threadRootId ? { threadRootId } : {}),
          }),
        },
        (input) => (messageSchema.safeParse(input).success ? true : null),
        () => false,
      );
      setBody('');
      setThreadRootId(null);
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selected.id] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  const rows = messages.data ?? [];
  const roots = rows.filter((row) => row.threadRootId === null);
  const replies = (rootId: string) => rows.filter((row) => row.threadRootId === rootId);

  return (
    <div className="panes-two">
      <section className="pane pane-list" aria-label="Channels">
        <div className="pane-head">
          <h1 className="h3">Team Chat</h1>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
            <Icon icon={Plus} size={15} />
            <span>New channel</span>
          </button>
        </div>
        {list.isError ? (
          <div className="pane-note">
            <ErrorNote code={list.error instanceof ApiProblem ? list.error.code : 'API-SRV-500'} />
          </div>
        ) : null}
        {conversations.length === 0 && !list.isPending && !list.isError ? (
          <EmptyState
            icon={MessageSquare}
            title="No channels yet"
            description="Create a channel or direct message for your Business workspace."
          />
        ) : null}
        {conversations.map((row) => (
          <button
            key={row.id}
            type="button"
            className="domain-row"
            aria-selected={selected?.id === row.id}
            onClick={() => setSelectedId(row.id)}
          >
            <span className="cluster-2 truncate">
              <Icon icon={Hash} size={15} />
              <span className="strong truncate">{row.title}</span>
            </span>
            <Badge>{row.kind}</Badge>
          </button>
        ))}
      </section>

      <section className="pane pane-read" aria-label="Conversation">
        {selected ? (
          <div className="read" style={{ height: '100%', gridTemplateRows: 'auto 1fr auto' }}>
            <div
              className="spread"
              style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}
            >
              <h2 className="h3">{selected.title}</h2>
              <Badge tone="brand">{selected.kind}</Badge>
            </div>
            <div className="chat-stream">
              {roots.length === 0 ? (
                <p className="caption muted">No messages yet. Say hello below.</p>
              ) : null}
              {roots.map((row) => (
                <article key={row.id} className="chat-bubble">
                  <div className="spread">
                    <span className="caption strong">{row.authorUserId.slice(0, 8)}</span>
                    <span className="caption muted tabular">{formatWhen(row.createdAt)}</span>
                  </div>
                  <p className="caption">{row.body}</p>
                  <div>
                    <button
                      type="button"
                      className="btn btn-text"
                      style={{ minHeight: 28, paddingInline: 0 }}
                      onClick={() => setThreadRootId(row.id)}
                    >
                      Reply in thread
                    </button>
                  </div>
                  {replies(row.id).map((reply) => (
                    <p
                      key={reply.id}
                      className="caption muted"
                      style={{ paddingLeft: 12, borderLeft: '2px solid var(--color-border)' }}
                    >
                      {reply.body}
                    </p>
                  ))}
                </article>
              ))}
            </div>
            <form className="stack-2" onSubmit={(event) => void sendMessage(event)}>
              {threadRootId ? (
                <div className="spread">
                  <span className="caption muted">Replying inside thread</span>
                  <button
                    type="button"
                    className="btn btn-text"
                    onClick={() => setThreadRootId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
              <div className="cluster">
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder={`Message #${selected.title}`}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  required
                />
                <button className="btn btn-primary" type="submit">
                  <Icon icon={Send} size={15} />
                  <span>Send</span>
                </button>
              </div>
              {code ? <ErrorNote code={code} /> : null}
            </form>
          </div>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Select a channel"
            description="Open a channel or start a new conversation with teammates."
          />
        )}
      </section>

      <Sheet open={open} title="Start conversation" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={(event) => void createConversation(event)}>
          <SelectField
            label="Type"
            value={kind}
            onChange={(event) => setKind(event.target.value as Conversation['kind'])}
          >
            <option value="channel">Channel</option>
            <option value="group">Group</option>
            <option value="direct">Direct message</option>
          </SelectField>
          <Field
            label="Title"
            placeholder="engineering"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Field
            label="Member user ID (for Direct)"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
          />
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit">
            Create conversation
          </button>
        </form>
      </Sheet>
    </div>
  );
}
