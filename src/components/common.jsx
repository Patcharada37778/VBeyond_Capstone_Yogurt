import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { initials, fileSize } from '../utils/format';

const STATUS_COLORS = {
  green: ['Active', 'Approved', 'Verified', 'Resolved', 'Published', 'Accepted', 'Paid', 'Answered', 'Completed', 'Low'],
  blue: ['Processing', 'Pending Review', 'In Progress', 'Resubmitted', 'Registration In Progress', 'Open', 'Medium'],
  amber: ['Pending Transfer', 'Clarification Required', 'Pending', 'Waiting for User', 'Requires Replacement', 'Draft', 'Suspended', 'Unpaid', 'Pending Onboarding', 'High'],
  red: ['Rejected', 'Expired', 'Critical', 'Inactive', 'Declined'],
  gray: ['Closed', 'Cancelled', 'Archived', 'Resigned', 'Not Yet Submitted', 'Unpublished'],
};

export function StatusBadge({ status, className = '' }) {
  const color = Object.keys(STATUS_COLORS).find((k) => STATUS_COLORS[k].includes(status)) || 'teal';
  return <span className={`status-badge sb-${color} ${className}`}>{status}</span>;
}

export function Avatar({ name, color = '#1f4e52', size = 36, photo }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </span>
  );
}

export function PageHeader({ title, subtitle, crumbs = [], actions }) {
  return (
    <div className="page-header">
      <div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/dashboard">Home</Link></li>
            {crumbs.map((c, i) => (
              <li key={i} className={`breadcrumb-item ${i === crumbs.length - 1 && !c.to ? 'active' : ''}`}>
                {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}
              </li>
            ))}
          </ol>
        </nav>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'bi-inbox', title, children }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <div className="fw-semibold text-body">{title}</div>
      {children && <div className="small mt-1">{children}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, to, tone }) {
  const body = (
    <div className="card h-100">
      <div className="card-body stat-card">
        <div className="stat-icon" style={tone ? { background: tone[0], color: tone[1] } : undefined}><i className={`bi ${icon}`} aria-hidden="true" /></div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to} className="stat-link h-100">{body}</Link> : body;
}

export const TONES = {
  green: ['#e7f5ec', '#0b6b3a'], amber: ['#fff5e1', '#8a4b00'], red: ['#fdecea', '#a51d12'], blue: ['#e8f1fb', '#1d5591'], gray: ['#f0f2f4', '#46505b'], purple: ['#f1ecfb', '#5b3b9a'],
};

