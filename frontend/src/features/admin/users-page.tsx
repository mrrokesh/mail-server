import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { MOCK_USERS, USER_ROLES } from '../../lib/mock-data';
import { parseUser, parseUsers, type OrgUser } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const inviteSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  role: z.enum(USER_ROLES),
});

export function UsersPage() {
  useDocumentTitle('Users');
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => readOrFallback('/users', parseUsers, MOCK_USERS),
    staleTime: 5 * 60 * 1000,
  });
  const [role, setRole] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<'folders' | 'list' | 'read'>('list');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<(typeof USER_ROLES)[number]>('User');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const roles = ['All', ...USER_ROLES];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (users.data ?? []).filter((person) => {
      if (role !== 'All' && person.role !== role) return false;
      if (!needle) return true;
      return [person.name, person.email, person.role].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [query, role, users.data]);
  const selected = visible.find((person) => person.id === selectedId) ?? visible[0] ?? null;

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    const parsed = inviteSchema.safeParse({ name, email, role: inviteRole });
    if (!parsed.success) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    const local: OrgUser = {
      id: `usr_${crypto.randomUUID()}`,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'invited',
    };
    try {
      const result = await writeOrFallback(
        '/users',
        { method: 'POST', body: JSON.stringify(parsed.data) },
        parseUser,
        () => local,
      );
      queryClient.setQueryData<OrgUser[]>(['users'], (current = []) => [...current, result.data]);
      setSelectedId(result.data.id);
      setOpen(false);
      setName('');
      setEmail('');
      setPane('read');
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">Users</h1>
      <section className="pane pane-nav" aria-label="Roles">
        {roles.map((item) => (
          <button
            key={item}
            type="button"
            className="folder"
            aria-current={role === item ? 'page' : undefined}
            onClick={() => {
              setRole(item);
              setPane('list');
            }}
          >
            {item}
          </button>
        ))}
      </section>
      <section className="pane pane-list" aria-label="People">
        <div className="pane-head">
          <label className="visually-hidden" htmlFor="user-search">
            Search users
          </label>
          <input
            id="user-search"
            className="input"
            type="search"
            placeholder="Search users"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            Send invite
          </button>
        </div>
        {users.isPending ? <SkeletonLines /> : null}
        {visible.length === 0 && !users.isPending ? (
          <p className="read muted">No users in this view.</p>
        ) : null}
        {visible.map((person) => (
          <button
            key={person.id}
            type="button"
            className="person"
            aria-selected={person.id === selected?.id}
            onClick={() => {
              setSelectedId(person.id);
              setPane('read');
            }}
          >
            <span>{person.name}</span>
            <span className="caption muted">{person.status}</span>
          </button>
        ))}
      </section>
      <article className="pane pane-read">
        {selected ? (
          <div className="read">
            <button
              type="button"
              className="btn btn-text mobile-only"
              onClick={() => setPane('list')}
            >
              Back to users
            </button>
            <h2 className="h3">{selected.name}</h2>
            <p className="break">{selected.email}</p>
            <p className="caption muted">
              {selected.role} · {selected.status}
            </p>
          </div>
        ) : (
          <p className="read muted">Select a person.</p>
        )}
      </article>
      <Sheet open={open} title="Invite user" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={onInvite} noValidate>
          <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <SelectField
            label="Role"
            value={inviteRole}
            onChange={(event) => {
              const next = USER_ROLES.find((item) => item === event.target.value);
              if (next) setInviteRole(next);
            }}
          >
            {USER_ROLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectField>
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Sending invite' : 'Send invite'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
