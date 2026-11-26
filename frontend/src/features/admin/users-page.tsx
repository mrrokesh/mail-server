import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { MOCK_USERS } from '../../lib/mock-data';
import { parseUser, parseUsers, type OrgUser } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const INVITE_ROLES = [
  { value: 'billing_admin', label: 'Billing admin' },
  { value: 'user_admin', label: 'User admin' },
  { value: 'helpdesk', label: 'Helpdesk' },
  { value: 'security_admin', label: 'Security admin' },
  { value: 'member', label: 'User' },
] as const;

const ROLE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'owner', label: 'Owner' },
  ...INVITE_ROLES,
];

function canonicalRole(role: string): string {
  const key = role
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return key === 'user' ? 'member' : key;
}

function roleLabel(role: string): string {
  return ROLE_FILTERS.find((item) => item.value === canonicalRole(role))?.label ?? role;
}

const inviteSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  role: z.enum(['billing_admin', 'user_admin', 'helpdesk', 'security_admin', 'member']),
});

export function UsersPage() {
  useDocumentTitle('Users');
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => readOrFallback('/users', parseUsers, MOCK_USERS),
    staleTime: 5 * 60 * 1000,
  });
  const [role, setRole] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<'folders' | 'list' | 'read'>('list');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<(typeof INVITE_ROLES)[number]['value']>('member');
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (users.data ?? []).filter((person) => {
      if (role !== 'all' && canonicalRole(person.role) !== role) return false;
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
    const local: OrgUser & { temporaryPassword?: string } = {
      id: `usr_${crypto.randomUUID()}`,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'invited',
    };
    try {
      const result = await writeOrFallback(
        '/users',
        {
          method: 'POST',
          body: JSON.stringify({
            name: parsed.data.name,
            fullName: parsed.data.name,
            email: parsed.data.email,
            role: parsed.data.role,
          }),
        },
        (input): (OrgUser & { temporaryPassword?: string }) | null => {
          const user = parseUser(input);
          if (!user || !input || typeof input !== 'object') return null;
          const password = (input as { temporaryPassword?: unknown }).temporaryPassword;
          return {
            ...user,
            temporaryPassword: typeof password === 'string' ? password : undefined,
          };
        },
        () => local,
      );
      queryClient.setQueryData<OrgUser[]>(['users'], (current = []) => [...current, result.data]);
      setSelectedId(result.data.id);
      setTemporaryPassword(result.data.temporaryPassword ?? null);
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
        {ROLE_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="folder"
            aria-current={role === item.value ? 'page' : undefined}
            onClick={() => {
              setRole(item.value);
              setPane('list');
            }}
          >
            {item.label}
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
              {roleLabel(selected.role)} · {selected.status}
            </p>
            {temporaryPassword && selected.id === selectedId ? (
              <p className="break">Temporary password: {temporaryPassword}</p>
            ) : null}
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
              const next = INVITE_ROLES.find((item) => item.value === event.target.value);
              if (next) setInviteRole(next.value);
            }}
          >
            {INVITE_ROLES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
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
