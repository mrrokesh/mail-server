import crypto from 'node:crypto';
import type { ErrorCode } from '@mrrokesh/shared';
import { withinCap } from '../billing/entitlements';
import { encryptString } from '../crypto/aes';
import { generateDkimKey } from '../crypto/dkim';
import { spfLookupCount, suggestedDnsRecords, type DnsRecordView } from '../dns/records';
import { ApiError } from '../errors';
import type { AppDeps } from '../app-deps';
import type { DomainRecord } from '../store/types';
import { assertEntitled, assertWritable, writeAudit, type TenantContext } from './access';
import type { AuthMeta } from './auth';

const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const WEB_CHECKS: { id: string; label: string; code: ErrorCode }[] = [
  { id: 'ownership', label: 'Ownership', code: 'API-DNS-001' },
  { id: 'mx', label: 'MX', code: 'API-DNS-002' },
  { id: 'spf', label: 'SPF', code: 'API-DNS-003' },
  { id: 'dkim', label: 'DKIM', code: 'API-DNS-004' },
  { id: 'dmarc', label: 'DMARC', code: 'API-DNS-005' },
  { id: 'mta-sts', label: 'MTA-STS', code: 'API-DNS-006' },
];

function checkFlag(domain: DomainRecord, id: string): boolean {
  if (id === 'ownership') return domain.isVerified;
  if (id === 'mx') return domain.mxVerified;
  if (id === 'spf') return domain.spfVerified;
  if (id === 'dkim') return domain.dkimVerified;
  if (id === 'dmarc') return domain.dmarcVerified;
  if (id === 'mta-sts') return domain.mtaStsEnabled;
  return false;
}

export async function webDomain(deps: AppDeps, domain: DomainRecord) {
  const key = await activeDkim(deps, domain.organizationId, domain.id);
  const records = key ? suggestedDnsRecords(domain, key, deps.config) : [];
  const checks = WEB_CHECKS.map((item) => {
    const record = records.find((row) => row.purpose === item.id);
    const ready = domain.lastDnsCheckedAt !== null && checkFlag(domain, item.id);
    const status = ready
      ? 'ready'
      : domain.lastDnsCheckedAt
        ? 'fail'
        : item.id === 'ownership'
          ? 'fail'
          : 'waiting';
    return {
      id: item.id,
      label: item.label,
      type: record?.type ?? 'TXT',
      host: record?.host ?? domain.domainName,
      value: record?.value ?? '',
      status,
      code: ready ? null : item.code,
      ok: ready,
    };
  });
  return { ...presentDomain(domain), name: domain.domainName, checks };
}

export function presentDomain(domain: DomainRecord) {
  return {
    id: domain.id,
    organizationId: domain.organizationId,
    domainName: domain.domainName,
    verificationTxt: domain.verificationTxt,
    isVerified: domain.isVerified,
    mxVerified: domain.mxVerified,
    spfVerified: domain.spfVerified,
    dkimVerified: domain.dkimVerified,
    dmarcVerified: domain.dmarcVerified,
    mtaStsEnabled: domain.mtaStsEnabled,
    deliverabilityScore: domain.deliverabilityScore,
    catchAllMailboxId: domain.catchAllMailboxId,
    lastDnsCheckedAt: domain.lastDnsCheckedAt ? domain.lastDnsCheckedAt.toISOString() : null,
    createdAt: domain.createdAt.toISOString(),
  };
}

async function activeDkim(deps: AppDeps, organizationId: string, domainId: string) {
  const keys = await deps.store.listDkim(organizationId, domainId);
  return keys.find((key) => key.isActive) ?? keys[0] ?? null;
}

export async function createDomain(
  deps: AppDeps,
  tenant: TenantContext,
  domainName: string,
  meta: AuthMeta,
): Promise<{ domain: ReturnType<typeof presentDomain>; records: DnsRecordView[] }> {
  assertWritable(tenant.subscription, deps.now());
  if (!DOMAIN_RE.test(domainName)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'domainName', message: 'Enter a domain like example.com.' }],
    });
  }
  const existing = await deps.store.findDomainByName(domainName);
  if (existing && existing.organizationId !== tenant.org.id) throw new ApiError('API-DNS-007');
  if (existing) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'domainName', message: 'This domain is already on your account.' }],
    });
  }
  const count = await deps.store.countDomains(tenant.org.id);
  if (!withinCap(count, tenant.limits.maxDomains)) throw new ApiError('API-QUOTA-005');
  const now = deps.now();
  const dkim = generateDkimKey(now);
  const encrypted = encryptString(deps.config.dataEncryptionKey, dkim.privateKeyPem);
  const domain: DomainRecord = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    domainName,
    verificationTxt: crypto.randomBytes(18).toString('base64url'),
    isVerified: false,
    mxVerified: false,
    spfVerified: false,
    dkimVerified: false,
    dmarcVerified: false,
    mtaStsEnabled: false,
    daneEnabled: false,
    deliverabilityScore: 0,
    catchAllMailboxId: null,
    lastDnsCheckedAt: null,
    createdAt: now,
  };
  const inserted = await deps.store.insertDomain(domain, {
    id: crypto.randomUUID(),
    domainId: domain.id,
    organizationId: tenant.org.id,
    selector: dkim.selector,
    algorithm: 'rsa-2048',
    publicKeyDns: dkim.publicKeyDns,
    privateKeyEnc: encrypted.ciphertext,
    privateKeyIv: encrypted.iv,
    isActive: true,
    rotateAfter: dkim.rotateAfter,
    createdAt: now,
  });
  if (inserted === 'duplicate') throw new ApiError('API-DNS-007');
  await writeAudit(deps.store, {
    at: now,
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'domain.created',
    targetType: 'domain',
    targetId: domain.id,
    ipAddress: meta.ip,
    metadata: { domainName },
  });
  const key = await activeDkim(deps, tenant.org.id, domain.id);
  if (!key) throw new ApiError('API-SRV-500');
  return { domain: presentDomain(domain), records: suggestedDnsRecords(domain, key, deps.config) };
}

