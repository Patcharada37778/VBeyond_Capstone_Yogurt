import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PERSONAS, useMyNotifications, useStore } from '../../context/StoreContext';
import { ROLES, canAccessItem, NAV } from '../../utils/permissions';
import { Avatar, Dropdown } from '../common';
import { NOTIF_ICON } from '../notifications/notifMeta';
import { fullName, timeAgo } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../modals/Modal';

function useSearchIndex() {
  const { state, user } = useStore();
  return useMemo(() => {
    const allow = (path) => {
      const items = NAV.flatMap((g) => g.items).filter((i) => i.path === path);
      return items.some((i) => canAccessItem(i, user.role, state.permissions));
    };
    const out = [];
    NAV.flatMap((g) => g.items).forEach((i) => { if (canAccessItem(i, user.role, state.permissions)) out.push({ type: 'Page', icon: i.icon, label: i.label, to: i.path }); });
    if (allow('/agents')) state.agents.filter((a) => a.activated).forEach((a) => out.push({ type: 'Agent', icon: 'bi-person', label: `${fullName(a)} · ${a.id}`, to: `/agents/${a.id}` }));
    if (user.role === 'teamLead' && user.ledTeam) state.agents.filter((a) => a.teamId === user.ledTeam.id).forEach((a) => out.push({ type: 'Team member', icon: 'bi-person', label: `${fullName(a)} · ${a.id}`, to: `/team/members?highlight=${a.id}` }));
    if (allow('/applications')) state.applications.forEach((a) => out.push({ type: 'Application', icon: 'bi-inboxes', label: `${a.id} · ${a.personal.firstName} ${a.personal.lastName}`, to: `/applications/${a.id}` }));
    if (allow('/announcements')) state.announcements.filter((a) => a.status === 'Published' || ROLES[user.role].portal === 'backoffice').forEach((a) => out.push({ type: 'Announcement', icon: 'bi-megaphone', label: a.title, to: `/announcements?open=${a.id}` }));
    if (allow('/help')) state.faqs.filter((f) => f.published).forEach((f) => out.push({ type: 'FAQ', icon: 'bi-question-circle', label: f.q, to: `/help?q=${encodeURIComponent(f.q.slice(0, 20))}` }));
    if (allow('/faq')) state.faqs.forEach((f) => out.push({ type: 'FAQ', icon: 'bi-journal-text', label: f.q, to: '/faq' }));
    return out;
  }, [state, user]);
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const index = useSearchIndex();
  const navigate = useNavigate();
  const ref = useRef(null);
  const results = q.trim().length < 2 ? [] : index.filter((r) => r.label.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
  const go = (r) => { navigate(r.to); setQ(''); setOpen(false); };

  return (
    <div className="topbar-search d-none d-md-block" ref={ref} onBlur={(e) => { if (!ref.current.contains(e.relatedTarget)) setOpen(false); }}>
      <i className="bi bi-search" aria-hidden="true" />
      <input className="form-control" type="search" placeholder="Search pages, agents, applications…" value={q} aria-label="Global search"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) go(results[0]); if (e.key === 'Escape') setOpen(false); }} />
      {open && q.trim().length >= 2 && (
        <div className="search-results">
          {results.length ? results.map((r, i) => (
            <button key={i} onClick={() => go(r)}>
              <i className={`bi ${r.icon} text-brand`} aria-hidden="true" />
              <span className="flex-grow-1 text-truncate">{r.label}</span>
              <small className="text-muted">{r.type}</small>
            </button>
          )) : <div className="p-3 small text-muted">No results for "{q}"</div>}
        </div>
      )}
    </div>
  );
}

