import type { ErrorCode, PlanTier } from '@mrrokesh/shared';
import { PLAN_TIERS, isErrorCode } from '@mrrokesh/shared';
import { z } from 'zod';

export const FOLDERS = ['inbox', 'sent', 'drafts', 'snoozed', 'archive', 'spam', 'trash'] as const;
export type FolderId = (typeof FOLDERS)[number];

export const CALENDARS = ['personal', 'work', 'holidays'] as const;
export type CalendarId = (typeof CALENDARS)[number];

export const CONTACT_BOOKS = ['directory', 'personal'] as const;
export type ContactBook = (typeof CONTACT_BOOKS)[number];

const planIdSchema = z.enum(PLAN_TIERS);

export interface MailThread {
  id: string;
  folder: FolderId;
  subject: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  preview: string;
  bodyHtml: string;
  bodyText?: string;
  receivedAt: string;
  unread: boolean;
  starred?: boolean;
  pinned?: boolean;
  muted?: boolean;
  snoozeUntil?: string | null;
  labels?: string[];
  internalNote?: string | null;
  hasRemoteImages: boolean;
}

export interface CalendarEvent {
  id: string;
  calendar: CalendarId;
  title: string;
  date: string;
  start: string | null;
  end: string | null;
  location: string;
}

export interface Contact {
  id: string;
  book: ContactBook;
  name: string;
  email: string;
  phone: string;
  role: string;
  notes: string;
}

export interface DnsCheck {
  id: string;
  label: string;
  type: string;
  host: string;
  value: string;
  status: 'ready' | 'fail' | 'waiting';
  code: ErrorCode | null;
}

export interface MailDomain {
  id: string;
  name: string;
  checks: DnsCheck[];
}

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'invited' | 'suspended';
}

export interface PlanOffer {
  id: PlanTier;
  annualInr: number | null;
  monthlyInr: number | null;
  summary: string;
  highlights: string[];
}

export interface PlanCatalog {
  plans: PlanOffer[];
  privacyAnnualInr: number;
  privacyMonthlyInr: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  plan: PlanTier;
  role: string;
  isOperator?: boolean;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

const threadSchema = z.object({
  id: z.string(),
  folder: z.enum(FOLDERS),
  subject: z.string(),
  fromName: z.string(),
  fromEmail: z.string(),
  toEmail: z.string(),
  preview: z.string(),
  bodyHtml: z.string(),
  bodyText: z.string().optional(),
  receivedAt: z.string(),
  unread: z.boolean(),
  starred: z.boolean().optional(),
  pinned: z.boolean().optional(),
  muted: z.boolean().optional(),
  snoozeUntil: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  internalNote: z.string().nullable().optional(),
  hasRemoteImages: z.boolean().optional(),
});

const eventSchema = z.object({
  id: z.string(),
  calendar: z.enum(CALENDARS),
  title: z.string(),
  date: z.string(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  location: z.string(),
});

const contactSchema = z.object({
  id: z.string(),
  book: z.enum(CONTACT_BOOKS),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.string(),
  notes: z.string(),
});

const dnsCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  host: z.string(),
  value: z.string(),
  status: z.enum(['ready', 'fail', 'waiting']),
  code: z
    .string()
    .nullable()
    .transform((value): ErrorCode | null => (value && isErrorCode(value) ? value : null)),
});

const domainSchema = z.object({
  id: z.string(),
  name: z.string(),
  checks: z.array(dnsCheckSchema),
});

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.enum(['active', 'invited', 'suspended']),
});

const planSchema = z.object({
  id: planIdSchema,
  annualInr: z.number().nullable(),
  monthlyInr: z.number().nullable(),
  summary: z.string(),
  highlights: z.array(z.string()),
});

function rows<T>(
  data: T[] | { threads?: T[]; events?: T[]; contacts?: T[]; domains?: T[]; users?: T[] },
  key: 'threads' | 'events' | 'contacts' | 'domains' | 'users',
): T[] {
  if (Array.isArray(data)) return data;
  return data[key] ?? [];
}

