import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, FilePicker, PageHeader, StatusBadge, DocPreview } from '../../components/common';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { fileSize, fmtDate, fmtDateTime } from '../../utils/format';
import { DOC_SLOTS } from './Register';

const FLOW = ['Submitted', 'Under review', 'Decision', 'Account activation'];

export function ApplicationProgress({ app, agent }) {
  const idx = app.status === 'Approved' ? (agent?.activated ? 4 : 3) : app.status === 'Rejected' ? 3 : app.status === 'Pending Review' && !app.reviewer ? 1 : 2;
  return (
    <div className="stepper">
      {FLOW.map((s, i) => (
        <div key={s} className={`step ${idx > i ? 'done' : idx === i ? 'active' : ''}`}>
          <span className="num">{idx > i ? <i className="bi bi-check" /> : i + 1}</span>{s}
        </div>
      ))}
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
      notify(d, a.reviewer ? [`admin:${a.reviewer}`, 'role:compliance'] : 'role:compliance', { category: 'Registration updates', title: `Application resubmitted: ${a.personal.firstName} ${a.personal.lastName}`, body: `${a.id} has updated information or documents.`, link: `/applications/${a.id}` });
      notify(d, `applicant:${user.email}`, { category: 'Registration updates', title: 'Your changes were resubmitted', body: `${a.id} is back in the review queue.`, link: '/my-application' });
      logAction(d, user, 'Resubmitted application', a.id);
    });
    setChanges({}); setAdded({}); setExplanation(''); setResponse(''); setEditing(false); setConfirm(false);
    toast('Your application was resubmitted for review.');
  };

  return (
    <>
      <PageHeader title="My Application" subtitle={`Reference ${app.id} · submitted ${fmtDate(app.submittedAt)}`} crumbs={[{ label: 'My Application' }]}
        actions={canEdit && !editing && <button className="btn btn-outline-primary" onClick={() => setEditing(true)}><i className="bi bi-pencil-square me-1" />Edit submitted documents</button>} />

      {params.get('submitted') && app.status === 'Pending Review' && (
        <div className="alert alert-success d-flex gap-3 align-items-center"><i className="bi bi-check-circle-fill fs-3" />
          <div><strong>Application submitted!</strong> Your reference number is <strong>{app.id}</strong>. Our compliance team usually reviews applications within 3 business days.</div></div>
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

      <div className="card mb-3"><div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div><span className="text-muted small me-2">Current status</span><StatusBadge status={app.status} /></div>
          {app.preferredTeamId && <span className="small text-muted"><i className="bi bi-people me-1" />Invited to {state.teams.find((t) => t.id === app.preferredTeamId)?.name}</span>}
        </div>
        <ApplicationProgress app={app} agent={agent} />
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
          <div className={`card ${editing ? 'border-primary' : ''}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>{editing ? 'Edit submitted documents' : 'Submitted documents'}</span>
              {editing && <button className="btn btn-sm btn-light" onClick={() => { setEditing(false); setChanges({}); setAdded({}); setErrors({}); }}>Cancel editing</button>}
            </div>
            <div className="card-body d-grid gap-2">
              {app.documents.map((d) => {
                const ch = changes[d.id];
                return (
                  <div key={d.id} className={`doc-tile ${ch?.removed ? 'opacity-50' : ''}`}>
                    <div className="doc-icon"><i className="bi bi-file-earmark-text" /></div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="small text-muted">{d.type}</div>
                      <div className="fw-medium text-truncate">{ch?.file ? <><s className="text-muted me-1">{d.fileName}</s>{ch.file.fileName}</> : d.fileName}</div>
                      <small className="text-muted">{fileSize(d.size || 200000)} · uploaded {fmtDateTime(d.uploadedAt)}</small>
                      {d.comment && <div className="small text-danger mt-1"><i className="bi bi-chat-left-text me-1" />{d.comment}</div>}
                    </div>
                    <div className="d-flex flex-column align-items-end gap-1">
                      {ch?.removed ? <span className="status-badge sb-gray">Will be removed</span> : ch?.file ? <span className="status-badge sb-blue">Replacement ready</span> : <StatusBadge status={d.status} />}
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-light" onClick={() => setPreview(d)} aria-label={`Preview ${d.fileName}`}><i className="bi bi-eye" /></button>
                        {editing && !ch?.removed && (
                          <label className="btn btn-sm btn-outline-primary mb-0">Replace
                            <input type="file" className="d-none" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) setChanges({ ...changes, [d.id]: { file: { fileName: f.name, size: f.size } } }); }} />
                          </label>
                        )}
                        {editing && (ch ? <button className="btn btn-sm btn-light" onClick={() => { const c = { ...changes }; delete c[d.id]; setChanges(c); }}>Undo</button>
                          : <button className="btn btn-sm btn-light text-danger" onClick={() => setChanges({ ...changes, [d.id]: { removed: true } })}>Remove</button>)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {editing && missingSlots.map((s) => (
                <div key={s.key}><FilePicker id={`add-${s.key}`} label={`Add: ${s.type}`} current={added[s.key]} onSelect={(f) => { const a = { ...added }; if (f) a[s.key] = f; else delete a[s.key]; setAdded(a); }} /></div>
              ))}
              {editing && <>
                <div>
                  <label className="form-label" htmlFor="expl">Explanation of changes (optional)</label>
                  <textarea id="expl" rows={2} className="form-control" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="e.g. Uploaded a clearer scan of my ID card" />
                </div>
                {errors.general && <div className="alert alert-warning py-2 small mb-0">{errors.general}</div>}
                <div className="d-flex justify-content-end"><button className="btn btn-primary" onClick={() => setConfirm(true)}><i className="bi bi-send me-1" />Resubmit changes</button></div>
              </>}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-header">Application details</div>
            <div className="card-body">
              <dl className="dl-grid mb-0">
                <div><dt>Name</dt><dd>{app.personal.firstName} {app.personal.lastName}</dd></div>
                <div><dt>Email</dt><dd>{app.personal.email}</dd></div>
                <div><dt>Phone</dt><dd>{app.personal.phone}</dd></div>
                <div><dt>Occupation</dt><dd>{app.professional.occupation}</dd></div>
              </dl>
            </div>
          </div>
          <div className="card">
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
        Your updated {openClar ? 'response and ' : ''}documents will be sent to the compliance team, and the application status will change to <strong>Resubmitted</strong>.
      </ConfirmModal>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.fileName} size="lg">
        {preview && <><DocPreview doc={preview} />
          <h3 className="h6 mt-3">Document history</h3>
          <ul className="small mb-0">{preview.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} — {h.text}</li>)}</ul></>}
      </Modal>
    </>
  );
}
