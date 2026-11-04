import { useState } from 'react';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { DocPreview, StatusBadge } from '../../components/common';
import { DOC_SLOTS } from '../agent/Register';
import { fileSize, fmtDateTime } from '../../utils/format';

export const DOC_STATUSES = ['Pending', 'Verified', 'Rejected', 'Requires Replacement'];
export const OTHER_DOC_TYPE = 'Other supporting document';
/** Documents that need a verification decision ("Other" can be anything, so it is view-only). */
export const isVerifiable = (doc) => doc.type !== OTHER_DOC_TYPE;

/** One fixed row per required document type, with preview and per-document verification. */
export default function DocumentReview({ appId, canEdit }) {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const app = state.applications.find((a) => a.id === appId);
  const slots = DOC_SLOTS.map((s) => ({ ...s, doc: app?.documents.find((d) => d.type === s.type) }));
  const firstUploaded = slots.find((s) => s.doc)?.key;
  const [selKey, setSelKey] = useState(firstUploaded);
  const slot = slots.find((s) => s.key === selKey) || slots[0];
  const doc = slot?.doc;
  const [comment, setComment] = useState(doc?.comment || '');
  const [lastSel, setLastSel] = useState(doc?.id);
  if (doc && doc.id !== lastSel) { setLastSel(doc.id); setComment(doc.comment || ''); }
  if (!app) return null;

  const setStatus = (status) => {
    if (['Rejected', 'Requires Replacement'].includes(status) && !comment.trim()) { toast('Add a comment explaining the problem with this document.', 'warning'); return; }
    mutate((d) => {
      const a = d.applications.find((x) => x.id === appId);
      const x = a.documents.find((y) => y.id === doc.id);
      x.status = status; x.comment = comment.trim();
      x.history.push({ at: new Date().toISOString(), text: `Marked ${status}${comment.trim() ? ` — ${comment.trim()}` : ''} by ${user.name}` });
      a.timeline.push({ at: new Date().toISOString(), text: `${x.type} marked ${status}`, by: user.name });
      logAction(d, user, `Marked document ${status}`, `${appId} / ${x.type}`);
    });
    toast(`${doc.type} marked as ${status}.`);
  };
  const saveComment = () => {
    mutate((d) => { d.applications.find((x) => x.id === appId).documents.find((y) => y.id === doc.id).comment = comment.trim(); });
    toast('Comment saved.');
  };

  return (
    <div className="row g-3">
      <div className="col-md-5">
        <div className="d-grid gap-2">
          {slots.map((s) => (
            <button key={s.key} className={`doc-tile text-start ${s.key === slot.key ? 'border-primary bg-brand-soft' : ''}`} onClick={() => setSelKey(s.key)}>
              <div className="doc-icon"><i className={`bi ${s.doc ? (/\.(png|jpe?g)$/i.test(s.doc.fileName) ? 'bi-file-earmark-image' : 'bi-file-earmark-pdf') : 'bi-file-earmark-x'}`} /></div>
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="small fw-semibold">{s.type}{s.required && <span className="text-danger"> *</span>}</div>
                <div className={`text-truncate small ${s.doc ? '' : 'text-muted fst-italic'}`}>{s.doc ? s.doc.fileName : 'Not uploaded'}</div>
              </div>
              {s.doc ? (isVerifiable(s.doc) ? <StatusBadge status={s.doc.status} /> : <span className="status-badge sb-gray">View only</span>)
                : <span className={`status-badge ${s.required ? 'sb-red' : 'sb-gray'}`}>{s.required ? 'Missing' : 'Optional'}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="col-md-7">
        {doc ? <>
          <DocPreview doc={doc} />
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
            <small className="text-muted">{doc.fileName} · {fileSize(doc.size || 240000)} · uploaded {fmtDateTime(doc.uploadedAt)}</small>
            <button className="btn btn-sm btn-light" onClick={() => toast(`${doc.fileName} downloaded (simulated).`, 'info')}><i className="bi bi-download me-1" />Download</button>
          </div>
          {isVerifiable(doc) ? <>
            <div className="mt-3">
              <label className="form-label" htmlFor="dc">Reviewer comment</label>
              <textarea id="dc" rows={2} className="form-control" value={comment} onChange={(e) => setComment(e.target.value)} disabled={!canEdit} placeholder="Visible to the applicant when the document needs attention" />
            </div>
            {canEdit ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                <button className="btn btn-sm btn-success" onClick={() => setStatus('Verified')}><i className="bi bi-check-lg me-1" />Verified</button>
                <button className="btn btn-sm btn-outline-primary" onClick={() => setStatus('Requires Replacement')}><i className="bi bi-arrow-repeat me-1" />Requires replacement</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => setStatus('Rejected')}><i className="bi bi-x-lg me-1" />Rejected</button>
                <button className="btn btn-sm btn-light" onClick={() => setStatus('Pending')}>Reset to pending</button>
                <button className="btn btn-sm btn-light ms-auto" onClick={saveComment}>Save comment</button>
              </div>
            ) : <div className="small text-muted mt-2"><i className="bi bi-lock me-1" />This application is closed — documents can't be changed.</div>}
          </> : <div className="alert alert-light border small mt-3 mb-0"><i className="bi bi-info-circle me-1" />Other supporting documents can be anything, so they're for reference only and don't need approval.</div>}
          <h4 className="small-caps mt-3">Document history</h4>
          <ul className="small text-muted ps-3 mb-0">{doc.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} — {h.text}</li>)}</ul>
        </> : (
          <div className="doc-preview"><div><i className="bi bi-file-earmark-x display-5 d-block mb-2" /><div className="fw-semibold text-body">{slot.type}</div><small>{slot.required ? 'Required document — not uploaded yet. Request clarification to ask for it.' : 'Optional document — not uploaded.'}</small></div></div>
        )}
      </div>
    </div>
  );
}
