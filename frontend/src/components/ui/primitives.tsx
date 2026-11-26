import {
  Calendar,
  CheckSquare,
  CreditCard,
  FileText,
  Globe,
  HardDrive,
  Inbox,
  Mail,
  MessageSquare,
  Moon,
  Search,
  Shield,
  Sparkles,
  Sun,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { readTheme, useTheme, writeTheme } from '../../lib/theme';
import { Icon } from './icon';

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'M';
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : 'avatar';
  return (
    <span className={cls} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  const map = {
    neutral: 'badge',
    brand: 'badge badge-brand',
    success: 'badge badge-success',
    warning: 'badge badge-warning',
    danger: 'badge badge-danger',
  };
  return <span className={map[tone]}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-read">
      <div className="empty-emblem" aria-hidden="true">
        <Icon icon={icon} size={24} />
      </div>
      <h2 className="h3">{title}</h2>
      <p className="muted measure">{description}</p>
      {action}
    </div>
  );
}

export function QuotaMeter({
  label,
  usedLabel,
  percent,
}: {
  label: string;
  usedLabel: string;
  percent: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const fillClass =
    clamped >= 90 ? 'meter-fill is-danger' : clamped >= 75 ? 'meter-fill is-warn' : 'meter-fill';
  return (
    <div className="stack-2">
      <div className="spread">
        <span className="caption muted">{label}</span>
        <span className="caption tabular">{usedLabel}</span>
      </div>
      <div
        className="meter-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={fillClass} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  hint?: string;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const go = (to: string) => () => {
      navigate(to);
      onClose();
    };
    return [
      {
        id: 'mail',
        label: 'Open Inbox',
        group: 'Navigate',
        icon: Inbox,
        hint: 'G I',
        run: go('/mail'),
      },
      {
        id: 'compose',
        label: 'Compose new message',
        group: 'Mail',
        icon: Mail,
        hint: 'C',
        run: go('/mail?compose=1'),
      },
      {
        id: 'calendar',
        label: 'Open Calendar',
        group: 'Navigate',
        icon: Calendar,
        run: go('/calendar'),
      },
      {
        id: 'contacts',
        label: 'Open Contacts & Directory',
        group: 'Navigate',
        icon: Users,
        run: go('/contacts'),
      },
      {
        id: 'drive',
        label: 'Open Drive storage',
        group: 'Navigate',
        icon: HardDrive,
        run: go('/drive'),
      },
      {
        id: 'tasks',
        label: 'Open Tasks & Notes',
        group: 'Navigate',
        icon: CheckSquare,
        run: go('/tasks'),
      },
      {
        id: 'chat',
        label: 'Open Team Chat',
        group: 'Navigate',
        icon: MessageSquare,
        run: go('/chat'),
      },
      {
        id: 'docs-app',
        label: 'Open Documents',
        group: 'Navigate',
        icon: FileText,
        run: go('/documents'),
      },
      { id: 'meet', label: 'Open Meet rooms', group: 'Navigate', icon: Video, run: go('/meet') },
      {
        id: 'ai',
        label: 'Open AI Writing Studio',
        group: 'Navigate',
        icon: Sparkles,
        run: go('/ai'),
      },
      {
        id: 'domains',
        label: 'Manage Custom Domains & DNS',
        group: 'Admin',
        icon: Globe,
        run: go('/admin/domains'),
      },
      {
        id: 'users',
        label: 'Manage Users & Roles',
        group: 'Admin',
        icon: Users,
        run: go('/admin/users'),
      },
      {
        id: 'compliance',
        label: 'Security, SSO & Compliance',
        group: 'Admin',
        icon: Shield,
        run: go('/admin/compliance'),
      },
      {
        id: 'billing',
        label: 'Billing, Seats & GST Invoices',
        group: 'Admin',
        icon: CreditCard,
        run: go('/billing'),
      },
      {
        id: 'partner',
        label: 'Reseller & Partner Console',
        group: 'Admin',
        icon: Globe,
        run: go('/admin/partner'),
      },
      {
        id: 'operator',
        label: 'MR Rokesh Operator & Abuse Console',
        group: 'Platform',
        icon: Shield,
        run: go('/operator'),
      },
      {
        id: 'help',
        label: 'Read Documentation & Error Codes',
        group: 'Help',
        icon: Search,
        run: go('/docs'),
      },
      {
        id: 'theme',
        label: theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme',
        group: 'Preferences',
        icon: theme === 'dark' ? Sun : Moon,
        run: () => {
          writeTheme(readTheme() === 'dark' ? 'light' : 'dark');
          onClose();
        },
      },
    ];
  }, [navigate, onClose, theme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) => cmd.label.toLowerCase().includes(q) || cmd.group.toLowerCase().includes(q),
    );
  }, [commands, query]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label="Command palette"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="stack-2">
        <label className="visually-hidden" htmlFor="cmdk-input">
          Jump to a screen or action
        </label>
        <input
          id="cmdk-input"
          ref={inputRef}
          className="input"
          type="text"
          autoComplete="off"
          placeholder="Type a command, screen, or action..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            } else if (event.key === 'Enter' && filtered[activeIndex]) {
              event.preventDefault();
              filtered[activeIndex].run();
            }
          }}
        />
      </div>
      <div className="cmdk-list" role="listbox" aria-label="Commands">
        {filtered.length === 0 ? (
          <p className="caption muted pane-note">No matching commands.</p>
        ) : (
          filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              type="button"
              role="option"
              aria-selected={idx === activeIndex}
              className="cmdk-item"
              onClick={cmd.run}
            >
              <span className="cluster-2">
                <Icon icon={cmd.icon} size={18} />
                <span>{cmd.label}</span>
              </span>
              <span className="caption muted">{cmd.hint ?? cmd.group}</span>
            </button>
          ))
        )}
      </div>
    </dialog>
  );
}
