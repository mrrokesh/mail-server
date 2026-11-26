import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './icon';

export function Sheet({
  open,
  title,
  onClose,
  size = 'md',
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  size?: 'md' | 'lg';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={size === 'lg' ? 'sheet sheet-lg' : 'sheet'}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet-head">
        <h2 id={titleId} className="h3">
          {title}
        </h2>
        <button
          type="button"
          className="icon-btn icon-btn-sm"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon icon={X} size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
