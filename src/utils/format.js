export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtMoney = (n) => `฿${Number(n || 0).toLocaleString('en-US')}`;
export const daysUntil = (iso) => Math.ceil((new Date(iso) - new Date()) / 86400000);
export const toInputDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
export const today = () => new Date().toISOString();
export const addYears = (iso, n) => { const d = new Date(iso); d.setFullYear(d.getFullYear() + n); return d.toISOString(); };

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(iso);
}

export const fullName = (a) => (a ? `${a.firstName} ${a.lastName}` : '—');
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const fileSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
export const isPhone = (v) => /^[0-9+\-\s]{9,15}$/.test(v || '');
