import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField, TextArea } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

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
  useDocumentTitle('Chat');
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
      setSelectedId(created.data.id);
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setCode(null);
    try {
      const sent = await writeOrFallback(
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
      if (!sent.data) {
        setCode('API-VAL-001');
        return;
      }
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
      <section className="pane pane-list" aria-label="Conversations">
        <div className="pane-head">
          <h1 className="h3">Chat</h1>
        </div>
        <p className="pane-note caption">
          Direct messages, groups, channels, and threads on {list.data?.engine ?? 'mrrokesh-chat'}.
          History is kept with the workspace.
        </p>
        {list.isError ? (
          <div className="pane-note">
            <ErrorNote code={list.error instanceof ApiProblem ? list.error.code : 'API-SRV-500'} />
          </div>
        ) : null}
        <form className="stack pane-note" onSubmit={(event) => void createConversation(event)}>
          <SelectField
            label="Kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as Conversation['kind'])}
          >
            <option value="channel">Channel</option>
            <option value="group">Group</option>
            <option value="direct">Direct</option>
          </SelectField>
          <Field
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Field
            label="Other person id"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
          />
          <button className="btn btn-quiet" type="submit">
            Start chat
          </button>
        </form>
        {conversations.map((row) => (
          <button
            key={row.id}
            type="button"
            className="thread"
            aria-selected={selected?.id === row.id}
            onClick={() => setSelectedId(row.id)}
          >
            <span>{row.title}</span>
            <span className="caption muted">{row.kind}</span>
          </button>
        ))}
      </section>
      <section className="pane pane-read" aria-label="Messages">
        {selected ? (
          <>
            <div className="pane-head">
              <h2 className="h3">{selected.title}</h2>
            </div>
            <div className="pane-note stack">
              {roots.length === 0 ? <p>No messages yet.</p> : null}
              {roots.map((row) => (
                <article key={row.id} className="stack">
                  <p>{row.body}</p>
                  <button
                    type="button"
                    className="btn btn-text"
                    onClick={() => setThreadRootId(row.id)}
                  >
                    Reply in thread
                  </button>
                  {replies(row.id).map((reply) => (
                    <p key={reply.id} className="caption">
                      {reply.body}
                    </p>
                  ))}
                </article>
              ))}
              <form className="stack" onSubmit={(event) => void sendMessage(event)}>
                {threadRootId ? (
                  <p className="caption">
                    Replying in a thread.{' '}
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={() => setThreadRootId(null)}
                    >
                      Cancel reply
                    </button>
                  </p>
                ) : null}
                <TextArea
                  label="Message"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  required
                />
                <button className="btn btn-primary" type="submit">
                  Send message
                </button>
              </form>
            </div>
          </>
        ) : (
          <p className="pane-note">Start a channel, group, or direct chat.</p>
        )}
        {code ? (
          <div className="pane-note">
            <ErrorNote code={code} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
