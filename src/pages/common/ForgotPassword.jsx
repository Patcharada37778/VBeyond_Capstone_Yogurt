import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell, { BackToLogin } from '../../components/layout/AuthShell';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { isEmail } from '../../utils/format';

export function PasswordFields({ pw, setPw, pw2, setPw2, errors }) {
  const checks = [
    { ok: pw.length >= 8, label: 'At least 8 characters' },
    { ok: /[A-Z]/.test(pw) && /[a-z]/.test(pw), label: 'Upper and lower case letters' },
    { ok: /\d/.test(pw), label: 'At least one number' },
  ];
  return (
    <>
      <div className="mb-3">
        <label className="form-label required" htmlFor="npw">New password</label>
        <input id="npw" type="password" className={`form-control ${errors.pw ? 'is-invalid' : ''}`} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <ul className="list-unstyled small mt-2 mb-0">
          {checks.map((c) => <li key={c.label} className={c.ok ? 'text-green' : 'text-muted'}><i className={`bi ${c.ok ? 'bi-check-circle-fill' : 'bi-circle'} me-1`} />{c.label}</li>)}
        </ul>
        {errors.pw && <div className="invalid-feedback d-block">{errors.pw}</div>}
      </div>
      <div className="mb-3">
        <label className="form-label required" htmlFor="npw2">Confirm new password</label>
        <input id="npw2" type="password" className={`form-control ${errors.pw2 ? 'is-invalid' : ''}`} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        {errors.pw2 && <div className="invalid-feedback">{errors.pw2}</div>}
      </div>
    </>
  );
}

export const passwordErrors = (pw, pw2) => {
  const e = {};
  if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/\d/.test(pw)) e.pw = 'Password does not meet all requirements.';
  if (pw !== pw2) e.pw2 = 'Passwords do not match.';
  return e;
};

export default function ForgotPassword() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(user?.email || '');
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errors, setErrors] = useState({});

  const known = (em) => state.agents.some((a) => a.email.toLowerCase() === em) || state.admins.some((a) => a.email.toLowerCase() === em) || state.applications.some((a) => a.userKey === em);

  const send = (e) => {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!isEmail(em)) return setErrors({ email: 'Enter a valid email address.' });
    if (!known(em)) return setErrors({ email: 'We could not find an account with this email.' });
    const c = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(c); setErrors({}); setStep(2);
    toast(`Recovery email sent to ${em}. Demo verification code: ${c}`, 'info', 'Simulated email');
  };
  const verify = (e) => {
    e.preventDefault();
    if (code.trim() !== sentCode) return setErrors({ code: 'The code is incorrect. Check the simulated email notification.' });
    setErrors({}); setStep(3);
  };
  const reset = (e) => {
    e.preventDefault();
    const errs = passwordErrors(pw, pw2);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    mutate((d) => { d.accounts[email.trim().toLowerCase()] = { passwordSetAt: new Date().toISOString() }; });
    setStep(4);
  };

  return (
    <AuthShell title="Account recovery" subtitle="Reset your password securely with a verification code sent to your registered email.">
      <BackToLogin />
      <h2 className="mt-3 mb-1">Forgot password</h2>
      <div className="stepper my-3">
        {['Email', 'Verify', 'New password'].map((s, i) => (
          <div key={s} className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`} style={{ minWidth: 100 }}><span className="num">{step > i + 1 ? <i className="bi bi-check" /> : i + 1}</span>{s}</div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={send} noValidate>
          <p className="text-muted">Enter the email registered with your VBEYOND account. We'll send a recovery link and code.</p>
          <label className="form-label required" htmlFor="rem">Registered email</label>
          <input id="rem" className={`form-control form-control-lg ${errors.email ? 'is-invalid' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="somchai.pra@vbeyond-agent.co.th" />
          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          <button className="btn btn-primary btn-lg w-100 mt-3">Send Recovery Link</button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={verify} noValidate>
          <div className="alert alert-brand small"><i className="bi bi-envelope-check me-2" />A recovery email was sent to <strong>{email}</strong>. Enter the 6-digit code from the email.</div>
          <label className="form-label required" htmlFor="code">Verification code</label>
          <input id="code" inputMode="numeric" maxLength={6} className={`form-control form-control-lg text-center fs-4 ${errors.code ? 'is-invalid' : ''}`} style={{ letterSpacing: '0.4em' }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          {errors.code && <div className="invalid-feedback">{errors.code}</div>}
          <div className="small text-muted mt-2">Demo code: <strong>{sentCode}</strong> · <button type="button" className="btn btn-link btn-sm p-0" onClick={send}>Resend</button></div>
          <button className="btn btn-primary btn-lg w-100 mt-3">Verify code</button>
        </form>
      )}
      {step === 3 && (
        <form onSubmit={reset} noValidate>
          <PasswordFields pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} errors={errors} />
          <button className="btn btn-primary btn-lg w-100">Set new password</button>
        </form>
      )}
      {step === 4 && (
        <div className="text-center py-3">
          <div className="display-5 text-green mb-2"><i className="bi bi-shield-check" /></div>
          <h3 className="h5">Password reset successful</h3>
          <p className="text-muted">Your password has been updated. You can now sign in with your new password.</p>
          <Link to="/login" className="btn btn-primary w-100">Go to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}
