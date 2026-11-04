import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { FilePicker, PageHeader } from '../../components/common';
import { fmtDate, isEmail, isPhone } from '../../utils/format';

export const DOC_SLOTS = [
  { key: 'id', type: 'Identification document', required: true, hint: 'National ID card or passport + work permit' },
  { key: 'cert', type: 'Professional certificate', required: false, hint: 'Real estate broker certificate or relevant course (if any)' },
  { key: 'bank', type: 'Bank book', required: true, hint: 'First page of your bank book for commission payments' },
  { key: 'other', type: 'Other supporting document', required: false, hint: 'e.g. house registration, résumé' },
];

const STEPS = ['Personal information', 'Professional information', 'Documents', 'Review & submit'];

// Public invitation link: /join?invite=INV-xxxx
function JoinInvite() {
  const { state, mutate, signIn } = useStore();
  const [params] = useSearchParams();
  const inv = state.invitations.find((i) => i.id === params.get('invite'));
  useEffect(() => {
    if (!inv || !['Pending', 'Accepted', 'Registration In Progress'].includes(inv.status)) return;
    if (inv.status === 'Pending') {
      mutate((d) => {
        const x = d.invitations.find((i) => i.id === inv.id);
        x.status = 'Accepted';
        notify(d, `agent:${x.invitedBy}`, { category: 'Team invitations', title: `${x.name} accepted your invitation`, body: 'They have opened the registration form.', link: '/team/invitations' });
      });
    }
    signIn({ applicantKey: inv.email.toLowerCase(), name: inv.name });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!inv) return <Navigate to="/login" replace />;
  if (!['Pending', 'Accepted', 'Registration In Progress'].includes(inv.status)) {
    return <div className="container py-5 text-center"><h1 className="h4">This invitation is {inv.status.toLowerCase()}</h1><Link to="/login">Go to sign in</Link></div>;
  }
  if (state.session?.applicantKey !== inv.email.toLowerCase()) return <div className="p-5 text-center text-muted">Opening your invitation…</div>;
  return <Navigate to={`/register?invite=${inv.id}`} replace />;
}

export default function Register({ publicMode }) {
  if (publicMode) return <JoinInvite />;
  return <RegisterWizard />;
}

function RegisterWizard() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invite = state.invitations.find((i) => i.id === params.get('invite')) || state.invitations.find((i) => i.email.toLowerCase() === user.email && ['Pending', 'Accepted', 'Registration In Progress'].includes(i.status));
  const invitedTeam = state.teams.find((t) => t.id === invite?.teamId);
  const inviter = state.agents.find((a) => a.id === invite?.invitedBy);
  const draftKey = `arms-reg-draft-v2-${user.email}`;
  const [nameFirst, ...nameRest] = (invite?.name || user.name || '').split(' ');

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [agree, setAgree] = useState(true);
  const [form, setForm] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(draftKey)); if (saved) return saved; } catch { /* no draft */ }
    return {
      // Demo: every field is pre-filled so the registration can be submitted in a few clicks.
      firstName: nameFirst || 'Nutnicha', lastName: nameRest.join(' ') || 'Rungroj', email: user.email, phone: invite?.phone || '089-456-7123', dob: '1996-04-12', nationality: 'Thai',
      address: '88/5 Sukhumvit Soi 50, Phra Khanong, Khlong Toei, Bangkok 10260',
      experience: '3 years selling condominiums with a residential brokerage in Bangkok', occupation: 'Property Sales Executive',
      qualifications: 'Bachelor of Business Administration (Marketing), Chulalongkorn University; Real Estate Agent Course (TREBA)',
      referrer: inviter ? `${inviter.firstName} ${inviter.lastName} (${inviter.id})` : '',
      docs: {
        id: { fileName: 'national_id_card.pdf', size: 412000 },
        cert: { fileName: 'treba_agent_course_certificate.pdf', size: 655000 },
        bank: { fileName: 'bank_book_first_page.jpg', size: 298000 },
        other: { fileName: 'house_registration.pdf', size: 371000 },
      },
    };
  });

  useEffect(() => { try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* ignore */ } }, [form, draftKey]);
  useEffect(() => {
    if (invite && ['Pending', 'Accepted'].includes(invite.status) && !user.application) {
      mutate((d) => {
        const x = d.invitations.find((i) => i.id === invite.id);
        x.status = 'Registration In Progress';
        notify(d, `agent:${x.invitedBy}`, { category: 'Team invitations', title: `${x.name} started registration`, body: `Invitation ${x.id} is now Registration In Progress.`, link: '/team/invitations' });
      });
    }
  }, [invite, mutate]);

  if (user.application && !['Rejected'].includes(user.application.status)) {
    return (
      <>
        <PageHeader title="Agent Registration" crumbs={[{ label: 'Agent Registration' }]} />
        <div className="card"><div className="card-body text-center py-5">
          <i className="bi bi-file-earmark-check display-5 text-green" />
          <h2 className="h5 mt-2">You've already submitted an application</h2>
          <p className="text-muted">Reference <strong>{user.application.id}</strong> · submitted {fmtDate(user.application.submittedAt)}</p>
          <Link to="/my-application" className="btn btn-primary">Track my application</Link>
        </div></div>
      </>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.firstName.trim()) e.firstName = 'First name is required.';
      if (!form.lastName.trim()) e.lastName = 'Last name is required.';
      if (!isEmail(form.email)) e.email = 'Enter a valid email.';
      if (!isPhone(form.phone)) e.phone = 'Enter a valid phone number (e.g. 081-234-5678).';
      if (!form.dob) e.dob = 'Date of birth is required.';
      else if ((Date.now() - new Date(form.dob)) / 31557600000 < 20) e.dob = 'You must be at least 20 years old.';
      if (form.address.trim().length < 10) e.address = 'Enter your full address.';
    }
    if (s === 2) {
      if (!form.experience.trim()) e.experience = 'Describe your previous experience (or "None").';
      if (!form.occupation.trim()) e.occupation = 'Current occupation is required.';
    }
    if (s === 3) DOC_SLOTS.filter((d) => d.required).forEach((d) => { if (!form.docs[d.key]) e[`doc_${d.key}`] = `${d.type} is required.`; });
    setErrors(e);
    return !Object.keys(e).length;
  };
  const next = () => { if (validate(step)) setStep(step + 1); };
  const goto = (s) => { setErrors({}); setStep(s); };

  const submit = () => {
    if (![1, 2, 3].every((s) => validate(s))) { toast('Some information is missing. Please check each step.', 'warning'); return; }
    if (!agree) { setErrors({ agree: 'You must agree to the terms and conditions.' }); return; }
    const id = `APP-${new Date().getFullYear()}-${String(state.counters.app).padStart(4, '0')}`;
    const now = new Date().toISOString();
    mutate((d) => {
      d.counters.app++;
      d.applications.unshift({
        id, userKey: user.email,
        personal: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim(), dob: form.dob, nationality: form.nationality, address: form.address.trim() },
        professional: { experience: form.experience.trim(), occupation: form.occupation.trim(), qualifications: form.qualifications.trim(), referrer: form.referrer.trim() },
        documents: DOC_SLOTS.filter((s) => form.docs[s.key]).map((s, i) => ({ id: `D${i + 1}`, type: s.type, fileName: form.docs[s.key].fileName, size: form.docs[s.key].size, uploadedAt: now, status: 'Pending', comment: '', history: [{ at: now, text: `Uploaded ${form.docs[s.key].fileName}` }] })),
        status: 'Pending Review', submittedAt: now, reviewer: null, invitationId: invite?.id || null, preferredTeamId: invite?.teamId || null,
        clarifications: [], agentId: null, decisionNote: '', timeline: [{ at: now, text: 'Application submitted', by: `${form.firstName} ${form.lastName}` }],
      });
      if (invite) {
        const inv = d.invitations.find((i) => i.id === invite.id);
        inv.status = 'Registration In Progress'; inv.applicationId = id;
        notify(d, `agent:${inv.invitedBy}`, { category: 'Team invitations', title: `${form.firstName} ${form.lastName} submitted their registration`, body: `Application ${id} for ${invitedTeam?.name}.`, link: '/team/invitations' });
      }
      notify(d, 'role:agentManager', { category: 'Registration updates', title: `New application: ${form.firstName} ${form.lastName}`, body: `${id} is waiting for review.`, link: `/applications/${id}` });
      notify(d, `applicant:${user.email}`, { category: 'Registration updates', title: 'Application submitted', body: `Your reference number is ${id}. Status: Pending Review.`, link: '/my-application' });
      logAction(d, { name: `${form.firstName} ${form.lastName}`, role: 'prospect' }, 'Submitted agent application', id);
    });
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    toast(`Application ${id} submitted successfully.`, 'success', 'Registration complete');
    navigate('/my-application?submitted=1');
  };

  const err = (k) => errors[k] && <div className="invalid-feedback d-block">{errors[k]}</div>;
  const cls = (k) => `form-control ${errors[k] ? 'is-invalid' : ''}`;

  return (
    <>
      <PageHeader title="Register to Become an Agent" subtitle="Complete the four steps below. Your progress is saved automatically on this device." crumbs={[{ label: 'Agent Registration' }]} />
      {invite && (
        <div className="alert alert-brand d-flex gap-3 align-items-center">
          <i className="bi bi-envelope-paper-heart fs-3" />
          <div><strong>You were invited to join {invitedTeam?.name}</strong> by {inviter ? `${inviter.firstName} ${inviter.lastName}` : 'a team lead'}.
            <div className="small">Your team is pre-assigned — after approval you'll be onboarded directly to {invitedTeam?.name}.</div></div>
        </div>
      )}
      <div className="stepper mb-3">
        {STEPS.map((s, i) => (
          <button type="button" key={s} className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`} onClick={() => (i + 1 < step ? goto(i + 1) : undefined)} style={{ cursor: i + 1 < step ? 'pointer' : 'default' }}>
            <span className="num">{step > i + 1 ? <i className="bi bi-check" /> : i + 1}</span><span className="text-start">{s}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          {step === 1 && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label required" htmlFor="r-fn">First name</label><input id="r-fn" className={cls('firstName')} value={form.firstName} onChange={set('firstName')} />{err('firstName')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-ln">Last name</label><input id="r-ln" className={cls('lastName')} value={form.lastName} onChange={set('lastName')} />{err('lastName')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-em">Email</label><input id="r-em" className={cls('email')} value={form.email} readOnly /><div className="form-text">Your sign-in email — used for all notifications.</div>{err('email')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-ph">Phone number</label><input id="r-ph" className={cls('phone')} value={form.phone} onChange={set('phone')} placeholder="081-234-5678" />{err('phone')}</div>
              <div className="col-md-4"><label className="form-label required" htmlFor="r-dob">Date of birth</label><input id="r-dob" type="date" className={cls('dob')} value={form.dob} onChange={set('dob')} />{err('dob')}</div>
              <div className="col-md-4"><label className="form-label required" htmlFor="r-nat">Nationality</label>
                <select id="r-nat" className="form-select" value={form.nationality} onChange={set('nationality')}>{['Thai', 'Myanmar', 'Lao', 'Cambodian', 'Chinese', 'Japanese', 'Other'].map((n) => <option key={n}>{n}</option>)}</select></div>
              <div className="col-md-4"><label className="form-label">Preferred team</label><input className="form-control" readOnly value={invitedTeam ? `${invitedTeam.name} (invited)` : 'Assigned after approval'} /></div>
              <div className="col-12"><label className="form-label required" htmlFor="r-ad">Address</label><textarea id="r-ad" rows={2} className={cls('address')} value={form.address} onChange={set('address')} placeholder="House no., road, sub-district, district, province, postcode" />{err('address')}</div>
            </div>
          )}
          {step === 2 && (
            <div className="row g-3">
              <div className="col-12"><label className="form-label required" htmlFor="r-ex">Previous experience</label><textarea id="r-ex" rows={3} className={cls('experience')} value={form.experience} onChange={set('experience')} placeholder="e.g. 2 years selling condominiums with a brokerage" />{err('experience')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-oc">Current occupation</label><input id="r-oc" className={cls('occupation')} value={form.occupation} onChange={set('occupation')} />{err('occupation')}</div>
              <div className="col-md-6"><label className="form-label" htmlFor="r-ref">Referrer (if applicable)</label><input id="r-ref" className="form-control" value={form.referrer} onChange={set('referrer')} placeholder="Name or agent ID of the person who referred you" /></div>
              <div className="col-12"><label className="form-label" htmlFor="r-q">Relevant qualifications</label><textarea id="r-q" rows={2} className="form-control" value={form.qualifications} onChange={set('qualifications')} placeholder="Degrees, licenses, courses" /></div>
            </div>
          )}
          {step === 3 && (
            <div className="row g-3">
              <div className="col-12"><div className="alert alert-light border small mb-0"><i className="bi bi-info-circle me-1" />Files stay in your browser for this prototype — nothing is uploaded to a server.</div></div>
              {DOC_SLOTS.map((s) => (
                <div className="col-md-6" key={s.key}>
                  <FilePicker id={`doc-${s.key}`} label={s.type} required={s.required} current={form.docs[s.key]} error={errors[`doc_${s.key}`]}
                    onSelect={(f) => setForm({ ...form, docs: { ...form.docs, [s.key]: f || undefined } })} />
                  <div className="form-text">{s.hint}</div>
                </div>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="d-grid gap-3">
              {[
                { title: 'Personal information', s: 1, rows: [['Name', `${form.firstName} ${form.lastName}`], ['Email', form.email], ['Phone', form.phone], ['Date of birth', fmtDate(form.dob)], ['Nationality', form.nationality], ['Address', form.address], ['Team', invitedTeam?.name || 'Assigned after approval']] },
                { title: 'Professional information', s: 2, rows: [['Previous experience', form.experience], ['Current occupation', form.occupation], ['Qualifications', form.qualifications || '—'], ['Referrer', form.referrer || '—']] },
                { title: 'Documents', s: 3, rows: DOC_SLOTS.map((d) => [d.type, form.docs[d.key]?.fileName || (d.required ? 'Missing' : 'Not provided')]) },
              ].map((sec) => (
                <div key={sec.title} className="border rounded p-3">
                  <div className="d-flex justify-content-between mb-2"><h3 className="h6 mb-0">{sec.title}</h3><button className="btn btn-sm btn-link p-0" onClick={() => goto(sec.s)}><i className="bi bi-pencil me-1" />Edit</button></div>
                  <dl className="dl-grid mb-0">{sec.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
                </div>
              ))}
              <div className="form-check">
                <input id="agree" type="checkbox" className={`form-check-input ${errors.agree ? 'is-invalid' : ''}`} checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors({}); }} />
                <label className="form-check-label" htmlFor="agree">I confirm the information is accurate and agree to the VBEYOND Agent Terms & Conditions and Privacy Notice (PDPA).</label>
                {errors.agree && <div className="invalid-feedback d-block">{errors.agree}</div>}
              </div>
            </div>
          )}
        </div>
        <div className="card-footer bg-white d-flex justify-content-between">
          <button className="btn btn-light" disabled={step === 1} onClick={() => goto(step - 1)}><i className="bi bi-arrow-left me-1" />Back</button>
          {step < 4 ? <button className="btn btn-primary" onClick={next}>Continue<i className="bi bi-arrow-right ms-1" /></button>
            : <button className="btn btn-success" onClick={submit}><i className="bi bi-send-check me-1" />Submit application</button>}
        </div>
      </div>
    </>
  );
}