export function parseThreads(input: unknown): MailThread[] | null {
  const parsed = z
    .union([z.array(threadSchema), z.object({ threads: z.array(threadSchema) })])
    .safeParse(input);
  if (!parsed.success) return null;
  return rows(parsed.data, 'threads').map((thread) => ({
    ...thread,
    hasRemoteImages: thread.hasRemoteImages ?? false,
  }));
}

export function parseEvents(input: unknown): CalendarEvent[] | null {
  const parsed = z
    .union([z.array(eventSchema), z.object({ events: z.array(eventSchema) })])
    .safeParse(input);
  return parsed.success ? rows(parsed.data, 'events') : null;
}

export function parseContacts(input: unknown): Contact[] | null {
  const parsed = z
    .union([z.array(contactSchema), z.object({ contacts: z.array(contactSchema) })])
    .safeParse(input);
  return parsed.success ? rows(parsed.data, 'contacts') : null;
}

export function parseDomains(input: unknown): MailDomain[] | null {
  const parsed = z
    .union([z.array(domainSchema), z.object({ domains: z.array(domainSchema) })])
    .safeParse(input);
  return parsed.success ? rows(parsed.data, 'domains') : null;
}

export function parseUsers(input: unknown): OrgUser[] | null {
  const parsed = z
    .union([z.array(userSchema), z.object({ users: z.array(userSchema) })])
    .safeParse(input);
  return parsed.success ? rows(parsed.data, 'users') : null;
}

export function parseChecks(input: unknown): DnsCheck[] | null {
  const direct = z.array(dnsCheckSchema).safeParse(input);
  if (direct.success) return direct.data;
  const wrapped = z.object({ checks: z.array(dnsCheckSchema) }).safeParse(input);
  return wrapped.success ? wrapped.data.checks : null;
}

export function parsePlans(input: unknown): PlanCatalog | null {
  const parsed = z
    .object({
      plans: z.array(planSchema),
      privacyAnnualInr: z.number(),
      privacyMonthlyInr: z.number(),
    })
    .safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function parseAuth(input: unknown): AuthResult | null {
  const root = input && typeof input === 'object' ? (input as { session?: unknown }) : null;
  const body = root?.session && typeof root.session === 'object' ? root.session : input;
  const parsed = z
    .object({
      accessToken: z.string().min(1),
      organization: z.object({ name: z.string() }).optional(),
      user: z.object({
        id: z.string(),
        name: z.string().optional(),
        fullName: z.string().optional(),
        email: z.string().email(),
        organization: z.string().optional(),
        plan: planIdSchema.optional(),
        role: z.string(),
        isOperator: z.boolean().optional(),
      }),
    })
    .safeParse(body);
  if (!parsed.success) return null;
  const name = parsed.data.user.name ?? parsed.data.user.fullName;
  if (!name) return null;
  return {
    accessToken: parsed.data.accessToken,
    user: {
      id: parsed.data.user.id,
      name,
      email: parsed.data.user.email,
      organization: parsed.data.user.organization ?? parsed.data.organization?.name ?? 'Workspace',
      plan: parsed.data.user.plan ?? 'free',
      role: parsed.data.user.role,
      ...(parsed.data.user.isOperator !== undefined
        ? { isOperator: parsed.data.user.isOperator }
        : {}),
    },
  };
}

export function parseThread(input: unknown): MailThread | null {
  const parsed = threadSchema.safeParse(input);
  if (!parsed.success) return null;
  return { ...parsed.data, hasRemoteImages: parsed.data.hasRemoteImages ?? false };
}

export function parseEvent(input: unknown): CalendarEvent | null {
  const parsed = eventSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function parseUser(input: unknown): OrgUser | null {
  const parsed = userSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function parseDomain(input: unknown): MailDomain | null {
  const parsed = domainSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
