import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, StatusBadge, Tabs } from '../../components/common';
import { Modal } from '../../components/modals/Modal';
import DocumentReview, { isVerifiable } from './DocumentReview';
import { addYears, fmtDate, fmtDateTime } from '../../utils/format';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const [modal, setModal] = useState(null); // 'approve' | 'reject' | 'clarify'
  const [msg, setMsg] = useState('');
  const [markDocs, setMarkDocs] = useState([]);
  const [error, setError] = useState('');
  const app = state.applications.find((a) => a.id === id);

  if (!app) return <><PageHeader title="Application not found" crumbs={[{ label: 'Applications', to: '/applications' }]} /><div className="card"><EmptyState title="This application does not exist" /></div></>;

  const name = `${app.personal.firstName} ${app.personal.lastName}`;
  const open = !['Approved', 'Rejected'].includes(app.status);
  const canApprove = can('applications', 'approve');
  const canEdit = can('applications', 'edit');
  const canDocs = can('documents', 'edit') || canEdit;
  const team = state.teams.find((t) => t.id === app.preferredTeamId);
  const verifiable = app.documents.filter(isVerifiable);
  const unverified = verifiable.filter((d) => d.status !== 'Verified');
  const openClar = app.clarifications.find((c) => !c.response);

  const openModal = (m) => { setMsg(''); setError(''); setMarkDocs([]); setModal(m); };

  const approve = () => {
    const agentId = `AG-${state.counters.agent}`;
    const now = new Date().toISOString();
    mutate((d) => {
      d.counters.agent++;
      const a = d.applications.find((x) => x.id === id);
      a.status = 'Approved'; a.agentId = agentId; a.decisionNote = msg.trim() || 'Approved';
      a.timeline.push({ at: now, text: `Application approved — agent ID ${agentId} generated`, by: user.name });
      d.agents.push({
        id: agentId, firstName: a.personal.firstName, lastName: a.personal.lastName, email: a.personal.email.toLowerCase(), phone: a.personal.phone, lineId: '',
        teamId: null, status: 'Active', registeredAt: now, membershipStart: now, membershipExpiry: addYears(now, 1),
        address: a.personal.address, nationality: a.personal.nationality, dob: a.personal.dob, experience: a.professional.experience, occupation: a.professional.occupation,
        qualifications: a.professional.qualifications || '—', licenseNo: `REB-${66000 + d.counters.agent}`, avatarColor: '#007d46', photo: null, activated: true, migrated: false, sourceDemo: true,
        onboardedAt: null, teamHistory: [], preferredTeamId: a.preferredTeamId, sourceAppId: a.id,
        activity: [{ at: now, text: `Agent account created after registration approval (${a.id}) by ${user.name}` }],
      });
      if (a.referredBy) notify(d, `agent:${a.referredBy}`, { category: 'Team invitations', title: `${a.personal.firstName} ${a.personal.lastName}'s registration was approved`, body: 'The Agent Manager will onboard them to the team.', link: '/dashboard' });
      notify(d, [`applicant:${a.userKey}`, `agent:${agentId}`], { category: 'Registration approval', title: 'Your registration has been approved!', body: `Welcome to VBEYOND! Your account is now an agent account. Your agent ID is ${agentId}.`, link: '/dashboard' });
      notify(d, 'role:agentManager', { category: 'Registration updates', title: `Approved agent ready for onboarding: ${a.personal.firstName} ${a.personal.lastName}`, body: `${agentId}${a.preferredTeamId ? ` · invited to ${d.teams.find((t) => t.id === a.preferredTeamId)?.name}` : ''}`, link: `/teams?tab=onboarding&agent=${agentId}` });
      logAction(d, user, 'Approved application', `${id} → ${agentId}`);
    });
    setModal(null);
    toast(`${name} approved. Agent ID ${agentId} generated and the applicant was notified.`, 'success', 'Application approved');
  };

  const reject = () => {
    if (msg.trim().length < 10) return setError('Enter a rejection reason (at least 10 characters). It will be shared with the applicant.');
    mutate((d) => {
      const a = d.applications.find((x) => x.id === id);
      a.status = 'Rejected'; a.decisionNote = msg.trim();
      a.timeline.push({ at: new Date().toISOString(), text: `Application rejected — ${msg.trim()}`, by: user.name });
      notify(d, `applicant:${a.userKey}`, { category: 'Registration updates', title: 'Your registration was not approved', body: msg.trim(), link: '/my-application' });
      logAction(d, user, 'Rejected application', id);
    });
    setModal(null);
    toast(`${id} rejected and the applicant was notified.`, 'info');
  };

  const clarify = () => {
    if (msg.trim().length < 10) return setError('Explain what information is missing (at least 10 characters).');
    mutate((d) => {
      const a = d.applications.find((x) => x.id === id);
      a.status = 'Clarification Required';
      a.clarifications.push({ id: `CL-${a.clarifications.length + 1}`, message: msg.trim(), by: user.name, at: new Date().toISOString(), response: '', respondedAt: null });
      markDocs.forEach((docId) => { const doc = a.documents.find((x) => x.id === docId); doc.status = 'Requires Replacement'; doc.comment = doc.comment || msg.trim(); doc.history.push({ at: new Date().toISOString(), text: `Marked Requires Replacement by ${user.name}` }); });
      a.timeline.push({ at: new Date().toISOString(), text: 'Clarification requested', by: user.name });
      notify(d, `applicant:${a.userKey}`, { category: 'Document clarification requests', title: 'Additional information needed for your application', body: msg.trim(), link: '/my-application' });
      logAction(d, user, 'Requested clarification', id);
    });
    setModal(null);
    toast('Clarification request sent to the applicant.');
  };

  return (
    <>
      <PageHeader title={name} subtitle={`${app.id} · submitted ${fmtDateTime(app.submittedAt)}`}
        crumbs={[{ label: 'Agent Team Management' }, { label: 'Applications', to: '/applications' }, { label: app.id }]}
        actions={open && <>
          {canEdit && <button className="btn btn-outline-primary" onClick={() => openModal('clarify')}><i className="bi bi-question-diamond me-1" />Request clarification</button>}
          {canApprove && <button className="btn btn-outline-danger" onClick={() => openModal('reject')}><i className="bi bi-x-circle me-1" />Reject</button>}
          {canApprove && <button className="btn btn-success" onClick={() => openModal('approve')}><i className="bi bi-check-circle me-1" />Approve</button>}
        </>} />

      <div className="row g-3 mb-3">
        <div className="col-md-4 col-6"><div className="card h-100"><div className="card-body"><div className="small text-muted">Status</div><div className="mt-1"><StatusBadge status={app.status} /></div></div></div></div>
        <div className="col-md-4 col-6"><div className="card h-100"><div className="card-body"><div className="small text-muted">Documents verified</div><div className="fw-semibold mt-1">{verifiable.length - unverified.length} / {verifiable.length}</div></div></div></div>
        <div className="col-md-4 col-6"><div className="card h-100"><div className="card-body"><div className="small text-muted">{app.agentId ? 'Agent ID' : 'Invited team'}</div><div className="fw-semibold mt-1">{app.agentId ? <Link to={`/agents/${app.agentId}`}>{app.agentId}</Link> : team?.name || '—'}</div></div></div></div>
      </div>

      {app.status === 'Resubmitted' && <div className="alert alert-brand"><i className="bi bi-arrow-repeat me-2" />The applicant resubmitted this application{app.resubmitNote ? `: "${app.resubmitNote}"` : '.'} Review the updated documents and responses.</div>}
      {openClar && <div className="alert alert-warning small"><strong>Waiting for applicant:</strong> {openClar.message}</div>}
      {['Approved', 'Rejected'].includes(app.status) && <div className={`alert ${app.status === 'Approved' ? 'alert-success' : 'alert-danger'} small`}><strong>Decision:</strong> {app.decisionNote}</div>}

      <div className="card">
        <div className="card-body pb-0">
          <Tabs active={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ key: 'overview', label: 'Applicant information' }, { key: 'documents', label: 'Documents', count: app.documents.length }, { key: 'clarifications', label: 'Clarifications', count: app.clarifications.length }, { key: 'timeline', label: 'Timeline' }]} />
        </div>
        <div className="card-body pt-0">
          {tab === 'overview' && <>
            <h3 className="small-caps">Personal information</h3>
            <dl className="dl-grid mb-4">
              <div><dt>First name</dt><dd>{app.personal.firstName}</dd></div>
              <div><dt>Last name</dt><dd>{app.personal.lastName}</dd></div>
              <div><dt>Email</dt><dd>{app.personal.email}</dd></div>
              <div><dt>Phone</dt><dd>{app.personal.phone}</dd></div>
              <div><dt>Date of birth</dt><dd>{fmtDate(app.personal.dob)}</dd></div>
              <div><dt>Nationality</dt><dd>{app.personal.nationality}</dd></div>
              <div style={{ gridColumn: '1 / -1' }}><dt>Address</dt><dd>{app.personal.address}</dd></div>
            </dl>
            <h3 className="small-caps">Professional information</h3>
            <dl className="dl-grid mb-0">
              <div><dt>Current occupation</dt><dd>{app.professional.occupation}</dd></div>
              <div><dt>Referrer</dt><dd>{app.professional.referrer || '—'}</dd></div>
              <div style={{ gridColumn: '1 / -1' }}><dt>Previous experience</dt><dd>{app.professional.experience}</dd></div>
              <div style={{ gridColumn: '1 / -1' }}><dt>Qualifications</dt><dd>{app.professional.qualifications || '—'}</dd></div>
            </dl>
          </>}
          {tab === 'documents' && <DocumentReview appId={app.id} canEdit={canDocs && open} />}
          {tab === 'clarifications' && (app.clarifications.length ? (
            <div className="d-grid gap-3">
              {app.clarifications.map((c) => (
                <div key={c.id} className="border rounded p-3">
                  <div className="small text-muted mb-1">{c.by} · {fmtDateTime(c.at)}</div>
                  <div className="fw-medium">{c.message}</div>
                  <div className={`mt-2 p-2 rounded small ${c.response ? 'bg-light' : 'bg-warning-subtle'}`}>
                    {c.response ? <><strong>Applicant response</strong> ({fmtDateTime(c.respondedAt)}): {c.response}</> : 'Waiting for the applicant to respond.'}
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="bi-chat-square" title="No clarification requests" />)}
          {tab === 'timeline' && <ul className="timeline small mb-0">{[...app.timeline].reverse().map((t, i) => <li key={i} className="done"><div>{t.text}</div><small className="text-muted">{fmtDateTime(t.at)} · {t.by}</small></li>)}</ul>}
        </div>
      </div>

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="Approve application?" footer={<><button className="btn btn-light" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-success" onClick={approve}>Approve & generate agent ID</button></>}>
        <p>Approving <strong>{name}</strong> ({app.id}) will:</p>
        <ul className="small">
          <li>Change the application status to <strong>Approved</strong></li>
          <li>Generate agent ID <strong>AG-{state.counters.agent}</strong> with a 1-year membership</li>
          <li>Turn the applicant's account into an agent account and notify them</li>
          <li>Add the agent to the Agent Manager's onboarding queue{team ? ` (invited to ${team.name})` : ''}</li>
        </ul>
        {unverified.length > 0 && <div className="alert alert-warning small"><i className="bi bi-exclamation-triangle me-1" />{unverified.length} document(s) are not marked Verified: {unverified.map((d) => d.type).join(', ')}.</div>}
        <label className="form-label" htmlFor="ap-n">Approval note (optional)</label>
        <textarea id="ap-n" rows={2} className="form-control" value={msg} onChange={(e) => setMsg(e.target.value)} />
      </Modal>
      <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="Reject application?" footer={<><button className="btn btn-light" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-danger" onClick={reject}>Reject application</button></>}>
        <p className="small">The applicant will be notified with the reason below. This cannot be undone.</p>
        <label className="form-label required" htmlFor="rj-n">Rejection reason</label>
        <textarea id="rj-n" rows={3} className={`form-control ${error ? 'is-invalid' : ''}`} value={msg} onChange={(e) => { setMsg(e.target.value); setError(''); }} />
        {error && <div className="invalid-feedback">{error}</div>}
      </Modal>
      <Modal open={modal === 'clarify'} onClose={() => setModal(null)} title="Request clarification" footer={<><button className="btn btn-light" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={clarify}>Send request</button></>}>
        <label className="form-label required" htmlFor="cl-n">What information is missing?</label>
        <textarea id="cl-n" rows={4} className={`form-control ${error ? 'is-invalid' : ''}`} value={msg} onChange={(e) => { setMsg(e.target.value); setError(''); }} placeholder="e.g. Please upload a clearer copy of your ID card — the expiry date is not readable." />
        {error && <div className="invalid-feedback">{error}</div>}
        {verifiable.length > 0 && <>
          <div className="form-label mt-3">Mark documents that need replacement (optional)</div>
          {verifiable.map((d) => (
            <div className="form-check" key={d.id}>
              <input id={`md-${d.id}`} className="form-check-input" type="checkbox" checked={markDocs.includes(d.id)} onChange={(e) => setMarkDocs(e.target.checked ? [...markDocs, d.id] : markDocs.filter((x) => x !== d.id))} />
              <label className="form-check-label small" htmlFor={`md-${d.id}`}>{d.type} — {d.fileName}</label>
            </div>
          ))}
        </>}
      </Modal>
    </>
  );
}