export function Tabs({ tabs, active, onChange }) {
  return (
    <ul className="nav nav-tabs mb-3" role="tablist">
      {tabs.map((t) => (
        <li className="nav-item" key={t.key} role="presentation">
          <button className={`nav-link ${active === t.key ? 'active' : ''}`} role="tab" aria-selected={active === t.key} onClick={() => onChange(t.key)}>
            {t.label}{t.count != null && <span className="badge rounded-pill text-bg-light ms-2 border">{t.count}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SearchInput({ id, value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`position-relative ${className}`} style={{ minWidth: 220 }}>
      <i className="bi bi-search position-absolute text-muted" style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true" />
      <input id={id} type="search" className="form-control ps-5" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Select({ id, value, onChange, options, label, className = '', style }) {
  return (
    <select id={id} className={`form-select ${className}`} style={{ width: 'auto', ...style }} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

/** Mock file picker: uses the browser file dialog but only keeps name/size locally. */
export function FilePicker({ label, onSelect, accept = '.pdf,.jpg,.jpeg,.png', buttonLabel = 'Choose file', current, required, error, id, multiple = false, description }) {
  const ref = useRef(null);
  const files = multiple ? (Array.isArray(current) ? current : current ? [current] : []) : current ? [current] : [];
  return (
    <div>
      {label && (multiple ? (
        <div className="doc-picker-label">
          <div className="doc-picker-heading">
            <label className={`form-label ${required ? 'required' : ''} mb-0`} htmlFor={id}>{label}</label>
            {description && <small className="doc-file-description text-muted">{description}</small>}
          </div>
          <button type="button" className="btn btn-sm btn-success file-add-button" onClick={() => ref.current?.click()} aria-label={`Add files to ${label}`} title="Add more files">
            <i className="bi bi-plus-lg" aria-hidden="true" />
          </button>
        </div>
      ) : <label className={`form-label ${required ? 'required' : ''}`} htmlFor={id}>{label}</label>)}
      <div className={`doc-tile ${multiple ? 'doc-tile-multiple' : ''} ${error ? 'border-danger' : ''}`}>
        <div className="doc-icon"><i className={`bi ${files.length ? 'bi-file-earmark-check' : 'bi-file-earmark-arrow-up'}`} aria-hidden="true" /></div>
        {multiple ? (
          <div className="doc-file-content">
            <div className="doc-file-list">
              {files.length
                ? files.map((file, i) => (
                  <div className="doc-file-row" key={`${file.fileName}-${i}`}>
                    <span className="text-truncate"><span className="fw-medium">{file.fileName}</span> <small className="text-muted">{fileSize(file.size)}</small></span>
                    <button
                      type="button"
                      className="btn btn-sm btn-light doc-file-remove"
                      aria-label={`Remove ${file.fileName}`}
                      title={`Remove ${file.fileName}`}
                      onClick={() => onSelect(files.filter((_, fileIndex) => fileIndex !== i))}
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                  </div>
                ))
                : <span className="text-muted">No files added</span>}
            </div>
          </div>
        ) : (
          <div className="flex-grow-1 text-truncate">
            {files.length ? <><div className="fw-medium text-truncate">{files[0].fileName}</div><small className="text-muted">{fileSize(files[0].size)} · ready</small></>
              : <small className="text-muted">PDF, JPG or PNG · max 10 MB</small>}
          </div>
        )}
        <input ref={ref} id={id} type="file" className="d-none" accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const selected = Array.from(e.target.files || [], (file) => ({ fileName: file.name, size: file.size }));
            if (selected.length) onSelect(multiple ? [...files, ...selected] : selected[0]);
            e.target.value = '';
          }} />
        {!multiple && <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => ref.current?.click()}>{files.length ? 'Replace' : buttonLabel}</button>}
        {!multiple && files.length > 0 && <button type="button" className="btn btn-sm btn-light" aria-label="Remove file" onClick={() => onSelect(null)}><i className="bi bi-x-lg" /></button>}
      </div>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}

export function Dropdown({ trigger, children, align = 'end', label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="vb-dropdown" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-label': label })}
      {open && <div className="vb-dropdown-menu" role="menu" style={align === 'start' ? { left: 0, right: 'auto' } : undefined} onClick={(e) => { if (e.target.closest('[data-close]')) setOpen(false); }}>{children}</div>}
    </div>
  );
}

export function DocPreview({ doc }) {
  const isImg = /\.(png|jpe?g)$/i.test(doc?.fileName || '');
  return (
    <div className="doc-preview">
      <div>
        <i className={`bi ${isImg ? 'bi-file-earmark-image' : 'bi-file-earmark-pdf'} display-4 d-block mb-2 text-brand`} aria-hidden="true" />
        <div className="fw-semibold text-body">{doc?.fileName}</div>
        <small>{doc?.type} · {doc ? fileSize(doc.size || 240000) : ''}</small>
        <div className="small mt-2">Document preview placeholder — files are not uploaded in this prototype.</div>
      </div>
    </div>
  );
}

export function Field({ label, required, error, children, hint, htmlFor }) {
  return (
    <div>
      <label className={`form-label ${required ? 'required' : ''}`} htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <div className="form-text">{hint}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

export function Loading({ rows = 3 }) {
  return <div className="d-grid gap-2" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: 18 }} />)}</div>;
}
