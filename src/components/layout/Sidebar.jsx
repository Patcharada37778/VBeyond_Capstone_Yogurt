import { NavLink } from 'react-router-dom';
import { useMyNotifications, useStore } from '../../context/StoreContext';
import { navForRole } from '../../utils/permissions';

export default function Sidebar() {
  const { user, state } = useStore();
  const { unread } = useMyNotifications();
  const groups = navForRole(user.role, state.permissions);

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <img src="/vbeyond-logo-white.png" alt="VBEYOND" className="hide-collapsed" />
        <span className="brand-sub hide-collapsed">ARMS</span>
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
                {i.badge === 'notifications' && unread > 0 && <span className="badge rounded-pill bg-success hide-collapsed">{unread}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer hide-collapsed">
        VBEYOND Development · ARMS prototype
      </div>
    </aside>
  );
}
