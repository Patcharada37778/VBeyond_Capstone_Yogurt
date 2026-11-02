import { useRef, useState } from 'react';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, PageHeader, StatusBadge, Tabs } from '../../components/common';
import { daysUntil, fmtDate, fmtDateTime, fullName, isEmail, isPhone } from '../../utils/format';

export function TeamHistory({ agent, teams }) {
  if (!agent.teamHistory.length) return <p className="text-muted small mb-0">No team assignments yet.</p>;
  return (
    <ul className="timeline small mb-0">
      {[...agent.teamHistory].reverse().map((h, i) => (
        <li key={i} className={h.to ? '' : 'done'}>
          <div className="fw-medium">{teams.find((t) => t.id === h.teamId)?.name || h.teamId}{!h.to && <span className="status-badge sb-green ms-2">Current</span>}</div>
          <small className="text-muted">{fmtDate(h.from)} – {h.to ? fmtDate(h.to) : 'present'} · {h.reason}</small>
        </li>
      ))}
    </ul>
  );
}

export default function Profile() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const agent = user.agent;
  const team = state.teams.find((t) => t.id === agent.teamId);
  const lead = state.agents.find((a) => a.id === team?.leadId);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState('personal');
  const fileRef = useRef(null);

  const start = () => { setForm({ email: agent.email, phone: agent.phone, lineId: agent.lineId || '', address: agent.address, photo: agent.photo }); setErrors({}); setEdit(true); };
  const save = () => {
    const e = {};
    if (!isEmail(form.email)) e.email = 'Enter a valid email.';
    if (!isPhone(form.phone)) e.phone = 'Enter a valid phone number.';
    if (form.address.trim().length < 10) e.address = 'Enter your full address.';
    setErrors(e);
    if (Object.keys(e).length) return;
    mutate((d) => {
      const a = d.agents.find((x) => x.id === agent.id);
      const changed = ['email', 'phone', 'lineId', 'address'].filter((k) => a[k] !== form[k]);
      Object.assign(a, { email: form.email.trim(), phone: form.phone.trim(), lineId: form.lineId.trim(), address: form.address.trim(), photo: form.photo });
      a.activity.unshift({ at: new Date().toISOString(), text: `Profile updated${changed.length ? ` (${changed.join(', ')})` : ''}` });
      logAction(d, user, 'Updated personal profile', agent.id);
    });
    setEdit(false);
    toast('Your profile has been updated.');
  };
  const pickPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1_500_000) { toast('Please choose an image smaller than 1.5 MB.', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((x) => ({ ...x, photo: reader.result }));
    reader.readAsDataURL(f);
  };

  const left = daysUntil(agent.membershipExpiry);
  const v = edit ? form : agent;

  return (
    <>
      <PageHeader title="My Profile" subtitle="View and update your personal and contact information." crumbs={[{ label: 'My Account' }, { label: 'Profile' }]}
        actions={edit ? <>
          <button className="btn btn-light" onClick={() => setEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}><i className="bi bi-check-lg me-1" />Save Changes</button>
        </> : <button className="btn btn-primary" onClick={start}><i className="bi bi-pencil me-1" />Edit Profile</button>} />

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card mb-3"><div className="card-body text-center">
            <div className="position-relative d-inline-block">
              <Avatar name={fullName(agent)} color={agent.avatarColor} photo={v.photo} size={104} />
              {edit && <button className="btn btn-sm btn-primary rounded-circle position-absolute bottom-0 end-0" style={{ width: 34, height: 34 }} onClick={() => fileRef.current?.click()} aria-label="Change profile image"><i className="bi bi-camera" /></button>}
              <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={pickPhoto} />
            </div>
            {edit && v.photo && <div><button className="btn btn-link btn-sm text-danger" onClick={() => setForm({ ...form, photo: null })}>Remove photo</button></div>}
            <h2 className="h5 mt-3 mb-0">{fullName(agent)}</h2>
            <div className="text-muted small">{agent.id}{agent.migrated ? ` · migrated from ${agent.legacyId}` : ''}</div>
            <div className="mt-2 d-flex justify-content-center gap-2"><StatusBadge status={agent.status} />{user.ledTeam && <span className="status-badge sb-purple">Team Lead</span>}</div>
          </div></div>
          <div className="card">
            <div className="card-header">Membership</div>
            <div className="card-body">
              <dl className="d-grid gap-2 mb-0">
                <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Status</dt><dd className="mb-0"><StatusBadge status={agent.status} /></dd></div>
                <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Start date</dt><dd className="mb-0">{fmtDate(agent.membershipStart)}</dd></div>
                <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Expiry date</dt><dd className="mb-0">{fmtDate(agent.membershipExpiry)}</dd></div>
                <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Days remaining</dt><dd className={`mb-0 fw-semibold ${left < 60 ? 'text-danger' : ''}`}>{left > 0 ? left : 'Expired'}</dd></div>
                <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Team</dt><dd className="mb-0">{team?.name || 'Pending onboarding'}</dd></div>
                <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Team lead</dt><dd className="mb-0">{lead ? fullName(lead) : '—'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body pb-0"><Tabs active={tab} onChange={setTab} tabs={[{ key: 'personal', label: 'Personal & contact' }, { key: 'professional', label: 'Professional' }, { key: 'history', label: 'Team history' }, { key: 'activity', label: 'Activity' }]} /></div>
            <div className="card-body pt-0">
              {tab === 'personal' && (edit ? (
                <div className="row g-3">
                  <div className="col-md-6"><label className="form-label required" htmlFor="p-em">Email</label><input id="p-em" className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />{errors.email && <div className="invalid-feedback">{errors.email}</div>}</div>
                  <div className="col-md-6"><label className="form-label required" htmlFor="p-ph">Mobile phone</label><input id="p-ph" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />{errors.phone && <div className="invalid-feedback">{errors.phone}</div>}</div>
                  <div className="col-md-6"><label className="form-label" htmlFor="p-li">LINE ID</label><input id="p-li" className="form-control" value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })} /></div>
                  <div className="col-12"><label className="form-label required" htmlFor="p-ad">Address</label><textarea id="p-ad" rows={2} className={`form-control ${errors.address ? 'is-invalid' : ''}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />{errors.address && <div className="invalid-feedback">{errors.address}</div>}</div>
                  <div className="col-12 small text-muted"><i className="bi bi-lock me-1" />Name, date of birth and nationality can only be changed by an Agent Manager.</div>
                </div>
              ) : (
                <dl className="dl-grid">
                  <div><dt>First name</dt><dd>{agent.firstName}</dd></div>
                  <div><dt>Last name</dt><dd>{agent.lastName}</dd></div>
                  <div><dt>Email</dt><dd>{agent.email}</dd></div>
                  <div><dt>Mobile phone</dt><dd>{agent.phone}</dd></div>
                  <div><dt>LINE ID</dt><dd>{agent.lineId || '—'}</dd></div>
                  <div><dt>Date of birth</dt><dd>{fmtDate(agent.dob)}</dd></div>
                  <div><dt>Nationality</dt><dd>{agent.nationality}</dd></div>
                  <div style={{ gridColumn: '1 / -1' }}><dt>Address</dt><dd>{agent.address}</dd></div>
                </dl>
              ))}
              {tab === 'professional' && (
                <dl className="dl-grid">
                  <div><dt>Occupation</dt><dd>{agent.occupation}</dd></div>
                  <div><dt>License number</dt><dd>{agent.licenseNo}</dd></div>
                  <div><dt>Registered</dt><dd>{fmtDate(agent.registeredAt)}</dd></div>
                  <div><dt>Onboarded</dt><dd>{fmtDate(agent.onboardedAt)}</dd></div>
                  <div style={{ gridColumn: '1 / -1' }}><dt>Experience</dt><dd>{agent.experience}</dd></div>
                  <div style={{ gridColumn: '1 / -1' }}><dt>Qualifications</dt><dd>{agent.qualifications}</dd></div>
                </dl>
              )}
              {tab === 'history' && <TeamHistory agent={agent} teams={state.teams} />}
              {tab === 'activity' && <ul className="timeline small mb-0">{agent.activity.map((a, i) => <li key={i} className="done"><div>{a.text}</div><small className="text-muted">{fmtDateTime(a.at)}</small></li>)}</ul>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
