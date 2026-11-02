import { Link } from 'react-router-dom';

export default function AuthShell({ children, title = 'Agent Relationship Management System', subtitle }) {
  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <div>
          <img src="/vbeyond-logo-white.png" alt="VBEYOND" style={{ height: 56 }} />
          <div className="mt-2 small" style={{ letterSpacing: '0.2em', color: 'var(--vb-green-200)', fontWeight: 600 }}>AGENT RELATIONSHIP MANAGEMENT</div>
        </div>
        <div style={{ maxWidth: 440, position: 'relative', zIndex: 1 }}>
          <h1 className="text-white" style={{ fontSize: '2rem', lineHeight: 1.25 }}>{title}</h1>
          <p className="mt-3" style={{ color: '#b9cfcf' }}>{subtitle || 'One place for VBEYOND agents and back-office teams to manage registration, teams, membership and support.'}</p>
          <ul className="list-unstyled mt-4 d-grid gap-2" style={{ color: '#d7e3e3' }}>
            <li><i className="bi bi-check2-circle me-2 text-success" style={{ color: 'var(--vb-green-200)' }} />Online agent registration and document review</li>
            <li><i className="bi bi-check2-circle me-2" style={{ color: 'var(--vb-green-200)' }} />Team onboarding, transfers and hierarchy</li>
            <li><i className="bi bi-check2-circle me-2" style={{ color: 'var(--vb-green-200)' }} />Membership renewal and support in one portal</li>
          </ul>
        </div>
        <small style={{ color: '#8fb0b1' }}>© VBEYOND Development · Prototype for demonstration only</small>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="d-lg-none mb-4"><img src="/vbeyond-logo-color.png" alt="VBEYOND" style={{ height: 44 }} /></div>
          {children}
          <div className="mt-4 text-center"><span className="demo-pill">DEMO MODE · no real accounts or emails</span></div>
        </div>
      </main>
    </div>
  );
}

export function BackToLogin() {
  return <Link to="/login" className="small text-decoration-none"><i className="bi bi-arrow-left me-1" />Back to sign in</Link>;
}
