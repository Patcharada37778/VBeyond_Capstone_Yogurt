import { NavLink } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { navForRole } from '../../utils/permissions';

export default function Sidebar() {
  const { user, state } = useStore();
  const groups = navForRole(user.role, state.permissions);

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <img src="/vbeyond-logo-white.png" alt="VBEYOND" className="hide-collapsed" />
        <span className="show-collapsed font-brand fw-semibold text-white">VB</span>
      </div>
      <nav>
        {groups.map((g) => (
          <div key={g.group}>
            <div className="nav-group"><span>{g.group}</span></div>
            {g.items.map((i) => (
              <NavLink key={i.path + i.label} to={i.path} className="nav-link" title={i.label} end={i.path === '/dashboard'}>
                <i className={`bi ${i.icon}`} aria-hidden="true" />
                <span className="hide-collapsed">{i.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
