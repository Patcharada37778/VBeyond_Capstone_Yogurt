import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell, { BackToLogin } from '../../components/layout/AuthShell';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PasswordFields, passwordErrors } from './ForgotPassword';
import { fmtDate, fullName, isPhone } from '../../utils/format';

function Steps({ steps, step }) {
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

export default function MigratedLogin() {
  const { state, mutate, signIn } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [ident, setIdent] = useState('');
  const [agentId, setAgentId] = useState(null);
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [info, setInfo] = useState({ phone: '', address: '' });
  const [terms, setTerms] = useState({ t1: false, t2: false });
  const [errors, setErrors] = useState({});
  const agent = state.agents.find((a) => a.id === agentId);
  const team = state.teams.find((t) => t.id === agent?.teamId);

  const find = (e) => {
    e.preventDefault();
    const v = ident.trim().toLowerCase();
    const a = state.agents.find((x) => x.migrated && (x.email.toLowerCase() === v || x.legacyId.toLowerCase() === v));
    if (!a) {
      const other = state.agents.find((x) => x.email.toLowerCase() === v);
      return setErrors({ ident: other ? 'This account was not migrated from the legacy system. Please sign in normally.' : 'We could not find a migrated account. Check your email or legacy agent ID (e.g. LG-20417).' });
    }
    if (a.activated) return setErrors({ ident: 'This migrated account has already completed first sign-in. Please sign in normally.' });
    const c = String(Math.floor(100000 + Math.random() * 900000));
    setAgentId(a.id); setSentCode(c); setInfo({ phone: a.phone, address: a.address }); setErrors({}); setStep(2);
    toast(`Verification code sent to ${a.email} and ${a.phone}. Demo code: ${c}`, 'info', 'Simulated email & SMS');
  };
  const verify = (e) => { e.preventDefault(); if (code !== sentCode) return setErrors({ code: 'Incorrect code.' }); setErrors({}); setStep(3); };
  const savePw = (e) => { e.preventDefault(); const errs = passwordErrors(pw, pw2); setErrors(errs); if (!Object.keys(errs).length) setStep(4); };
  const confirmInfo = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isPhone(info.phone)) errs.phone = 'Enter a valid phone number.';
    if (info.address.trim().length < 10) errs.address = 'Enter your full address.';
    setErrors(errs);
    if (!Object.keys(errs).length) setStep(5);
  };
  const finish = (e) => {
    e.preventDefault();
    if (!terms.t1 || !terms.t2) return setErrors({ terms: 'You must accept both to continue.' });
    mutate((d) => {
      const a = d.agents.find((x) => x.id === agentId);
      a.activated = true; a.phone = info.phone; a.address = info.address;
      a.activity.unshift({ at: new Date().toISOString(), text: 'Migrated account: first sign-in completed, personal information confirmed and updated terms accepted' });
      d.accounts[a.email.toLowerCase()] = { passwordSetAt: new Date().toISOString() };
      notify(d, `agent:${a.id}`, { category: 'Registration approval', title: 'Your account was migrated successfully', body: 'Your legacy agent record, team and membership have been carried over to ARMS.', link: '/profile' });
      logAction(d, { name: fullName(a), role: 'agent' }, 'Completed migrated-agent first sign-in', `${a.id} (${a.legacyId})`);
    });
    setErrors({}); setStep(6);
  };

  return (
    <AuthShell title="Welcome to the new ARMS portal" subtitle="Existing VBEYOND agents from the legacy system can activate their migrated account here — no new registration needed.">
      <BackToLogin />
      <h2 className="mt-3 mb-1">First sign-in for migrated agents</h2>
      <Steps steps={['Find', 'Verify', 'Password', 'Confirm info', 'Terms']} step={Math.min(step, 5)} />

      {step === 1 && (
        <form onSubmit={find} noValidate>
          <label className="form-label required" htmlFor="ident">Registered email or legacy agent ID</label>
          <input id="ident" className={`form-control form-control-lg ${errors.ident ? 'is-invalid' : ''}`} value={ident} onChange={(e) => setIdent(e.target.value)} placeholder="LG-20417" />
          {errors.ident && <div className="invalid-feedback">{errors.ident}</div>}
          <div className="form-text">Demo accounts: <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setIdent('LG-20417')}>LG-20417</button> or <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setIdent('yupin.c@vbeyond-agent.co.th')}>yupin.c@vbeyond-agent.co.th</button></div>
          <button className="btn btn-primary btn-lg w-100 mt-3">Find my account</button>
        </form>
      )}
      {step === 2 && agent && (
        <form onSubmit={verify} noValidate>
          <div className="alert alert-brand small"><i className="bi bi-person-check me-2" />We found your migrated account: <strong>{fullName(agent)}</strong> ({agent.legacyId} → {agent.id}).</div>
          <label className="form-label required" htmlFor="mcode">Verification code</label>
          <input id="mcode" inputMode="numeric" maxLength={6} className={`form-control form-control-lg text-center fs-4 ${errors.code ? 'is-invalid' : ''}`} style={{ letterSpacing: '0.4em' }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          {errors.code && <div className="invalid-feedback">{errors.code}</div>}
          <div className="small text-muted mt-2">Demo code: <strong>{sentCode}</strong></div>
          <button className="btn btn-primary btn-lg w-100 mt-3">Verify</button>
        </form>
      )}
      {step === 3 && (
        <form onSubmit={savePw} noValidate>
          <p className="text-muted small">Your legacy password cannot be carried over. Create a new password.</p>
          <PasswordFields pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} errors={errors} />
          <button className="btn btn-primary btn-lg w-100">Continue</button>
        </form>
      )}
      {step === 4 && agent && (
        <form onSubmit={confirmInfo} noValidate>
          <p className="text-muted small">Please confirm the information migrated from the legacy system.</p>
          <div className="card mb-3"><div className="card-body">
            <dl className="dl-grid mb-0">
              <div><dt>Name</dt><dd>{fullName(agent)}</dd></div>
              <div><dt>Agent ID</dt><dd>{agent.id}</dd></div>
              <div><dt>Email</dt><dd>{agent.email}</dd></div>
              <div><dt>Team</dt><dd>{team?.name || '—'}</dd></div>
              <div><dt>Membership valid until</dt><dd>{fmtDate(agent.membershipExpiry)}</dd></div>
              <div><dt>License no.</dt><dd>{agent.licenseNo}</dd></div>
            </dl>
          </div></div>
          <div className="mb-3">
            <label className="form-label required" htmlFor="mph">Mobile phone</label>
            <input id="mph" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
            {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
          </div>
          <div className="mb-3">
            <label className="form-label required" htmlFor="madd">Address</label>
            <textarea id="madd" rows={2} className={`form-control ${errors.address ? 'is-invalid' : ''}`} value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} />
            {errors.address && <div className="invalid-feedback">{errors.address}</div>}
          </div>
          <button className="btn btn-primary btn-lg w-100">Information is correct</button>
        </form>
      )}
      {step === 5 && (
        <form onSubmit={finish} noValidate>
          <div className="border rounded p-3 small mb-3" style={{ maxHeight: 160, overflowY: 'auto' }}>
            <strong>Updated Agent Terms (ARMS edition)</strong>
            <p className="mb-1 mt-2">1. Agents must keep their contact information and license details current in ARMS.</p>
            <p className="mb-1">2. Customer personal data must be handled according to the PDPA and VBEYOND data policy.</p>
            <p className="mb-1">3. Membership renewal is required annually through ARMS.</p>
            <p className="mb-0">4. Advertising of VBEYOND projects must use approved materials only.</p>
          </div>
          <div className="form-check mb-2"><input id="t1" className="form-check-input" type="checkbox" checked={terms.t1} onChange={(e) => setTerms({ ...terms, t1: e.target.checked })} /><label className="form-check-label" htmlFor="t1">I accept the updated Agent Terms</label></div>
          <div className="form-check mb-2"><input id="t2" className="form-check-input" type="checkbox" checked={terms.t2} onChange={(e) => setTerms({ ...terms, t2: e.target.checked })} /><label className="form-check-label" htmlFor="t2">I consent to the updated privacy notice (PDPA)</label></div>
          {errors.terms && <div className="text-danger small mb-2">{errors.terms}</div>}
          <button className="btn btn-primary btn-lg w-100">Complete first sign-in</button>
        </form>
      )}
      {step === 6 && agent && (
        <div className="text-center py-2">
          <div className="display-5 text-green mb-2"><i className="bi bi-cloud-check" /></div>
          <h3 className="h4">Your account has been migrated successfully</h3>
          <p className="text-muted">Welcome to the new ARMS portal, {agent.firstName}. Your team ({team?.name}), membership and history were carried over from the legacy system.</p>
          <button className="btn btn-primary btn-lg w-100" onClick={() => { signIn({ agentId: agent.id }); navigate('/dashboard'); }}>Go to Home</button>
        </div>
      )}
    </AuthShell>
  );
}
