import { useState } from 'react';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { DocPreview, StatusBadge } from '../../components/common';
import { fileSize, fmtDateTime } from '../../utils/format';

export const DOC_STATUSES = ['Pending', 'Verified', 'Rejected', 'Requires Replacement'];

/** Document list + preview + per-document verification for one application. */
export default function DocumentReview({ appId, canEdit }) {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const app = state.applications.find((a) => a.id === appId);
  const [selId, setSelId] = useState(app?.documents[0]?.id);
  const doc = app?.documents.find((d) => d.id === selId) || app?.documents[0];
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
      if (!a.reviewer) a.reviewer = user.id;
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
          {app.documents.map((d) => (
            <button key={d.id} className={`doc-tile text-start ${d.id === doc?.id ? 'border-primary bg-brand-soft' : ''}`} onClick={() => setSelId(d.id)}>
              <div className="doc-icon"><i className={`bi ${/\.(png|jpe?g)$/i.test(d.fileName) ? 'bi-file-earmark-image' : 'bi-file-earmark-pdf'}`} /></div>
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="small text-muted">{d.type}</div>
                <div className="fw-medium text-truncate">{d.fileName}</div>
                <small className="text-muted">{fmtDateTime(d.uploadedAt)}</small>
              </div>
              <StatusBadge status={d.status} />
            </button>
          ))}
          {!app.documents.length && <p className="text-muted small">No documents submitted.</p>}
        </div>
      </div>
      <div className="col-md-7">
        {doc && <>
          <DocPreview doc={doc} />
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
            <small className="text-muted">{doc.fileName} · {fileSize(doc.size || 240000)}</small>
            <button className="btn btn-sm btn-light" onClick={() => toast(`${doc.fileName} downloaded (simulated).`, 'info')}><i className="bi bi-download me-1" />Download</button>
          </div>
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
          ) : <div className="small text-muted mt-2"><i className="bi bi-lock me-1" />You have view-only access to documents.</div>}
          <h4 className="small-caps mt-3">Document history</h4>
          <ul className="small text-muted ps-3 mb-0">{doc.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} — {h.text}</li>)}</ul>
        </>}
      </div>
    </div>
  );
}
