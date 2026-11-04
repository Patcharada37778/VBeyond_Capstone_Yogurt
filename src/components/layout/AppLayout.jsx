import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useStore } from '../../context/StoreContext';
import { NAV, canAccessItem } from '../../utils/permissions';
import { EmptyState } from '../common';

function canAccessPath(pathname, role, permissions) {
  const matches = [];
  NAV.forEach((g) => g.items.forEach((i) => { if (pathname === i.path || pathname.startsWith(i.path + '/')) matches.push(i); }));
  if (!matches.length) return true; // pages outside the nav map handle their own checks
  const longest = Math.max(...matches.map((m) => m.path.length));
  return matches.filter((m) => m.path.length === longest).some((m) => canAccessItem(m, role, permissions));
}

export default function AppLayout() {
  const { user, state, signOut } = useStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('arms-sidebar') === '1'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    try { localStorage.setItem('arms-sidebar', collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);
  useEffect(() => { document.body.classList.toggle('sidebar-open', mobileOpen); }, [mobileOpen]);
  useEffect(() => { setMobileOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  const allowed = canAccessPath(location.pathname, user.role, state.permissions);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      <div className="main-area">
        <Topbar onToggleSidebar={() => (window.innerWidth < 992 ? setMobileOpen((o) => !o) : setCollapsed((c) => !c))} />
        <main className="content" id="main">
          {user.blocked ? (
            <div className="card"><div className="card-body">
              <EmptyState icon="bi-person-lock" title="This back-office account is deactivated">
                An administrator must reactivate this account before it can be used.
                <div className="mt-3"><button className="btn btn-primary" onClick={signOut}>Sign out</button></div>
              </EmptyState>
            </div></div>
          ) : allowed ? <Outlet /> : (
            <div className="card"><div className="card-body">
              <EmptyState icon="bi-shield-lock" title="You don't have access to this page">
                Your role does not include permission for this feature.
              </EmptyState>
            </div></div>
          )}
        </main>
      </div>
    </div>
  );
}