export async function dnsRecordsFor(
  deps: AppDeps,
  tenant: TenantContext,
  domainId: string,
): Promise<DnsRecordView[]> {
  const domain = await deps.store.findDomain(tenant.org.id, domainId);
  if (!domain) throw new ApiError('API-RES-404');
  const key = await activeDkim(deps, tenant.org.id, domain.id);
  if (!key) throw new ApiError('API-SRV-500');
  return suggestedDnsRecords(domain, key, deps.config);
}

export async function verifyDomain(
  deps: AppDeps,
  tenant: TenantContext,
  domainId: string,
  meta: AuthMeta,
) {
  const domain = await deps.store.findDomain(tenant.org.id, domainId);
  if (!domain) throw new ApiError('API-RES-404');
  const key = await activeDkim(deps, tenant.org.id, domain.id);
  if (!key) throw new ApiError('API-SRV-500');
  const name = domain.domainName;
  const ownershipTxt = await deps.dns.resolveTxt(`_mrrokesh-verify.${name}`);
  const ownership = ownershipTxt.some((value) =>
    value.includes(`mrrokesh-verify=${domain.verificationTxt}`),
  );
  if (!ownership) {
    throw new ApiError('API-DNS-001', {
      checks: [{ id: 'ownership', ok: false, code: 'API-DNS-001' }],
    });
  }
  const mx = await deps.dns.resolveMx(name);
  const mxOk = mx.some(
    (row) => row.exchange.replace(/\.$/, '').toLowerCase() === deps.config.mxHost,
  );
  const spfTxt = (await deps.dns.resolveTxt(name)).find((value) =>
    value.toLowerCase().startsWith('v=spf1'),
  );
  const spfOk = Boolean(
    spfTxt && spfTxt.includes(`include:${deps.config.spfInclude}`) && spfLookupCount(spfTxt) <= 10,
  );
  const dkimTxt = await deps.dns.resolveTxt(`${key.selector}._domainkey.${name}`);
  const expected = key.publicKeyDns.replace(/\s+/g, '');
  const dkimOk = dkimTxt.some((value) => value.replace(/\s+/g, '') === expected);
  const dmarcOk = (await deps.dns.resolveTxt(`_dmarc.${name}`)).some((value) =>
    value.toLowerCase().startsWith('v=dmarc1'),
  );
  const mtaOk = (await deps.dns.resolveCname(`_mta-sts.${name}`)).some(
    (value) => value.replace(/\.$/, '').toLowerCase() === 'mta-sts.mrrokesh.mail',
  );
  const score = [true, mxOk, spfOk, dkimOk, dmarcOk].filter(Boolean).length * 20;
  const updated = await deps.store.updateDomain(tenant.org.id, domain.id, {
    isVerified: true,
    mxVerified: mxOk,
    spfVerified: spfOk,
    dkimVerified: dkimOk,
    dmarcVerified: dmarcOk,
    mtaStsEnabled: mtaOk,
    deliverabilityScore: score,
    lastDnsCheckedAt: deps.now(),
  });
  if (!updated) throw new ApiError('API-SRV-500');
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'domain.verified',
    targetType: 'domain',
    targetId: domain.id,
    ipAddress: meta.ip,
    metadata: { score },
  });
  const view = await webDomain(deps, updated);
  return { domain: presentDomain(updated), checks: view.checks };
}

export async function setCatchAll(
  deps: AppDeps,
  tenant: TenantContext,
  domainId: string,
  mailboxId: string | null,
): Promise<ReturnType<typeof presentDomain>> {
  assertWritable(tenant.subscription, deps.now());
  assertEntitled(tenant.limits, 'catchAll');
  const domain = await deps.store.findDomain(tenant.org.id, domainId);
  if (!domain) throw new ApiError('API-RES-404');
  if (mailboxId) {
    const mailbox = await deps.store.findMailbox(tenant.org.id, mailboxId);
    if (!mailbox || mailbox.domainId !== domain.id) throw new ApiError('API-RES-404');
  }
  const updated = await deps.store.updateDomain(tenant.org.id, domain.id, {
    catchAllMailboxId: mailboxId,
  });
  if (!updated) throw new ApiError('API-SRV-500');
  return presentDomain(updated);
}
