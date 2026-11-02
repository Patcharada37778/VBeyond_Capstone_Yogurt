import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
import { PERSONAS, useStore } from '../../context/StoreContext';
import { Avatar } from '../../components/common';
import { useToast } from '../../context/ToastContext';
import { fullName } from '../../utils/format';

export default function Login() {
  const { state, signIn } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const go = (session) => { signIn(session); navigate(location.state?.from || '/dashboard', { replace: true }); };

  const submit = (e) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em || !password) { setError('Enter your email and password.'); return; }
    const agent = state.agents.find((a) => a.email.toLowerCase() === em || a.legacyId?.toLowerCase() === em);
    const admin = state.admins.find((a) => a.email.toLowerCase() === em);
    const applicant = state.applications.find((a) => a.userKey === em);
    if (agent && !agent.activated) { setError(agent.migrated ? 'This account was migrated from the legacy system. Use "First sign-in for migrated agents" below.' : 'Your account is approved but not activated yet. Use "Approved applicant? Activate account".'); return; }
    if (agent && ['Resigned'].includes(agent.status)) { setError('This agent account is no longer active. Contact your Agent Manager.'); return; }
    if (agent) { toast(`Welcome back, ${agent.firstName}`); return go({ agentId: agent.id }); }
    if (admin) { if (admin.status !== 'Active') { setError('This back-office account is deactivated.'); return; } return go({ adminId: admin.id }); }
    if (applicant) return go({ applicantKey: applicant.userKey, name: fullName(applicant.personal) });
    setError('No account found for this email. New to VBEYOND? Register as an agent below.');
  };

  return (
    <AuthShell>
      <h2 className="mb-1">Sign in</h2>
      <p className="text-muted mb-4">Use your registered email. Any password works in this prototype.</p>
      <form onSubmit={submit} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">Email or legacy agent ID</label>
          <input id="email" className="form-control form-control-lg" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} autoComplete="username" placeholder="name@example.com" />
        </div>
        <div className="mb-2">
          <label className="form-label" htmlFor="pw">Password</label>
          <input id="pw" type="password" className="form-control form-control-lg" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} autoComplete="current-password" />
        </div>
        <div className="d-flex justify-content-end mb-3"><Link to="/forgot-password" className="small">Forgot password?</Link></div>
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg w-100">Sign in</button>
      </form>

      <div className="d-grid gap-2 mt-3">
        <button className="btn btn-outline-primary" onClick={() => go(PERSONAS[0].session)}><i className="bi bi-person-plus me-2" />Register to become an agent</button>
        <div className="d-flex gap-2">
          <Link to="/first-login" className="btn btn-light flex-fill small">Approved applicant? Activate account</Link>
          <Link to="/migrated-login" className="btn btn-light flex-fill small">First sign-in for migrated agents</Link>
        </div>
      </div>

      <div className="mt-4 pt-3 border-top">
        <div className="small-caps mb-2">Quick demo sign-in</div>
        <div className="row g-2">
          {PERSONAS.map((p) => (
            <div className="col-sm-6" key={p.key}>
              <button className="persona-btn" onClick={() => go(p.session)}>
                <Avatar name={p.name} size={32} color={p.color || '#1f4e52'} />
                <span className="lh-sm" style={{ minWidth: 0 }}>
                  <span className="d-block small fw-semibold text-truncate">{p.label}</span>
                  <small className="text-muted">{p.name.split(' ')[0]}</small>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
