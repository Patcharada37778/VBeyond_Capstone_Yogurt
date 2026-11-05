import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { logAction, RENEWAL_REMINDER_DAYS, useStore } from '../../context/StoreContext';
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

  const start = () => { setForm({ email: agent.email, phone: agent.phone, lineId: agent.lineId || '', address: agent.address, photo: agent.photo }); setErrors({}); setTab('personal'); setEdit(true); };
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
    <div className="profile-page">
      <PageHeader title="My Profile" crumbs={[{ label: 'My Account' }, { label: 'Profile' }]}
        actions={!edit && <button className="btn btn-primary" onClick={start}><i className="bi bi-pencil me-1" />Edit Profile</button>} />

      <div className="card profile-summary-card mb-3"><div className="card-body">
        <div className="profile-summary">
          <div className="position-relative profile-avatar-wrap">
            <Avatar name={fullName(agent)} color={agent.avatarColor} photo={v.photo} size={88} />
            {edit && <button type="button" className="btn btn-sm btn-primary rounded-circle position-absolute bottom-0 end-0 profile-photo-button" onClick={() => fileRef.current?.click()} aria-label="Change profile photo" title="Change profile photo"><i className="bi bi-camera" /></button>}
            <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={pickPhoto} />
          </div>
          <div className="profile-summary-details">
            <h2 className="h5 mb-1">{fullName(agent)}</h2>
            <div className="text-muted small">{agent.id}{agent.migrated ? ` · migrated from ${agent.legacyId}` : ''}</div>
            <div className="mt-2 d-flex flex-wrap gap-2"><StatusBadge status={agent.status} />{user.ledTeam && <span className="status-badge sb-purple">Team Lead</span>}</div>
            {edit && <div className="profile-photo-actions">
              <small className="text-muted">Choose an image up to 1.5 MB.</small>
              {v.photo && <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => setForm({ ...form, photo: null })}>Remove photo</button>}
            </div>}
          </div>
        </div>
      </div></div>

      <div className="row g-3 profile-content-row">
        <div className="col-lg-8 d-flex">
          <div className="card profile-info-card w-100">
            <div className="card-header profile-details-header">
              <div>
                <h2 className="h6 mb-0">{!edit && <i className="bi bi-person me-2" aria-hidden="true" />}{edit ? 'Edit personal & contact details' : 'Profile information'}</h2>
                {edit && <p className="small text-muted mb-0 mt-1">Update your contact details and save your changes.</p>}
              </div>
              {edit && <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-light btn-sm" onClick={() => setEdit(false)}>Cancel</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={save}><i className="bi bi-check-lg me-1" />Save</button>
              </div>}
            </div>
            {!edit && <div className="card-body pb-0"><Tabs active={tab} onChange={setTab} tabs={[{ key: 'personal', label: 'Personal & contact' }, { key: 'professional', label: 'Professional' }, { key: 'history', label: 'Team history' }, { key: 'activity', label: 'Activity' }]} /></div>}
            <div className={`card-body ${edit ? '' : 'pt-0'}`}>
              {edit ? (
                <div className="row g-3 profile-form">
                  <div className="col-md-6"><label className="form-label required" htmlFor="p-em">Email</label><input id="p-em" type="email" autoComplete="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} aria-invalid={!!errors.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />{errors.email && <div className="invalid-feedback">{errors.email}</div>}</div>
                  <div className="col-md-6"><label className="form-label required" htmlFor="p-ph">Mobile phone</label><input id="p-ph" type="tel" autoComplete="tel" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} aria-invalid={!!errors.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />{errors.phone && <div className="invalid-feedback">{errors.phone}</div>}</div>
                  <div className="col-md-6"><label className="form-label" htmlFor="p-li">LINE ID</label><input id="p-li" autoComplete="off" className="form-control" value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })} /></div>
                  <div className="col-12"><label className="form-label required" htmlFor="p-ad">Address</label><textarea id="p-ad" rows={3} autoComplete="street-address" className={`form-control ${errors.address ? 'is-invalid' : ''}`} aria-invalid={!!errors.address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />{errors.address && <div className="invalid-feedback">{errors.address}</div>}</div>
                  <div className="col-12 small text-muted"><i className="bi bi-lock me-1" aria-hidden="true" />Name, date of birth and nationality can only be changed by an Agent Manager.</div>
                </div>
              ) : (
                <>
                  {tab === 'personal' && (
                    <dl className="dl-grid">
                      <div><dt>First name</dt><dd>{agent.firstName}</dd></div>
                      <div><dt>Last name</dt><dd>{agent.lastName}</dd></div>
                      <div><dt>Email</dt><dd>{agent.email}</dd></div>
                      <div><dt>Mobile phone</dt><dd>{agent.phone}</dd></div>
                      <div><dt>LINE ID</dt><dd>{agent.lineId || '—'}</dd></div>
                      <div><dt>Date of birth</dt><dd>{fmtDate(agent.dob)}</dd></div>
                      <div><dt>Nationality</dt><dd>{agent.nationality}</dd></div>
                      <div className="profile-full-row"><dt>Address</dt><dd>{agent.address}</dd></div>
                    </dl>
                  )}
                  {tab === 'professional' && (
                    <dl className="dl-grid">
                      <div><dt>Occupation</dt><dd>{agent.occupation}</dd></div>
                      <div><dt>License number</dt><dd>{agent.licenseNo}</dd></div>
                      <div><dt>Registered</dt><dd>{fmtDate(agent.registeredAt)}</dd></div>
                      <div><dt>Onboarded</dt><dd>{fmtDate(agent.onboardedAt)}</dd></div>
                      <div className="profile-full-row"><dt>Experience</dt><dd>{agent.experience}</dd></div>
                      <div className="profile-full-row"><dt>Qualifications</dt><dd>{agent.qualifications}</dd></div>
                    </dl>
                  )}
                  {tab === 'history' && <TeamHistory agent={agent} teams={state.teams} />}
                  {tab === 'activity' && <ul className="timeline small mb-0">{agent.activity.map((a, i) => <li key={i} className="done"><div>{a.text}</div><small className="text-muted">{fmtDateTime(a.at)}</small></li>)}</ul>}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4 d-flex">
          <div className="card profile-membership-card w-100">
            <div className="card-header"><i className="bi bi-card-checklist me-2 text-brand" aria-hidden="true" />Membership & team</div>
            <div className="card-body profile-membership-body">
              <dl className="profile-membership-list mb-0">
                <div><dt>Status</dt><dd><StatusBadge status={agent.status} /></dd></div>
                <div><dt>Start date</dt><dd>{fmtDate(agent.membershipStart)}</dd></div>
                <div><dt>Expiry date</dt><dd>{fmtDate(agent.membershipExpiry)}</dd></div>
                <div className="profile-days-remaining">
                  <dt>Days remaining</dt>
                  <dd className={left < 60 ? 'text-danger fw-semibold' : 'fw-medium'}>{left > 0 ? left : 'Expired'}</dd>
                  {left <= RENEWAL_REMINDER_DAYS && <p className="profile-renewal-reminder">{left > 0 ? 'Your membership will expire soon. Submit a renewal request before the expiry date to avoid interruption.' : 'Your membership has expired. Submit a renewal request to restore your membership.'}</p>}
                </div>
                <div><dt>Team</dt><dd>{team?.name || 'Pending onboarding'}</dd></div>
                <div><dt>Team lead</dt><dd>{lead ? fullName(lead) : '—'}</dd></div>
              </dl>
              <Link to="/renewal" className="btn profile-renewal-button"><i className="bi bi-arrow-repeat me-2" aria-hidden="true" />Membership Renewal</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
