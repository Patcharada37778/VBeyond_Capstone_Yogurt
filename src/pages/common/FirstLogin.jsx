import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell, { BackToLogin } from '../../components/layout/AuthShell';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PasswordFields, passwordErrors } from './ForgotPassword';
import { fullName } from '../../utils/format';

export function Steps({ steps, step }) {
  return (
    <div className="stepper my-3">
      {steps.map((s, i) => (
        <div key={s} className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`} style={{ minWidth: 90, padding: '0.5rem 0.6rem', fontSize: '0.78rem' }}>
          <span className="num">{step > i + 1 ? <i className="bi bi-check" /> : i + 1}</span>{s}
        </div>
      ))}
    </div>
  );
}

export default function FirstLogin() {
  const { state, mutate, signIn, user } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const presetApp = state.applications.find((a) => a.id === params.get('app')) || (user?.application?.status === 'Approved' ? user.application : null);
  const [ref, setRef] = useState(presetApp?.id || '');
  const [email, setEmail] = useState(presetApp?.personal.email || '');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errors, setErrors] = useState({});
  const [agentId, setAgentId] = useState(null);

  const agent = state.agents.find((a) => a.id === agentId);

  const identify = (e) => {
    e.preventDefault();
    const app = state.applications.find((a) => a.id.toLowerCase() === ref.trim().toLowerCase() && a.userKey === email.trim().toLowerCase());
    if (!app) return setErrors({ ref: 'No application matches this reference number and email.' });
    if (app.status !== 'Approved') return setErrors({ ref: `This application is "${app.status}". First login is available after approval.` });
    const ag = state.agents.find((a) => a.id === app.agentId);
    if (ag?.activated) return setErrors({ ref: 'This account is already activated. Please sign in normally.' });
    const c = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(c); setAgentId(app.agentId); setErrors({}); setStep(2);
    toast(`Activation code sent to ${app.personal.email}. Demo code: ${c}`, 'info', 'Simulated email');
  };
  const verify = (e) => { e.preventDefault(); if (code !== sentCode) return setErrors({ code: 'Incorrect code.' }); setErrors({}); setStep(3); };
  const setPassword = (e) => {
    e.preventDefault();
    const errs = passwordErrors(pw, pw2); setErrors(errs);
    if (Object.keys(errs).length) return;
    mutate((d) => {
      const a = d.agents.find((x) => x.id === agentId);
      a.activated = true;
      a.activity.unshift({ at: new Date().toISOString(), text: 'Account activated — first login completed' });
      d.accounts[a.email.toLowerCase()] = { passwordSetAt: new Date().toISOString() };
      notify(d, `agent:${a.id}`, { category: 'Registration approval', title: 'Welcome to VBEYOND!', body: a.teamId ? 'Your account is active.' : 'Your account is active. An Agent Manager will assign you to a team shortly.', link: '/dashboard' });
      logAction(d, { name: fullName(a), role: 'agent' }, 'Activated agent account (first login)', a.id);
    });
    setStep(4);
  };

  return (
    <AuthShell title="Welcome to VBEYOND" subtitle="Your registration has been approved. Activate your agent account to get started.">
      <BackToLogin />
      <h2 className="mt-3 mb-1">Activate your agent account</h2>
      <Steps steps={['Find application', 'Verify', 'Password', 'Welcome']} step={step} />
      {step === 1 && (
        <form onSubmit={identify} noValidate>
          {presetApp && <div className="alert alert-success small"><i className="bi bi-patch-check-fill me-2" />Application <strong>{presetApp.id}</strong> was approved. Agent ID <strong>{presetApp.agentId}</strong> is ready.</div>}
          <div className="mb-3">
            <label className="form-label required" htmlFor="ref">Application reference number</label>
            <input id="ref" className={`form-control ${errors.ref ? 'is-invalid' : ''}`} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="APP-2026-0142" />
            {errors.ref && <div className="invalid-feedback">{errors.ref}</div>}
          </div>
          <div className="mb-3">
            <label className="form-label required" htmlFor="em">Registered email</label>
            <input id="em" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-lg w-100">Continue</button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={verify} noValidate>
          <p className="text-muted small">We sent a 6-digit activation code to {email}.</p>
          <input aria-label="Activation code" inputMode="numeric" maxLength={6} className={`form-control form-control-lg text-center fs-4 ${errors.code ? 'is-invalid' : ''}`} style={{ letterSpacing: '0.4em' }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          {errors.code && <div className="invalid-feedback">{errors.code}</div>}
          <div className="small text-muted mt-2">Demo code: <strong>{sentCode}</strong></div>
          <button className="btn btn-primary btn-lg w-100 mt-3">Verify</button>
        </form>
      )}
      {step === 3 && (
        <form onSubmit={setPassword} noValidate>
          <p className="text-muted small">Create the password you'll use to sign in to ARMS.</p>
          <PasswordFields pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} errors={errors} />
          <button className="btn btn-primary btn-lg w-100">Activate account</button>
        </form>
      )}
      {step === 4 && agent && (
        <div className="text-center py-2">
          <div className="display-5 text-green mb-2"><i className="bi bi-stars" /></div>
          <h3 className="h4">Welcome aboard, {agent.firstName}!</h3>
          <p className="text-muted">Your VBEYOND agent account is now active.</p>
          <div className="card text-start mb-3"><div className="card-body">
            <dl className="dl-grid mb-0">
              <div><dt>Agent ID</dt><dd>{agent.id}</dd></div>
              <div><dt>Team</dt><dd>{state.teams.find((t) => t.id === agent.teamId)?.name || 'Pending onboarding'}</dd></div>
            </dl>
          </div></div>
          <button className="btn btn-primary btn-lg w-100" onClick={() => { signIn({ agentId: agent.id }); navigate('/dashboard'); }}>Go to my dashboard</button>
        </div>
      )}
    </AuthShell>
  );
}
