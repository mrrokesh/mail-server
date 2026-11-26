import {
  Archive,
  Calendar,
  CheckCircle2,
  FileEdit,
  Globe,
  Inbox,
  Reply,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Icon } from '../../components/ui/icon';
import { Avatar, Badge } from '../../components/ui/primitives';

const SAMPLE_THREADS = [
  {
    id: 'dns',
    fromName: 'Priya Shah',
    fromEmail: 'priya@northwind.example',
    toEmail: 'ada@northwind.example',
    subject: 'DNS records are live',
    time: '10:14 AM',
    unread: true,
    starred: true,
    preview: 'Ownership, MX, SPF, and DKIM checked out for northwind.example.',
    body: [
      'Ada, the ownership TXT record verified this morning.',
      'MX, SPF, and 2048-bit DKIM are published and passing alignment checks. DMARC is running at p=none with aggregate reporting active.',
      'Your team can start sending from @northwind.example right away.',
    ],
  },
  {
    id: 'review',
    fromName: 'Kavya Nair',
    fromEmail: 'kavya@client.example',
    toEmail: 'ada@northwind.example',
    subject: 'Move the review to 4?',
    time: '9:05 AM',
    unread: true,
    starred: false,
    preview: 'The revised deck is ready. 4pm IST works better for our producer.',
    body: [
      'Hi Ada, the revised studio deck is uploaded to Drive.',
      'Could we move today’s review to 4:00 PM IST? Our producer wraps a shoot at 3:30 PM.',
    ],
  },
  {
    id: 'invoice',
    fromName: 'Rohan Mehta',
    fromEmail: 'rohan@northwind.example',
    toEmail: 'ada@northwind.example',
    subject: 'Invoice 441 is ready',
    time: 'Yesterday',
    unread: false,
    starred: false,
    preview: 'GST tax invoice for November retainer is filed in billing@northwind.example.',
    body: [
      'Invoice 441 for the November studio retainer is saved in the shared billing mailbox.',
      'CGST and SGST breakdown matches our Tamil Nadu GSTIN.',
    ],
  },
] as const;

const DNS_PREVIEW = [
  { label: 'Ownership TXT', host: '@', value: 'rokesh-verify=nw_7f3a', status: 'Ready' },
  { label: 'MX', host: '@', value: '10 mx1.mail.rokeshcloud.com', status: 'Ready' },
  { label: 'SPF', host: '@', value: 'v=spf1 include:_spf.rokeshcloud.com -all', status: 'Ready' },
  {
    label: 'DKIM (RSA-2048)',
    host: 'rokesh1._domainkey',
    value: 'v=DKIM1; k=rsa; p=MIIBIj...',
    status: 'Ready',
  },
  {
    label: 'DMARC',
    host: '_dmarc',
    value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@...',
    status: 'Ready',
  },
  { label: 'MTA-STS', host: '_mta-sts', value: 'mta-sts.rokeshcloud.com', status: 'Ready' },
] as const;

