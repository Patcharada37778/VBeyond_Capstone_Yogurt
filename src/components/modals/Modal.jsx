import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const SIZES = { sm: 420, md: 560, lg: 820, xl: 1080 };

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = [...f].filter((el) => !el.disabled);
        if (!list.length) return;
        if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list[list.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === list[list.length - 1]) { e.preventDefault(); list[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const first = ref.current?.querySelector('.vb-modal-body input, .vb-modal-body select, .vb-modal-body textarea') || ref.current?.querySelector('.btn-close');
      first?.focus();
    }, 20);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="vb-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="vb-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} style={{ maxWidth: SIZES[size] }}>
        <div className="vb-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="vb-modal-body">{children}</div>
        {footer && <div className="vb-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirm', variant = 'primary', disabled }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button className={`btn btn-${variant}`} onClick={onConfirm} disabled={disabled}>{confirmLabel}</button>
      </>}>
      {children}
    </Modal>
  );
}
