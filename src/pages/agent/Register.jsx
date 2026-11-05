import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
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

function RegistrationInput({ icon, ...inputProps }) {
  return (
    <div className="registration-input">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <input {...inputProps} />
    </div>
  );
}

// Step 1 for new applicants: create an account (also opened from invitation links: /join?team=T-ALP&ref=AG-1001).
// The agent application is submitted later from the dashboard.
function JoinPage() {
  const { state, mutate, signIn } = useStore();
  const toast = useToast();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const team = state.teams.find((t) => t.id === params.get('team'));
  const inviter = state.agents.find((a) => a.id === params.get('ref'));
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim().replace(/\s+/g, ' ');
    if (name.split(' ').length < 2) er.name = 'Enter your first and last name.';
    if (!isEmail(email)) er.email = 'Enter a valid email address.';
    else if (state.agents.some((a) => a.email.toLowerCase() === email) || state.admins.some((a) => a.email.toLowerCase() === email)) er.email = 'This email already belongs to a VBEYOND account. Please sign in instead.';
    else if (state.accounts[email]?.role === 'prospect' || state.applications.some((a) => a.userKey === email)) er.email = 'An account with this email already exists. Please sign in.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) er.password = 'Use at least 8 characters with letters and numbers.';
    if (form.confirm !== form.password) er.confirm = 'Passwords do not match.';
    setErrors(er);
    if (Object.keys(er).length) return;
    const invite = { inviteTeam: team?.id || null, inviteRef: inviter?.id || null };
    mutate((d) => { d.accounts[email] = { role: 'prospect', name, ...invite, createdAt: new Date().toISOString(), passwordSetAt: new Date().toISOString() }; });
    signIn({ applicantKey: email, name, ...invite });
    toast('Your account is ready. You can apply to become an agent whenever you like.', 'success', 'Account created');
    navigate('/dashboard', { replace: true });
  };

  const field = (k, label, icon, type, placeholder, autoComplete) => (
    <div>
      <label className="form-label required" htmlFor={`jn-${k}`}>{label}</label>
      <RegistrationInput icon={icon} id={`jn-${k}`} type={type} autoComplete={autoComplete} className={`form-control form-control-lg ${errors[k] ? 'is-invalid' : ''}`} value={form[k]} onChange={set(k)} placeholder={placeholder} />
      {errors[k] && <div className="invalid-feedback d-block">{errors[k]}</div>}
    </div>
  );

  return (
    <AuthShell title="Join VBEYOND as an agent" subtitle="Create your account first, then apply to become an agent when you're ready.">
      {team ? (
        <div className="alert alert-brand d-flex gap-3 align-items-center">
          <i className="bi bi-envelope-paper-heart fs-3" aria-hidden="true" />
          <div><strong>{inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A VBEYOND agent'} invited you to join {team.name}</strong>
            <div className="small">{team.region}</div></div>
        </div>
      ) : params.has('team') && <div className="alert alert-warning small">This invitation link is not valid. You can still create an account.</div>}
      <h2 className="mb-1">Create an account</h2>
      <p className="text-muted">For new individual applicants. Existing VBEYOND agents should sign in instead.</p>
      <form onSubmit={submit} noValidate className="d-grid gap-3">
        {field('name', 'Full name', 'bi-person', 'text', 'First and last name', 'name')}
        {field('email', 'Email', 'bi-envelope', 'email', 'name@example.com', 'email')}
        {field('password', 'Password', 'bi-lock', 'password', 'At least 8 characters', 'new-password')}
        {field('confirm', 'Confirm password', 'bi-lock', 'password', 'Re-enter your password', 'new-password')}
        <button className="btn btn-primary btn-lg">Create account</button>
        <Link to="/login" className="small text-center">Already have an account? Sign in</Link>
      </form>
    </AuthShell>
  );
}

export default function Register({ publicMode }) {
  if (publicMode) return <JoinPage />;
  return <RegisterWizard />;
}

