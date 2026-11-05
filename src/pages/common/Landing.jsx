import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

const BENEFITS = [
  ['bi-buildings', 'Sell VBEYOND projects', 'Browse every available unit, save favorites and share co-branded property sheets with your customers.'],
  ['bi-graph-up-arrow', 'Tiered commission', 'Earn more as your sales grow, and follow your commission and tier progress in one dashboard.'],
  ['bi-people', 'Join a team', 'Work with an experienced team lead and get company news, training and support.'],
];
const STEPS = ['Create an account', 'Apply online and upload documents', 'Get approved', 'Join a team and start selling'];

/** Public page for visitors who are not signed in. */
export default function Landing() {
  const { user } = useStore();
  return (
    <div className="landing">
      <header className="landing-nav">
        <img src="/vbeyond-logo-color.png" alt="VBEYOND" />
        <nav className="d-flex gap-2">
          {user ? <Link to="/dashboard" className="btn btn-primary">Go to Home</Link> : <>
            <Link to="/login" className="btn btn-light">Sign in</Link>
            <Link to="/join" className="btn btn-primary">Create account</Link>
          </>}
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-inner">
          <div className="small-caps" style={{ color: 'var(--vb-green-200)' }}>VBEYOND Agent Network</div>
          <h1>Grow your real estate career with VBEYOND</h1>
          <p>Become an authorised VBEYOND agent and sell homes and condominiums by VBEYOND Development.</p>
          <div className="d-flex flex-wrap gap-2 mt-4">
            <Link to="/join" className="btn btn-success btn-lg">Get started</Link>
          </div>
        </div>
      </section>

      <section className="landing-inner py-5">
        <div className="landing-about mb-5">
          <h2 className="h4 mb-2">About VBEYOND</h2>
          <p className="text-muted mb-0">VBEYOND Development is a real estate developer offering homes and condominiums for people looking to find a place to live or invest. Through the VBEYOND Agent Network, agents can connect customers with available properties and access the tools, guidance, and team support they need throughout the sales process.</p>
        </div>
        <h2 className="h4 mb-4">Why become a VBEYOND agent</h2>
        <div className="row g-3">
          {BENEFITS.map(([icon, title, text]) => (
            <div className="col-md-4" key={title}>
              <div className="card h-100"><div className="card-body">
                <i className={`bi ${icon} fs-2 text-brand`} aria-hidden="true" />
                <h3 className="h6 mt-2">{title}</h3>
                <p className="small text-muted mb-0">{text}</p>
              </div></div>
            </div>
          ))}
        </div>

        <h2 className="h4 mt-5 mb-4">How to join</h2>
        <ol className="landing-steps">
          {STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <footer className="landing-footer">
        <div className="landing-inner d-flex flex-wrap justify-content-between gap-2">
          <span>© VBEYOND Development</span>
          <a href="mailto:info@vbeyond.co.th"><i className="bi bi-envelope me-1" aria-hidden="true" />info@vbeyond.co.th</a>
        </div>
      </footer>
    </div>
  );
}
