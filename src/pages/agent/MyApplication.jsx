import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, StatusBadge, DocPreview } from '../../components/common';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { fileSize, fmtDate, fmtDateTime } from '../../utils/format';
import { DOC_SLOTS } from './Register';

const FLOW = ['Submitted', 'Under review', 'Decision', 'Account activation'];

export function ApplicationProgress({ app, agent }) {
  const idx = app.status === 'Approved' ? (agent?.activated ? 3 : 2) : app.status === 'Rejected' ? 2 : 1;
  const statusText = {
    'Pending Review': app.reviewer ? 'Under review' : 'Submitted · awaiting review',
    'Clarification Required': 'Action needed from you',
    Resubmitted: 'Resubmitted · awaiting review',
    Approved: agent?.activated ? 'Account active' : 'Approved · activation needed',
    Rejected: 'Application rejected',
  }[app.status] || app.status;
  const stateClass = app.status === 'Rejected' ? 'rejected' : app.status === 'Clarification Required' ? 'attention' : 'in-progress';

  return (
    <div className="application-progress" aria-label="Application status progress">
      <div className="application-progress-heading">
        <span className="text-muted small">Current status</span>
        <span className={`application-progress-status ${stateClass}`}>{statusText}</span>
      </div>
      <ol className="application-progress-list">
        {FLOW.map((label, i) => {
          const activated = app.status === 'Approved' && agent?.activated;
          const completed = i < idx || (activated && i === idx);
          const current = i === idx;
          const currentClass = current ? (activated ? 'completed-state' : stateClass) : '';
          return (
            <li className={`application-progress-step ${completed ? 'completed' : ''} ${current ? `current ${currentClass}` : ''}`} key={label} aria-current={current ? 'step' : undefined}>
              <span className="application-progress-marker" aria-hidden="true">
                {completed ? <i className="bi bi-check-lg" /> : app.status === 'Rejected' && current ? <i className="bi bi-x-lg" /> : null}
              </span>
              <span className="application-progress-label">{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function MyApplication() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const [params] = useSearchParams();
  const app = user.application;
  const [editing, setEditing] = useState(params.get('edit') === '1');
  const [changes, setChanges] = useState({}); // docId -> {file} | {removed:true}
  const [added, setAdded] = useState({}); // slot key -> file
  const [explanation, setExplanation] = useState('');
  const [response, setResponse] = useState('');
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState(null);

  if (!app) {
    return (
      <>
        <PageHeader title="My Application" crumbs={[{ label: 'My Application' }]} />
        <div className="card"><EmptyState icon="bi-file-earmark-plus" title="You haven't submitted an application yet">
          Registration takes about 10 minutes. Have your ID card and bank book ready.
          <div className="mt-3"><Link to="/register" className="btn btn-primary">Start registration</Link></div>
        </EmptyState></div>
      </>
    );
  }

  const agent = state.agents.find((a) => a.id === app.agentId);
  const openClar = app.clarifications.find((c) => !c.response);
  const canEdit = ['Pending Review', 'Clarification Required', 'Resubmitted'].includes(app.status);
  const hasChanges = Object.keys(changes).length || Object.keys(added).length;
  const missingSlots = DOC_SLOTS.filter((s) => !app.documents.some((d) => d.type === s.type));

  const resubmit = () => {
    const e = {};
    if (openClar && response.trim().length < 5) e.response = 'Please respond to the clarification request.';
    if (!openClar && !hasChanges) e.general = 'Replace, remove or add at least one document before resubmitting.';
    const requiredRemoved = app.documents.filter((d) => changes[d.id]?.removed && DOC_SLOTS.find((s) => s.type === d.type)?.required);
    if (requiredRemoved.length) e.general = `${requiredRemoved[0].type} is required — upload a replacement instead of removing it.`;
    setErrors(e);
    if (Object.keys(e).length) { setConfirm(false); return; }
    const now = new Date().toISOString();
    mutate((d) => {
      const a = d.applications.find((x) => x.id === app.id);
      a.documents = a.documents.filter((doc) => {
        const ch = changes[doc.id];
        if (ch?.removed) { a.timeline.push({ at: now, text: `Removed document: ${doc.fileName}`, by: user.name }); return false; }
        if (ch?.file) {
          doc.history.push({ at: now, text: `Replaced ${doc.fileName} with ${ch.file.fileName}` });
          Object.assign(doc, { fileName: ch.file.fileName, size: ch.file.size, uploadedAt: now, status: 'Pending', comment: '' });
        }
        return true;
      });
      Object.entries(added).forEach(([key, f]) => {
        const slot = DOC_SLOTS.find((s) => s.key === key);
        a.documents.push({ id: `D${a.documents.length + 1}${key}`, type: slot.type, fileName: f.fileName, size: f.size, uploadedAt: now, status: 'Pending', comment: '', history: [{ at: now, text: `Uploaded ${f.fileName}` }] });
      });
      if (openClar) { const c = a.clarifications.find((x) => x.id === openClar.id); c.response = response.trim(); c.respondedAt = now; }
      a.status = 'Resubmitted';
      a.timeline.push({ at: now, text: `Application resubmitted${explanation.trim() ? ` — "${explanation.trim()}"` : ''}`, by: user.name });
      if (explanation.trim()) a.resubmitNote = explanation.trim();
      notify(d, a.reviewer ? [`admin:${a.reviewer}`, 'role:agentManager'] : 'role:agentManager', { category: 'Registration updates', title: `Application resubmitted: ${a.personal.firstName} ${a.personal.lastName}`, body: `${a.id} has updated information or documents.`, link: `/applications/${a.id}` });
      notify(d, `applicant:${user.email}`, { category: 'Registration updates', title: 'Your changes were resubmitted', body: `${a.id} is back in the review queue.`, link: '/my-application' });
      logAction(d, user, 'Resubmitted application', a.id);
    });
    setChanges({}); setAdded({}); setExplanation(''); setResponse(''); setEditing(false); setConfirm(false);
    toast('Your application was resubmitted for review.');
  };

  return (
    <div className="my-application-page">
      <PageHeader title="My Application" subtitle={`Reference ${app.id}`} crumbs={[{ label: 'My Application' }]} />

      {params.get('submitted') && app.status === 'Pending Review' && (
        <div className="alert alert-success d-flex gap-3 align-items-center"><i className="bi bi-check-circle-fill fs-3" />
          <div><strong>Application submitted!</strong> Your reference number is <strong>{app.id}</strong>. Our team usually reviews applications within 3 business days.</div></div>
      )}
      {app.status === 'Approved' && (
        <div className="hero-banner mb-3">
          <div className="position-relative" style={{ zIndex: 1 }}>
            <div className="small-caps" style={{ color: 'var(--vb-green-200)' }}>Registration approved</div>
            <h2 className="h4 text-white mt-1">Congratulations, {app.personal.firstName}! Your agent ID is {app.agentId}.</h2>
            {agent?.activated ? <p className="text-white-75 mb-0">Your account is active. Sign in with your agent account to continue.</p> : <>
              <p className="text-white-75">Activate your account and set your password to access the Agent Portal.</p>
              <Link to={`/first-login?app=${app.id}`} className="btn btn-light">Proceed to first login <i className="bi bi-arrow-right ms-1" /></Link>
            </>}
          </div>
        </div>
      )}
      {app.status === 'Rejected' && (
        <div className="alert alert-danger"><strong>Application not approved.</strong> {app.decisionNote}
          <div className="mt-2"><Link to="/help" className="btn btn-sm btn-outline-danger">Ask a question</Link></div></div>
      )}

      <div className="card application-progress-card mb-3"><div className="card-body">
        <ApplicationProgress app={app} agent={agent} />
        {app.preferredTeamId && <div className="small text-muted mt-3"><i className="bi bi-people me-1" />Invited to {state.teams.find((t) => t.id === app.preferredTeamId)?.name}</div>}
      </div></div>

      {openClar && (
        <div className="card mb-3 border-warning">
          <div className="card-header bg-warning-subtle"><i className="bi bi-question-diamond me-2" />Clarification requested by {openClar.by} · {fmtDateTime(openClar.at)}</div>
          <div className="card-body">
            <p className="mb-3">{openClar.message}</p>
            <label className="form-label required" htmlFor="clar">Your response</label>
            <textarea id="clar" rows={3} className={`form-control ${errors.response ? 'is-invalid' : ''}`} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Explain what you've updated or answer the question" />
            {errors.response && <div className="invalid-feedback">{errors.response}</div>}
            {!editing && <div className="mt-2 d-flex gap-2 flex-wrap">
              <button className="btn btn-outline-primary btn-sm" onClick={() => setEditing(true)}><i className="bi bi-upload me-1" />Upload revised documents</button>
              <button className="btn btn-primary btn-sm" onClick={() => setConfirm(true)}>Send response & resubmit</button>
            </div>}
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className={`card application-details-card ${editing ? 'border-primary' : ''}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Submitted documents</span>
              {editing
                ? <button className="btn btn-sm btn-light" onClick={() => { setEditing(false); setChanges({}); setAdded({}); setErrors({}); }}>Cancel</button>
                : canEdit && <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(true)}><i className="bi bi-pencil-square me-1" aria-hidden="true" />Edit</button>}
            </div>
            <div className="card-body d-grid gap-2">
              {app.documents.map((d) => {
                const ch = changes[d.id];
                const slot = DOC_SLOTS.find((item) => item.type === d.type);
                return (
                  <div key={d.id} className={`application-document ${ch?.removed ? 'opacity-50' : ''}`}>
                    <div className="application-document-heading">
                      <div className="doc-picker-heading">
                        <span className={`form-label mb-0 ${slot?.required ? 'required' : ''}`}>{d.type}</span>
                      </div>
                      {editing && (
                        <div className="application-document-actions">
                          {!ch?.removed && <label className="btn btn-sm btn-light application-document-action" title={`Add replacement for ${d.type}`}>
                            <i className="bi bi-plus-lg" aria-hidden="true" />
                            <input type="file" className="d-none" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setChanges({ ...changes, [d.id]: { file: { fileName: f.name, size: f.size } } });
                              e.target.value = '';
                            }} />
                          </label>}
                        </div>
                      )}
                    </div>
                    <div className="doc-tile">
                      <div className="doc-icon"><i className="bi bi-file-earmark-text" /></div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-medium text-truncate">
                          {ch?.file && <s className="text-muted me-1">{d.fileName}</s>}
                          <button
                            type="button"
                            className="doc-name-link"
                            onClick={() => setPreview(ch?.file ? { ...d, ...ch.file } : d)}
                            disabled={ch?.removed}
                          >
                            {ch?.file ? ch.file.fileName : d.fileName}
                          </button>
                        </div>
                        <small className="document-file-details">{fileSize(d.size || 200000)} · uploaded {fmtDateTime(d.uploadedAt)}</small>
                        {d.comment && <div className="small text-danger mt-1"><i className="bi bi-chat-left-text me-1" />{d.comment}</div>}
                      </div>
                      <div className="application-document-card-actions">
                        {ch?.removed ? <span className="status-badge sb-gray">Will be removed</span> : ch?.file ? <span className="status-badge sb-blue">Replacement ready</span> : <StatusBadge status={d.status} />}
                        {editing && (ch
                          ? <button className="btn btn-sm btn-light application-document-action" aria-label="Undo document change" title="Undo document change" onClick={() => { const c = { ...changes }; delete c[d.id]; setChanges(c); }}><i className="bi bi-arrow-counterclockwise" /></button>
                          : <button className="btn btn-sm btn-danger application-document-remove" aria-label={`Remove ${d.type}`} title={`Remove ${d.type}`} onClick={() => setChanges({ ...changes, [d.id]: { removed: true } })}><i className="bi bi-x-lg" /></button>)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {editing && missingSlots.map((s) => (
                <div key={s.key} className="application-document">
                  <div className="application-document-heading">
                    <label className={`form-label mb-0 ${s.required ? 'required' : ''}`} htmlFor={`add-${s.key}`}>{s.type}</label>
                    <label className="btn btn-sm btn-light application-document-action" title={`Add ${s.type}`} aria-label={`Add ${s.type}`}>
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      <input id={`add-${s.key}`} type="file" className="d-none" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setAdded({ ...added, [s.key]: { fileName: f.name, size: f.size } });
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
                  <div className="doc-tile">
                    <div className="doc-icon"><i className={`bi ${added[s.key] ? 'bi-file-earmark-check' : 'bi-file-earmark-arrow-up'}`} /></div>
                    <div className="flex-grow-1 text-truncate">{added[s.key] ? <><div className="fw-medium text-truncate">{added[s.key].fileName}</div><small className="document-file-details">{fileSize(added[s.key].size)} · ready</small></> : <small className="text-muted">PDF, JPG or PNG</small>}</div>
                    {added[s.key] && <button type="button" className="btn btn-sm btn-light text-danger application-document-action" aria-label={`Remove ${s.type}`} title={`Remove ${s.type}`} onClick={() => { const nextAdded = { ...added }; delete nextAdded[s.key]; setAdded(nextAdded); }}><i className="bi bi-x-lg" /></button>}
                  </div>
                </div>
              ))}
              {editing && <>
                <div>
                  <label className="form-label" htmlFor="expl">Explanation of changes (optional)</label>
                  <textarea id="expl" rows={2} className="form-control" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="e.g. Uploaded a clearer scan of my ID card" />
                </div>
                {errors.general && <div className="alert alert-warning py-2 small mb-0">{errors.general}</div>}
                <div className="d-flex justify-content-end"><button className="btn btn-primary" onClick={() => setConfirm(true)}><i className="bi bi-send me-1" />Resubmit</button></div>
              </>}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card application-details-card mb-3">
            <div className="card-header">Application details</div>
            <div className="card-body">
              <dl className="application-details-list mb-0">
                <div><dt>Name</dt><dd>{app.personal.firstName} {app.personal.lastName}</dd></div>
                <div><dt>Email</dt><dd>{app.personal.email}</dd></div>
                <div><dt>Phone</dt><dd>{app.personal.phone}</dd></div>
                <div><dt>Occupation</dt><dd>{app.professional.occupation}</dd></div>
              </dl>
            </div>
          </div>
          <div className="card application-details-card">
            <div className="card-header">Submission history</div>
            <div className="card-body">
              <ul className="timeline small mb-0">
                {[...app.timeline].reverse().map((t, i) => <li key={i} className="done"><div>{t.text}</div><small className="text-muted">{fmtDateTime(t.at)}{t.by ? ` · ${t.by}` : ''}</small></li>)}
              </ul>
              {app.clarifications.filter((c) => c.response).map((c) => (
                <div key={c.id} className="border rounded p-2 small mt-2 bg-light">
                  <div><strong>Q:</strong> {c.message}</div><div className="mt-1"><strong>Your answer:</strong> {c.response}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={resubmit} title="Resubmit application?" confirmLabel="Resubmit">
        Your updated {openClar ? 'response and ' : ''}documents will be sent to our review team, and the application status will change to <strong>Resubmitted</strong>.
      </ConfirmModal>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.fileName} size="lg">
        {preview && <><DocPreview doc={preview} />
          <h3 className="h6 mt-3">Document history</h3>
          <ul className="small mb-0">{preview.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} — {h.text}</li>)}</ul></>}
      </Modal>
    </div>
  );
}