function NotificationMenu() {
  const { user, mutate } = useStore();
  const { list, unread } = useMyNotifications();
  const navigate = useNavigate();
  const me = user.keys[0];
  const open = (n) => {
    mutate((d) => { const x = d.notifications.find((y) => y.id === n.id); if (x && !x.readBy.includes(me)) x.readBy.push(me); });
    navigate(n.link);
  };
  return (
    <Dropdown label={`Notifications, ${unread} unread`} trigger={(p) => (
      <button className="icon-btn" onClick={p.toggle} aria-expanded={p['aria-expanded']} aria-label={p['aria-label']}>
        <i className="bi bi-bell" aria-hidden="true" />{unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
    )}>
      <div style={{ width: 'min(380px, 86vw)' }}>
        <div className="d-flex justify-content-between align-items-center px-2 py-1">
          <strong>Notifications</strong>
          {unread > 0 && <button className="btn btn-link btn-sm p-0" onClick={() => mutate((d) => d.notifications.forEach((n) => { if (n.to.some((k) => user.keys.includes(k)) && !n.readBy.includes(me)) n.readBy.push(me); }))}>Mark all as read</button>}
        </div>
        <div className="vb-dropdown-divider" />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {list.slice(0, 6).map((n) => (
            <button key={n.id} data-close className="vb-dropdown-item align-items-start" onClick={() => open(n)}>
              <span className="notif-icon" style={{ width: 30, height: 30 }}><i className={`bi ${NOTIF_ICON[n.category] || 'bi-bell'}`} aria-hidden="true" /></span>
              <span className="flex-grow-1" style={{ minWidth: 0 }}>
                <span className={`d-block text-truncate ${n.readBy.includes(me) ? '' : 'fw-semibold'}`}>{n.title}</span>
                <small className="text-muted">{timeAgo(n.at)}</small>
              </span>
              {!n.readBy.includes(me) && <span className="unread-dot" aria-label="Unread" />}
            </button>
          ))}
          {!list.length && <div className="p-3 small text-muted text-center">You're all caught up.</div>}
        </div>
        <div className="vb-dropdown-divider" />
        <Link to="/notifications" data-close className="vb-dropdown-item justify-content-center text-brand fw-medium">View all notifications</Link>
      </div>
    </Dropdown>
  );
}

function ProfileMenu() {
  const { user, state, signIn, signOut, resetDemo } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const switchTo = (session, label) => { signIn(session); navigate('/dashboard'); toast(`Now viewing as ${label}`, 'info', 'Demo role switched'); };
  const isCurrent = (s) => (s.agentId && s.agentId === state.session?.agentId) || (s.adminId && s.adminId === state.session?.adminId) || (s.applicantKey && s.applicantKey === state.session?.applicantKey);

  // Extra demo accounts created during the session (e.g. newly approved agents, other admins).
  const personaIds = PERSONAS.map((p) => p.session.agentId || p.session.adminId).filter(Boolean);
  const extraAgents = state.agents.filter((a) => a.activated && !personaIds.includes(a.id) && (a.sourceDemo || a.migrated));

  return (
    <>
      <Dropdown label="Profile and demo role switcher" trigger={(p) => (
        <button className="btn btn-light d-flex align-items-center gap-2 border-0 px-2" onClick={p.toggle} aria-expanded={p['aria-expanded']} aria-label={p['aria-label']}>
          <Avatar name={user.name} color={user.avatarColor} photo={user.photo} size={34} />
          <span className="text-start d-none d-lg-block lh-sm">
            <span className="d-block fw-semibold small">{user.name}</span>
            <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>{ROLES[user.role].label}</span>
          </span>
          <i className="bi bi-chevron-down small text-muted" aria-hidden="true" />
        </button>
      )}>
        <div style={{ width: 290 }}>
          <div className="d-flex gap-2 align-items-center px-2 py-2">
            <Avatar name={user.name} color={user.avatarColor} photo={user.photo} size={40} />
            <div className="lh-sm" style={{ minWidth: 0 }}>
              <div className="fw-semibold text-truncate">{user.name}</div>
              <small className="text-muted text-truncate d-block">{user.email}</small>
            </div>
          </div>
          {(user.role === 'agent' || user.role === 'teamLead') && <Link to="/profile" data-close className="vb-dropdown-item"><i className="bi bi-person" /> My profile</Link>}
          <Link to="/notifications" data-close className="vb-dropdown-item"><i className="bi bi-bell" /> Notifications</Link>
          <Link to="/forgot-password" data-close className="vb-dropdown-item"><i className="bi bi-key" /> Reset password</Link>
          <div className="vb-dropdown-divider" />
          <div className="px-2 pt-1 pb-1 d-flex align-items-center justify-content-between">
            <span className="small-caps">Demo role switcher</span><span className="demo-pill">DEMO</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {PERSONAS.map((p) => (
              <button key={p.key} data-close className={`vb-dropdown-item ${isCurrent(p.session) ? 'active' : ''}`} onClick={() => switchTo(p.session, `${p.label} — ${p.name.split(' ')[0]}`)}>
                <i className="bi bi-person-circle text-brand" aria-hidden="true" />
                <span className="lh-sm"><span className="d-block">{p.label}</span><small className="text-muted">{p.name}</small></span>
              </button>
            ))}
            {extraAgents.length > 0 && <div className="px-2 pt-2 small-caps">Other demo accounts</div>}
            {extraAgents.map((a) => (
              <button key={a.id} data-close className={`vb-dropdown-item ${isCurrent({ agentId: a.id }) ? 'active' : ''}`} onClick={() => switchTo({ agentId: a.id }, fullName(a))}>
                <i className="bi bi-person text-brand" aria-hidden="true" />
                <span className="lh-sm"><span className="d-block">{fullName(a)}</span><small className="text-muted">Agent · {a.id}{a.migrated ? ' · migrated' : ''}</small></span>
              </button>
            ))}
          </div>
          <div className="vb-dropdown-divider" />
          <button data-close className="vb-dropdown-item" onClick={() => setConfirmReset(true)}><i className="bi bi-arrow-counterclockwise" /> Reset demo data</button>
          <button data-close className="vb-dropdown-item" onClick={() => { signOut(); navigate('/login'); }}><i className="bi bi-box-arrow-right" /> Sign out</button>
        </div>
      </Dropdown>
      <ConfirmModal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo data?" confirmLabel="Reset data" variant="danger"
        onConfirm={() => { resetDemo(); setConfirmReset(false); navigate('/dashboard'); toast('All demo data has been restored to the starting state.', 'info'); }}>
        This clears every change made in this browser — new applications, approvals, tickets and settings — and restores the original mock data.
      </ConfirmModal>
    </>
  );
}

export default function Topbar({ onToggleSidebar }) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar"><i className="bi bi-list" aria-hidden="true" /></button>
      <GlobalSearch />
      <div className="ms-auto d-flex align-items-center gap-2">
        <span className="demo-pill" title="This is a frontend prototype using mock data"><i className="bi bi-lightning-charge-fill me-1" aria-hidden="true" />DEMO MODE</span>
        <NotificationMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}
