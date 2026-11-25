import type { AppConfig } from '../config';
import type { DkimRecord, DomainRecord } from '../store/types';

export interface DnsRecordView {
  type: 'TXT' | 'MX' | 'CNAME';
  host: string;
  value: string;
  purpose: string;
}

export function suggestedDnsRecords(
  domain: DomainRecord,
  dkim: DkimRecord,
  config: AppConfig,
): DnsRecordView[] {
  const name = domain.domainName;
  return [
    {
      type: 'TXT',
      host: `_mrrokesh-verify.${name}`,
      value: `mrrokesh-verify=${domain.verificationTxt}`,
      purpose: 'ownership',
    },
    { type: 'MX', host: name, value: `10 ${config.mxHost}`, purpose: 'mx' },
    {
      type: 'TXT',
      host: name,
      value: `v=spf1 include:${config.spfInclude} -all`,
      purpose: 'spf',
    },
    {
      type: 'TXT',
      host: `${dkim.selector}._domainkey.${name}`,
      value: dkim.publicKeyDns,
      purpose: 'dkim',
    },
    {
      type: 'TXT',
      host: `_dmarc.${name}`,
      value: `v=DMARC1; p=none; t=y; rua=mailto:${config.dmarcRua}`,
      purpose: 'dmarc',
    },
    {
      type: 'CNAME',
      host: `_mta-sts.${name}`,
      value: 'mta-sts.rokeshcloud.com',
      purpose: 'mta-sts',
    },
    {
      type: 'TXT',
      host: `_smtp._tls.${name}`,
      value: `v=TLSRPTv1; rua=mailto:${config.tlsRptRua}`,
      purpose: 'tls-rpt',
    },
    {
      type: 'CNAME',
      host: `autoconfig.${name}`,
      value: 'autoconfig.rokeshcloud.com',
      purpose: 'autoconfig',
    },
    {
      type: 'CNAME',
      host: `autodiscover.${name}`,
      value: 'autodiscover.rokeshcloud.com',
      purpose: 'autodiscover',
    },
  ];
}

export function spfLookupCount(record: string): number {
  const matches = record.match(/\b(?:include:|a:|mx:|ptr:|exists:|redirect=|a\b|mx\b)/gi);
  return matches?.length ?? 0;
}
