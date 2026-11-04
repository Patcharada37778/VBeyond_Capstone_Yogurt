import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, EmptyState, PageHeader, StatusBadge, Tabs } from '../../components/common';
import { Modal } from '../../components/modals/Modal';
import { TeamHistory } from '../agent/Profile';
import { mask } from './AgentDirectory';
import { daysUntil, fmtDate, fmtDateTime, fmtMoney, fullName, isEmail, isPhone, toInputDate } from '../../utils/format';

export default function AgentDetail() {
  const { id } = useParams();
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [edit, setEdit] = useState(null);
  const [errors, setErrors] = useState({});
  const a = state.agents.find((x) => x.id === id);
  if (!a) return <><PageHeader title="Agent not found" crumbs={[{ label: 'Agent Directory', to: '/agents' }]} /><div className="card"><EmptyState title="No agent with this ID" /></div></>;

  const team = state.teams.find((t) => t.id === a.teamId);
  const lead = state.agents.find((x) => x.id === team?.leadId);
  const deals = state.deals.filter((d) => d.agentId === a.id || d.previousAgentId === a.id);
  const renewals = state.renewals.filter((r) => r.agentId === a.id);
  const sensitive = can('agents', 'edit');
  const canEdit = can('agents', 'edit');

  const save = () => {
    const e = {};
    if (!edit.firstName.trim()) e.firstName = 'Required.';
    if (!edit.lastName.trim()) e.lastName = 'Required.';
    if (!isEmail(edit.email)) e.email = 'Enter a valid email.';
    if (!isPhone(edit.phone)) e.phone = 'Enter a valid phone.';
    setErrors(e);
    if (Object.keys(e).length) return;
    mutate((d) => {
      const x = d.agents.find((y) => y.id === id);
      Object.assign(x, { firstName: edit.firstName.trim(), lastName: edit.lastName.trim(), email: edit.email.trim(), phone: edit.phone.trim(), address: edit.address.trim(), licenseNo: edit.licenseNo.trim(), membershipExpiry: new Date(edit.membershipExpiry).toISOString() });
      x.activity.unshift({ at: new Date().toISOString(), text: `Agent information updated by ${user.name}` });
      notify(d, `agent:${id}`, { category: 'Team assignment', title: 'Your agent record was updated', body: `Updated by ${user.name} (Agent Management).`, link: '/profile' });
      logAction(d, user, 'Edited agent information', id);
    });
    setEdit(null);
    toast('Agent information saved.');
  };

  return (
    <>
      <PageHeader title={fullName(a)} subtitle={`${a.id}${a.legacyId ? ` · legacy ${a.legacyId}` : ''}`} crumbs={[{ label: 'Agent Team Management' }, { label: 'Agent Directory', to: '/agents' }, { label: a.id }]}
        actions={<>
          {canEdit && <button className="btn btn-light" onClick={() => { setErrors({}); setEdit({ ...a, membershipExpiry: toInputDate(a.membershipExpiry) }); }}><i className="bi bi-pencil me-1" />Edit information</button>}
          {can('agentStatus', 'edit') && <Link className="btn btn-outline-primary" to={`/agent-status?agent=${a.id}`}><i className="bi bi-toggles me-1" />Change status</Link>}
          {can('teams', 'edit') && a.teamId && <Link className="btn btn-outline-primary" to={`/teams?transfer=${a.id}`}><i className="bi bi-arrow-left-right me-1" />Transfer</Link>}
          {can('onboarding', 'edit') && !a.teamId && a.status === 'Active' && <Link className="btn btn-primary" to={`/onboarding?agent=${a.id}`}><i className="bi bi-person-plus me-1" />Onboard to team</Link>}
        </>} />
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card mb-3"><div className="card-body text-center">
            <Avatar name={fullName(a)} color={a.avatarColor} photo={a.photo} size={88} />
            <h2 className="h5 mt-3 mb-1">{fullName(a)}</h2>
            <div className="d-flex justify-content-center gap-2 flex-wrap"><StatusBadge status={a.status} />{team?.leadId === a.id && <span className="status-badge sb-purple">Team Lead</span>}{!a.activated && <span className="status-badge sb-amber">Not signed in yet</span>}</div>
            {a.statusNote && <div className="small text-muted mt-2">Last status change: {a.statusNote.from} → {a.status} · {a.statusNote.reason}</div>}
          </div></div>
          <div className="card"><div className="card-header">Contact</div><div className="card-body">
            <dl className="d-grid gap-2 mb-0 small">
              <div><dt className="fw-normal text-muted">Email</dt><dd className="mb-0">{sensitive ? <a href={`mailto:${a.email}`}>{a.email}</a> : mask(a.email)}</dd></div>
              <div><dt className="fw-normal text-muted">Phone</dt><dd className="mb-0">{sensitive ? a.phone : mask(a.phone)}</dd></div>
              <div><dt className="fw-normal text-muted">LINE ID</dt><dd className="mb-0">{sensitive ? a.lineId || '—' : '••••'}</dd></div>
              <div><dt className="fw-normal text-muted">Address</dt><dd className="mb-0">{sensitive ? a.address : 'Restricted'}</dd></div>
            </dl>
          </div></div>
        </div>
        <div className="col-lg-8">
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Team</div><div className="fw-semibold">{team?.name || 'None'}</div></div></div></div>
            <div className="col-6 col-md-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Team lead</div><div className="fw-semibold">{lead ? fullName(lead) : '—'}</div></div></div></div>
            <div className="col-6 col-md-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Membership expiry</div><div className={`fw-semibold ${daysUntil(a.membershipExpiry) < 30 ? 'text-danger' : ''}`}>{fmtDate(a.membershipExpiry)}</div></div></div></div>
            <div className="col-6 col-md-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Active deals</div><div className="fw-semibold">{deals.filter((d) => d.agentId === a.id).length}</div></div></div></div>
          </div>
          <div className="card">
            <div className="card-body pb-0"><Tabs active={tab} onChange={setTab} tabs={[{ key: 'profile', label: 'Profile' }, { key: 'deals', label: 'Deals', count: deals.length }, { key: 'teams', label: 'Team history' }, { key: 'renewals', label: 'Renewals', count: renewals.length }, { key: 'activity', label: 'Activity' }]} /></div>
            <div className="card-body pt-0">
              {tab === 'profile' && <dl className="dl-grid mb-0">
                <div><dt>Registered</dt><dd>{fmtDate(a.registeredAt)}</dd></div>
                <div><dt>Onboarded</dt><dd>{fmtDate(a.onboardedAt)}</dd></div>
                <div><dt>Membership start</dt><dd>{fmtDate(a.membershipStart)}</dd></div>
                <div><dt>License no.</dt><dd>{a.licenseNo}</dd></div>
                <div><dt>Date of birth</dt><dd>{sensitive ? fmtDate(a.dob) : 'Restricted'}</dd></div>
                <div><dt>Nationality</dt><dd>{a.nationality}</dd></div>
                <div style={{ gridColumn: '1 / -1' }}><dt>Experience</dt><dd>{a.experience}</dd></div>
                <div style={{ gridColumn: '1 / -1' }}><dt>Qualifications</dt><dd>{a.qualifications}</dd></div>
                {a.onboardNotes && <div style={{ gridColumn: '1 / -1' }}><dt>Onboarding notes (internal)</dt><dd>{a.onboardNotes}</dd></div>}
              </dl>}
              {tab === 'deals' && (deals.length ? (
                <div className="table-responsive"><table className="table">
                  <thead><tr><th>Deal</th><th>Project / unit</th><th>Value</th><th>Stage</th><th>Flag</th></tr></thead>
                  <tbody>{deals.map((d) => <tr key={d.id}><td>{d.id}</td><td>{d.project}<div className="small text-muted">Unit {d.unit}</div></td><td>{fmtMoney(d.value)}</td><td>{d.stage}</td>
                    <td>{d.previousAgentId === a.id ? <span className="status-badge sb-gray">Reassigned to {d.agentId}</span> : d.flag ? <span className="status-badge sb-amber">{d.flag}</span> : '—'}</td></tr>)}</tbody>
                </table></div>) : <EmptyState icon="bi-briefcase" title="No deals" />)}
              {tab === 'teams' && <TeamHistory agent={a} teams={state.teams} />}
              {tab === 'renewals' && (renewals.length ? <ul className="list-unstyled mb-0 d-grid gap-2">{renewals.map((r) => <li key={r.id} className="border rounded p-2 d-flex justify-content-between"><span>{r.id} · {fmtDate(r.requestedAt)} · {r.period}</span><StatusBadge status={r.status} /></li>)}</ul> : <EmptyState icon="bi-arrow-repeat" title="No renewal requests" />)}
              {tab === 'activity' && <ul className="timeline small mb-0">{a.activity.map((x, i) => <li key={i} className="done"><div>{x.text}</div><small className="text-muted">{fmtDateTime(x.at)}</small></li>)}</ul>}
            </div>
          </div>
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit agent information" size="lg" footer={<><button className="btn btn-light" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save changes</button></>}>
        {edit && <div className="row g-3">
          {[['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone'], ['licenseNo', 'License number']].map(([k, l]) => (
            <div className="col-md-6" key={k}><label className="form-label" htmlFor={`ae-${k}`}>{l}</label><input id={`ae-${k}`} className={`form-control ${errors[k] ? 'is-invalid' : ''}`} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />{errors[k] && <div className="invalid-feedback">{errors[k]}</div>}</div>
          ))}
          <div className="col-md-6"><label className="form-label" htmlFor="ae-exp">Membership expiry</label><input id="ae-exp" type="date" className="form-control" value={edit.membershipExpiry} onChange={(e) => setEdit({ ...edit, membershipExpiry: e.target.value })} /></div>
          <div className="col-12"><label className="form-label" htmlFor="ae-ad">Address</label><textarea id="ae-ad" rows={2} className="form-control" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
        </div>}
      </Modal>
    </>
  );
}