function RegisterWizard() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Team and referrer come from the invitation link (kept in the session after /join).
  const invitedTeam = state.teams.find((t) => t.id === (params.get('team') || state.session?.inviteTeam));
  const inviter = state.agents.find((a) => a.id === (params.get('ref') || state.session?.inviteRef));
  const draftKey = `arms-reg-draft-v2-${user.email}`;
  const [nameFirst, ...nameRest] = (user.name || '').split(' ');

  const [step, setStep] = useState(1);
  const [stepStatuses, setStepStatuses] = useState({});
  const [errors, setErrors] = useState({});
  const [agree, setAgree] = useState(true);
  const [form, setForm] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(draftKey)); if (saved) return saved; } catch { /* no draft */ }
    return {
      // Demo: every field is pre-filled so the registration can be submitted in a few clicks.
      firstName: nameFirst || 'Nutnicha', lastName: nameRest.join(' ') || 'Rungroj', email: user.email, phone: '089-456-7123', dob: '1996-04-12', nationality: 'Thai',
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

  if (user.application && !['Rejected'].includes(user.application.status)) {
    return (
      <div className="my-application-page">
        <PageHeader title="Agent Registration" crumbs={[{ label: 'Agent Registration' }]} />
        <div className="card application-details-card"><div className="card-body text-center py-5">
          <i className="bi bi-file-earmark-check display-5 text-green" />
          <h2 className="h5 mt-2">You've already submitted an application</h2>
          <p className="text-muted">Reference <strong>{user.application.id}</strong> · submitted {fmtDate(user.application.submittedAt)}</p>
          <Link to="/my-application" className="btn btn-primary">Track my application</Link>
        </div></div>
      </div>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const docsForSlot = (key) => {
    const files = form.docs[key];
    return Array.isArray(files) ? files : files ? [files] : [];
  };
  const getStepErrors = (s) => {
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
    if (s === 3) DOC_SLOTS.filter((d) => d.required).forEach((d) => { if (!docsForSlot(d.key).length) e[`doc_${d.key}`] = `${d.type} is required.`; });
    return e;
  };
  const validate = (s) => {
    const e = getStepErrors(s);
    setErrors(e);
    return !Object.keys(e).length;
  };
  const next = () => {
    if (validate(step)) {
      setStepStatuses((statuses) => ({ ...statuses, [step]: 'completed' }));
      setStep(step + 1);
    }
  };
  const goto = (s) => { setErrors({}); setStep(s); };
  const goToStep = (target) => {
    if (target > step) {
      const statuses = { ...stepStatuses };
      statuses[step] = Object.keys(getStepErrors(step)).length ? 'skipped' : 'completed';
      for (let skippedStep = step + 1; skippedStep < target; skippedStep++) {
        if (!statuses[skippedStep]) statuses[skippedStep] = 'skipped';
      }
      setStepStatuses(statuses);
    }
    setErrors({});
    setStep(target);
  };

  const submit = () => {
    if (![1, 2, 3].every((s) => validate(s))) { toast('Some information is missing. Please check each step.', 'warning'); return; }
    if (!agree) { setErrors({ agree: 'You must agree to the terms and conditions.' }); return; }
    const id = `APP-${new Date().getFullYear()}-${String(state.counters.app).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const documents = DOC_SLOTS.reduce((all, slot) => {
      docsForSlot(slot.key).forEach((file) => {
        all.push({
          id: `D${all.length + 1}`, type: slot.type, fileName: file.fileName, size: file.size,
          uploadedAt: now, status: 'Pending', comment: '',
          history: [{ at: now, text: `Uploaded ${file.fileName}` }],
        });
      });
      return all;
    }, []);
    mutate((d) => {
      d.counters.app++;
      d.applications.unshift({
        id, userKey: user.email,
        personal: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim(), dob: form.dob, nationality: form.nationality, address: form.address.trim() },
        professional: { experience: form.experience.trim(), occupation: form.occupation.trim(), qualifications: form.qualifications.trim(), referrer: form.referrer.trim() },
        documents,
        status: 'Pending Review', submittedAt: now, preferredTeamId: invitedTeam?.id || null, referredBy: inviter?.id || null,
        clarifications: [], agentId: null, decisionNote: '', timeline: [{ at: now, text: 'Application submitted', by: `${form.firstName} ${form.lastName}` }],
      });
      if (inviter) notify(d, `agent:${inviter.id}`, { category: 'Team invitations', title: `${form.firstName} ${form.lastName} registered with your invitation link`, body: `Application ${id}${invitedTeam ? ` for ${invitedTeam.name}` : ''}.`, link: '/dashboard' });
      notify(d, 'role:operationsAdmin', { category: 'Registration updates', title: `New application: ${form.firstName} ${form.lastName}`, body: `${id} is waiting for review.`, link: `/applications/${id}` });
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
    <div className="registration-page">
      <PageHeader title="Register to Become an Agent" subtitle={`Step ${step} of 4`} crumbs={[{ label: 'Agent Registration' }]} />
      {invitedTeam && (
        <div className="alert alert-brand d-flex gap-3 align-items-center">
          <i className="bi bi-envelope-paper-heart fs-3" />
          <div><strong>You were invited to join {invitedTeam?.name}</strong> by {inviter ? `${inviter.firstName} ${inviter.lastName}` : 'a VBEYOND agent'}.
            <div className="small">Your team is pre-assigned — after approval you'll be onboarded directly to {invitedTeam?.name}.</div></div>
        </div>
      )}
      <ol className="stepper mb-3" aria-label="Registration progress">
        {STEPS.map((label, i) => {
          const stepNumber = i + 1;
          const status = stepNumber === step ? 'current' : stepStatuses[stepNumber] || 'upcoming';
          const statusLabel = { current: 'current step', completed: 'completed', skipped: 'skipped, incomplete', upcoming: 'not started' }[status];
          return (
            <li className={`step-item ${status}`} key={label}>
              <button
                type="button"
                className="step"
                onClick={() => goToStep(stepNumber)}
                aria-current={status === 'current' ? 'step' : undefined}
                aria-label={`${label}, ${statusLabel}`}
              >
                <span className="num" aria-hidden="true">
                  {status === 'completed' ? <i className="bi bi-check-lg" /> : status === 'skipped' ? <i className="bi bi-exclamation" /> : stepNumber}
                </span>
                <span className="step-label">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card registration-card">
        <div className="card-body">
          {step === 1 && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label required" htmlFor="r-fn">First name</label><RegistrationInput icon="bi-person" id="r-fn" className={cls('firstName')} value={form.firstName} onChange={set('firstName')} />{err('firstName')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-ln">Last name</label><RegistrationInput icon="bi-person" id="r-ln" className={cls('lastName')} value={form.lastName} onChange={set('lastName')} />{err('lastName')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-em">Email</label><RegistrationInput icon="bi-envelope" id="r-em" className={cls('email')} value={form.email} readOnly /><div className="form-text">Your sign-in email — used for all notifications.</div>{err('email')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-ph">Phone number</label><RegistrationInput icon="bi-telephone" id="r-ph" className={cls('phone')} value={form.phone} onChange={set('phone')} placeholder="081-234-5678" />{err('phone')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-dob">Date of birth</label><input id="r-dob" type="date" className={cls('dob')} value={form.dob} onChange={set('dob')} />{err('dob')}</div>
              <div className="col-md-6"><label className="form-label required" htmlFor="r-nat">Nationality</label>
                <select id="r-nat" className="form-select" value={form.nationality} onChange={set('nationality')}>{['Thai', 'Myanmar', 'Lao', 'Cambodian', 'Chinese', 'Japanese', 'Other'].map((n) => <option key={n}>{n}</option>)}</select></div>
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
                  <FilePicker id={`doc-${s.key}`} label={s.type} required={s.required} current={form.docs[s.key]} multiple description={s.hint} error={errors[`doc_${s.key}`]}
                    onSelect={(f) => setForm({ ...form, docs: { ...form.docs, [s.key]: f || undefined } })} />
                </div>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="review-summary">
              {[
                { title: 'Personal information', s: 1, rows: [['Name', `${form.firstName} ${form.lastName}`], ['Email', form.email], ['Phone', form.phone], ['Date of birth', fmtDate(form.dob)], ['Nationality', form.nationality], ['Address', form.address], ['Team', invitedTeam?.name || 'Assigned after approval']] },
                { title: 'Professional information', s: 2, rows: [['Previous experience', form.experience], ['Current occupation', form.occupation], ['Qualifications', form.qualifications || '—'], ['Referrer', form.referrer || '—']] },
                { title: 'Documents', s: 3, rows: DOC_SLOTS.map((d) => [d.type, docsForSlot(d.key).map((file) => file.fileName).join(', ') || (d.required ? 'Missing' : 'Not provided')]) },
              ].map((sec) => (
                <div key={sec.title} className="review-section">
                  <div className="review-section-header"><h3>{sec.title}</h3><button className="btn btn-sm btn-link p-0" onClick={() => goto(sec.s)}><i className="bi bi-pencil me-1" />Edit</button></div>
                  <dl className="dl-grid review-fields mb-0">{sec.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
                </div>
              ))}
              <div className="form-check review-agreement">
                <input id="agree" type="checkbox" className={`form-check-input ${errors.agree ? 'is-invalid' : ''}`} checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors({}); }} />
                <label className="form-check-label" htmlFor="agree">I confirm the information is accurate and agree to the VBEYOND Agent Terms & Conditions and Privacy Notice (PDPA).</label>
                {errors.agree && <div className="invalid-feedback d-block">{errors.agree}</div>}
              </div>
            </div>
          )}
        </div>
        <div className="card-footer bg-transparent border-0 d-flex justify-content-between">
          {step > 1 && <button className="btn btn-light" onClick={() => goto(step - 1)}><i className="bi bi-arrow-left me-1" />Back</button>}
          {step < 4 ? <button className="btn btn-primary ms-auto" onClick={next}>Continue<i className="bi bi-arrow-right ms-1" /></button>
            : <button className="btn btn-success ms-auto" onClick={submit}><i className="bi bi-send-check me-1" />Submit application</button>}
        </div>
      </div>
    </div>
  );
}
