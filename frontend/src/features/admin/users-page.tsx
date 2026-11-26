import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldOff, UserCheck, UserPlus, Users } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Avatar, Badge, EmptyState } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { MOCK_USERS } from '../../lib/mock-data';
import { parseUser, parseUsers, type OrgUser } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';

const INVITE_ROLES = [
  { value: 'billing_admin', label: 'Billing admin' },
  { value: 'user_admin', label: 'User admin' },
  { value: 'helpdesk', label: 'Helpdesk' },
  { value: 'security_admin', label: 'Security admin' },
  { value: 'member', label: 'User' },
] as const;

const ROLE_FILTERS = [
  { value: 'all', label: 'All members' },
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
  useDocumentTitle('Users & Roles');
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => readOrFallback('/users', parseUsers, MOCK_USERS),
    staleTime: 60 * 1000,
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
  const [actionError, setActionError] = useState<ErrorCode | null>(null);
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
        () => null as unknown as OrgUser & { temporaryPassword?: string },
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

  async function toggleStatus(person: OrgUser) {
    setActionError(null);
    const endpoint =
      person.status === 'suspended'
        ? `/users/${person.id}/activate`
        : `/users/${person.id}/suspend`;
    try {
      await writeOrFallback(
        endpoint,
        { method: 'POST', body: JSON.stringify({}) },
        (input) => Boolean(input),
        () => false,
      );
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      setActionError(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">Users</h1>
      <section className="pane pane-nav" aria-label="Roles">
        <button
          type="button"
          className="btn btn-primary folder-compose"
          onClick={() => setOpen(true)}
        >
          <Icon icon={UserPlus} size={17} />
          <span>Invite user</span>
        </button>
        <div className="folder-list">
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
              <span>{item.label}</span>
            </button>
          ))}
        </div>
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
        </div>
        {users.isPending ? (
          <div className="pane-note">
            <SkeletonLines count={4} />
          </div>
        ) : null}
        {visible.length === 0 && !users.isPending ? (
          <EmptyState
            icon={Users}
            title="No matching users"
            description="Invite team members to assign roles and mailboxes."
          />
        ) : null}
        {visible.map((person) => (
          <button
            key={person.id}
            type="button"
            className="person"
            aria-selected={person.id === selected?.id}
            onClick={() => {
              setSelectedId(person.id);
              setActionError(null);
              setPane('read');
            }}
          >
            <span className="cluster-2 truncate">
              <Avatar name={person.name} size="sm" />
              <span className="truncate">{person.name}</span>
            </span>
            <Badge
              tone={
                person.status === 'active'
                  ? 'success'
                  : person.status === 'suspended'
                    ? 'danger'
                    : 'warning'
              }
            >
              {person.status}
            </Badge>
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
            <div className="spread">
              <div className="cluster">
                <Avatar name={selected.name} size="lg" />
                <div>
                  <h2 className="h3">{selected.name}</h2>
                  <p className="caption muted break">{selected.email}</p>
                </div>
              </div>
              <div className="cluster-2">
                <Badge tone="brand">{roleLabel(selected.role)}</Badge>
                <Badge tone={selected.status === 'active' ? 'success' : 'danger'}>
                  {selected.status}
                </Badge>
              </div>
            </div>

            {temporaryPassword && selected.id === selectedId ? (
              <div className="card stack-2">
                <p className="caption strong">Temporary password (shown once)</p>
                <p className="mono break">{temporaryPassword}</p>
              </div>
            ) : null}

            {canonicalRole(selected.role) !== 'owner' ? (
              <div className="card spread">
                <div className="stack-2">
                  <p className="strong">Account lifecycle</p>
                  <p className="caption muted">
                    {selected.status === 'suspended'
                      ? 'Suspended accounts cannot sign in or send mail.'
                      : 'Suspending revokes active sessions immediately.'}
                  </p>
                </div>
                <button
                  type="button"
                  className={
                    selected.status === 'suspended'
                      ? 'btn btn-quiet btn-sm'
                      : 'btn btn-danger btn-sm'
                  }
                  onClick={() => void toggleStatus(selected)}
                >
                  <Icon icon={selected.status === 'suspended' ? UserCheck : ShieldOff} size={15} />
                  <span>{selected.status === 'suspended' ? 'Activate user' : 'Suspend user'}</span>
                </button>
              </div>
            ) : null}
            {actionError ? <ErrorNote code={actionError} /> : null}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Select a person"
            description="Choose a team member to inspect their role, status, and lifecycle controls."
          />
        )}
      </article>

      <Sheet open={open} title="Invite user" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={onInvite} noValidate>
          <Field label="Full name" value={name} onChange={(event) => setName(event.target.value)} />
          <Field
            label="Email address"
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
            {pending ? 'Sending invite...' : 'Send invite'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
