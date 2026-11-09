import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './ui';

/**
 * Lightweight, accessible dialog used by the admin dashboard.
 * Closes on Escape and on backdrop click, and locks background scrolling while
 * open. Animation comes from CSS so no animation library is needed.
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={cardRef}
      >
        <div className="modal-head">
          <div>
            <h2 className="h2">{title}</h2>
            {description && <p className="small muted mt-8">{description}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