export function MailCapture() {
  const [surface, setSurface] = useState<'mail' | 'dns' | 'calendar'>('mail');
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_THREADS[0].id);
  const current = SAMPLE_THREADS.find((item) => item.id === selectedId) ?? SAMPLE_THREADS[0];

  return (
    <div className="showcase-shell" aria-label="Interactive product preview">
      <div className="showcase-bar">
        <div className="showcase-tabs" role="tablist" aria-label="Product surfaces">
          <button
            type="button"
            role="tab"
            className="showcase-tab"
            aria-selected={surface === 'mail'}
            onClick={() => setSurface('mail')}
          >
            <Icon icon={Inbox} size={15} />
            <span>Webmail</span>
          </button>
          <button
            type="button"
            role="tab"
            className="showcase-tab"
            aria-selected={surface === 'dns'}
            onClick={() => setSurface('dns')}
          >
            <Icon icon={Globe} size={15} />
            <span>DNS Wizard</span>
          </button>
          <button
            type="button"
            role="tab"
            className="showcase-tab"
            aria-selected={surface === 'calendar'}
            onClick={() => setSurface('calendar')}
          >
            <Icon icon={Calendar} size={15} />
            <span>Calendar</span>
          </button>
        </div>
        <Badge tone="brand">northwind.example</Badge>
      </div>

      {surface === 'mail' ? (
        <div className="capture">
          <div className="capture-folders">
            <div className="capture-folder-item is-active">
              <span className="cluster-2">
                <Icon icon={Inbox} size={15} />
                <span>Inbox</span>
              </span>
              <span>2</span>
            </div>
            <div className="capture-folder-item">
              <span className="cluster-2">
                <Icon icon={Send} size={15} />
                <span>Sent</span>
              </span>
              <span>14</span>
            </div>
            <div className="capture-folder-item">
              <span className="cluster-2">
                <Icon icon={FileEdit} size={15} />
                <span>Drafts</span>
              </span>
              <span>1</span>
            </div>
            <div className="capture-folder-item">
              <span className="cluster-2">
                <Icon icon={Archive} size={15} />
                <span>Archive</span>
              </span>
            </div>
            <div className="capture-folder-item">
              <span className="cluster-2">
                <Icon icon={ShieldAlert} size={15} />
                <span>Spam</span>
              </span>
            </div>
          </div>

          <div className="capture-list" role="listbox" aria-label="Sample threads">
            {SAMPLE_THREADS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                className="capture-thread"
                aria-selected={item.id === current.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="thread-top">
                  <span className="cluster-2">
                    {item.unread ? <span className="unread-dot" /> : null}
                    <span className={item.unread ? 'caption strong' : 'caption'}>
                      {item.fromName}
                    </span>
                  </span>
                  <span className="caption muted tabular">{item.time}</span>
                </span>
                <span className="caption strong truncate">{item.subject}</span>
                <span className="thread-preview">{item.preview}</span>
              </button>
            ))}
          </div>

          <div className="capture-read">
            <div className="spread">
              <div className="cluster">
                <Avatar name={current.fromName} />
                <div>
                  <p className="caption strong">{current.fromName}</p>
                  <p className="caption muted">
                    {current.fromEmail} to {current.toEmail}
                  </p>
                </div>
              </div>
              <div className="cluster-2">
                <Badge tone="success">
                  <Icon icon={ShieldCheck} size={12} />
                  <span>SPF &amp; DKIM pass</span>
                </Badge>
                <Icon icon={Star} size={16} />
                <Icon icon={Reply} size={16} />
                <Icon icon={Trash2} size={16} />
              </div>
            </div>
            <h3 className="h3">{current.subject}</h3>
            <div className="stack-3">
              {current.body.map((line) => (
                <p key={line} className="caption measure">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {surface === 'dns' ? (
        <div className="read">
          <div className="spread">
            <div>
              <h3 className="h3">northwind.example</h3>
              <p className="caption muted">Live DNS authentication and transport security checks</p>
            </div>
            <Badge tone="success">
              <Icon icon={CheckCircle2} size={13} />
              <span>Deliverability score 100 / 100</span>
            </Badge>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Host</th>
                  <th>Published value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {DNS_PREVIEW.map((row) => (
                  <tr key={row.label}>
                    <td className="strong">{row.label}</td>
                    <td className="mono">{row.host}</td>
                    <td className="mono">{row.value}</td>
                    <td>
                      <Badge tone="success">{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {surface === 'calendar' ? (
        <div className="read">
          <div className="spread">
            <div>
              <h3 className="h3">November 2026</h3>
              <p className="caption muted">
                Shared team calendars, room booking, and India holidays
              </p>
            </div>
            <Badge tone="brand">CalDAV + iMIP synced</Badge>
          </div>
          <div className="kpi-grid">
            <div className="card">
              <p className="caption muted">11:00 – 11:30 IST</p>
              <p className="strong">DNS cutover review</p>
              <p className="caption muted">Studio room · Work</p>
            </div>
            <div className="card">
              <p className="caption muted">16:00 – 16:30 IST</p>
              <p className="strong">Client review with Kavya</p>
              <p className="caption muted">MR Rokesh Meet · Work</p>
            </div>
            <div className="card">
              <p className="caption muted">All day · India holiday</p>
              <p className="strong">Diwali</p>
              <p className="caption muted">Auto-synced holiday calendar</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
