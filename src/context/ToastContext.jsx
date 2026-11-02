import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);
const ICONS = { success: 'bi-check-circle-fill text-green', info: 'bi-info-circle-fill text-brand', warning: 'bi-exclamation-triangle-fill text-warning', danger: 'bi-x-circle-fill text-danger' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message, type = 'success', title) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, message, type, title }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`vb-toast ${t.type}`}>
            <i className={`bi ${ICONS[t.type]} fs-5`} aria-hidden="true" />
            <div className="flex-grow-1">
              {t.title && <div className="fw-semibold">{t.title}</div>}
              <div>{t.message}</div>
            </div>
            <button className="btn-close btn-sm" aria-label="Dismiss" onClick={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
