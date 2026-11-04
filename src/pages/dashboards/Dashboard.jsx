import { Link, useNavigate } from 'react-router-dom';
import { RENEWAL_REMINDER_DAYS, useMyNotifications, useStore } from '../../context/StoreContext';
import { Avatar, EmptyState, StatCard, StatusBadge, TONES } from '../../components/common';
import { NOTIF_ICON } from '../../components/notifications/notifMeta';
import { effectiveInviteStatus } from '../../components/dashboard/AgentShared';
import { ApplicationProgress } from '../agent/MyApplication';
import Help from '../agent/Help';
import { ROLES } from '../../utils/permissions';
import { daysUntil, fmtDate, fmtDateTime, fmtMoney, fullName, timeAgo } from '../../utils/format';

function Greeting({ user, subtitle, children }) {
  const h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="hero-banner mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 position-relative" style={{ zIndex: 1 }}>
        <div>
          <div className="small-caps" style={{ color: 'var(--vb-green-200)' }}>{ROLES[user.role].label}</div>
          <h1 className="h3 text-white mb-1 mt-1">{hello}, {user.name.split(' ')[0]}</h1>
          <div className="text-white-75">{subtitle}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function RecentNotifications({ limit = 5 }) {
  const { list } = useMyNotifications();
  const { user, mutate } = useStore();
  const navigate = useNavigate();
  const me = user.keys[0];
  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between"><span>Recent notifications</span><Link to="/notifications" className="small fw-normal">View all</Link></div>
      <div>
        {list.slice(0, limit).map((n) => (
          <button key={n.id} className={`notif-item ${n.readBy.includes(me) ? '' : 'unread'}`} onClick={() => { mutate((d) => { const x = d.notifications.find((y) => y.id === n.id); if (!x.readBy.includes(me)) x.readBy.push(me); }); navigate(n.link); }}>
            <span className="notif-icon"><i className={`bi ${NOTIF_ICON[n.category] || 'bi-bell'}`} /></span>
            <span className="flex-grow-1" style={{ minWidth: 0 }}><span className="notif-title d-block text-truncate">{n.title}</span><small className="text-muted">{timeAgo(n.at)}</small></span>
            {!n.readBy.includes(me) && <span className="unread-dot" />}
          </button>
        ))}
        {!list.length && <EmptyState icon="bi-bell" title="No notifications yet" />}
      </div>
    </div>
  );
}

function RecentAnnouncements() {
  const { state, user } = useStore();
  const list = state.announcements.filter((a) => a.status === 'Published').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between"><span>Company announcements</span><Link to="/announcements" className="small fw-normal">View all</Link></div>
      <div className="list-group list-group-flush">
        {list.map((a) => (
          <Link key={a.id} to={`/announcements?open=${a.id}`} className="list-group-item list-group-item-action">
            <div className="d-flex justify-content-between gap-2"><span className={`text-truncate ${a.readBy.includes(user.keys[0]) ? '' : 'fw-semibold'}`}>{a.title}</span>{!a.readBy.includes(user.keys[0]) && <span className="badge bg-success">New</span>}</div>
            <small className="text-muted">{a.category} · {fmtDate(a.date)}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ actions }) {
  return (
    <div className="card h-100"><div className="card-header">Quick actions</div><div className="card-body d-grid gap-2">
      {actions.map((a) => <Link key={a.to + a.label} to={a.to} className={`btn ${a.primary ? 'btn-primary' : 'btn-light'} text-start`}><i className={`bi ${a.icon} me-2`} />{a.label}</Link>)}
    </div></div>
  );
}

function ActivityFeed({ filter, title = 'Recent activity' }) {
  const { state } = useStore();
  const logs = state.logs.filter(filter || (() => true)).slice(0, 7);
  return (
    <div className="card h-100"><div className="card-header">{title}</div><div className="card-body">
      {logs.length ? <ul className="timeline small mb-0">{logs.map((l) => <li key={l.id} className="done"><div><strong>{l.actor}</strong> · {l.action}</div><small className="text-muted">{l.target} · {timeAgo(l.at)}</small></li>)}</ul> : <EmptyState title="No activity yet" />}
    </div></div>
  );
}

/* ----------------------------- Prospect ----------------------------- */
function ProspectDashboard({ user }) {
  const { state } = useStore();
  const app = user.application;
  const agent = state.agents.find((a) => a.id === app?.agentId);
  const invites = state.invitations.filter((i) => i.email.toLowerCase() === user.email && ['Pending', 'Accepted', 'Registration In Progress'].includes(effectiveInviteStatus(i)));
  const openClar = app?.clarifications.find((c) => !c.response);
  return (
    <>
      <Greeting user={user} subtitle={app ? `Application ${app.id} · ${app.status}` : 'Start your journey as a VBEYOND agent.'}>
        {!app && <Link to="/register" className="btn btn-light btn-lg">Start registration</Link>}
        {app?.status === 'Approved' && !agent?.activated && <Link to={`/first-login?app=${app.id}`} className="btn btn-light btn-lg">Proceed to first login</Link>}
      </Greeting>
      {invites.map((i) => (
        <div key={i.id} className="alert alert-brand d-flex flex-wrap gap-3 align-items-center">
          <i className="bi bi-envelope-paper-heart fs-3" />
          <div className="flex-grow-1"><strong>{fullName(state.agents.find((a) => a.id === i.invitedBy))} invited you to join {state.teams.find((t) => t.id === i.teamId)?.name}</strong><div className="small">Your team is pre-assigned. Expires {fmtDate(i.expiresAt)}.</div></div>
          {!app && <Link to={`/register?invite=${i.id}`} className="btn btn-primary">Open registration</Link>}
        </div>
      ))}
      {openClar && <div className="alert alert-warning d-flex flex-wrap gap-3 align-items-center"><i className="bi bi-question-diamond fs-4" /><div className="flex-grow-1"><strong>Action needed:</strong> {openClar.message}</div><Link to="/my-application" className="btn btn-warning">Respond now</Link></div>}
      <div className="d-grid gap-3">
          <div className="card">
            <div className="card-header">Application status</div>
            <div className="card-body">
              {app ? <>
                <div className="d-flex flex-wrap justify-content-between mb-3 gap-2"><span>Reference <strong>{app.id}</strong> · submitted {fmtDate(app.submittedAt)}</span><StatusBadge status={app.status} /></div>
                <ApplicationProgress app={app} agent={agent} />
                <div className="mt-3"><Link to="/my-application" className="btn btn-outline-primary btn-sm">View application details</Link></div>
              </> : <>
                <p className="text-muted">You haven't applied yet. Here's how it works:</p>
                <div className="row g-2 text-center small">
                  {[['bi-pencil-square', 'Register online'], ['bi-file-earmark-arrow-up', 'Upload documents'], ['bi-shield-check', 'Compliance review'], ['bi-people', 'Join a team']].map(([i, l], n) => (
                    <div className="col-6 col-md-3" key={l}><div className="border rounded p-3 h-100"><i className={`bi ${i} fs-3 text-brand`} /><div className="mt-1 fw-medium">{n + 1}. {l}</div></div></div>
                  ))}
                </div>
              </>}
            </div>
          </div>
          <RecentNotifications />
          <div className="mt-2"><Help embedded /></div>
      </div>
    </>
  );
}

/* ----------------------------- Agent ----------------------------- */
function AgentBlocks({ user }) {
  const { state } = useStore();
  const a = user.agent;
  const team = state.teams.find((t) => t.id === a.teamId);
  const lead = state.agents.find((x) => x.id === team?.leadId);
  const left = daysUntil(a.membershipExpiry);
  const renewal = state.renewals.find((r) => r.agentId === a.id && !['Approved', 'Rejected'].includes(r.status));
  const deals = state.deals.filter((d) => d.agentId === a.id);
  return (
    <>
      {a.status === 'Suspended' && <div className="alert alert-warning"><i className="bi bi-pause-circle me-2" /><strong>Your account is suspended.</strong> Restricted functions such as renewal, invitations and new reservations are unavailable. Your existing deals are preserved and under manager review. {a.statusNote?.reason && `Reason: ${a.statusNote.reason}.`}</div>}
      {a.status === 'Expired' && <div className="alert alert-danger d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-calendar-x me-1" /><span className="flex-grow-1"><strong>Your membership has expired.</strong> Membership-dependent functions are restricted until you renew.</span><Link to="/renewal" className="btn btn-sm btn-danger">Renew now</Link></div>}
      {!a.teamId && a.status === 'Active' && <div className="alert alert-brand"><i className="bi bi-hourglass-split me-2" /><strong>Welcome aboard!</strong> An Agent Manager will assign you to a team shortly — you'll get a notification.</div>}
      {a.status === 'Active' && left <= RENEWAL_REMINDER_DAYS && !renewal && <div className="alert alert-warning d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-bell me-1" /><span className="flex-grow-1"><strong>Renewal reminder:</strong> your membership expires in {left} days ({fmtDate(a.membershipExpiry)}).</span><Link to="/renewal" className="btn btn-sm btn-warning">Start renewal</Link></div>}
      {renewal && <div className="alert alert-brand d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-arrow-repeat me-1" /><span className="flex-grow-1">Renewal {renewal.id}: <strong>{renewal.status}</strong>{renewal.status === 'Pending Payment' ? ' — payment required' : ''}</span><Link to="/renewal" className="btn btn-sm btn-outline-primary">View renewal</Link></div>}
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Membership status</div><div className="mt-2"><StatusBadge status={a.status} /></div></div></div></div>
        <div className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Membership expiry</div><div className={`fw-semibold mt-1 ${left < 60 ? 'text-danger' : ''}`}>{fmtDate(a.membershipExpiry)}</div><small className="text-muted">{left > 0 ? `${left} days left` : 'Expired'}</small></div></div></div>
        <div className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Current team</div><div className="fw-semibold mt-1">{team?.name || 'Pending onboarding'}</div><small className="text-muted">{team?.region}</small></div></div></div>
        <div className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Team lead</div>
          {lead ? <div className="d-flex align-items-center gap-2 mt-1"><Avatar name={fullName(lead)} color={lead.avatarColor} photo={lead.photo} size={28} /><div className="lh-sm"><div className="fw-semibold small">{lead.id === a.id ? 'You' : fullName(lead)}</div><small className="text-muted">{lead.phone}</small></div></div> : <div className="fw-semibold mt-1">—</div>}
        </div></div></div>
      </div>
      {deals.length > 0 && (
        <div className="card mb-3"><div className="card-header">My active deals</div><div className="table-responsive"><table className="table mb-0">
          <thead><tr><th>Deal</th><th>Project</th><th>Stage</th><th>Value</th><th /></tr></thead>
          <tbody>{deals.map((d) => <tr key={d.id}><td>{d.id}</td><td>{d.project}<div className="small text-muted">Unit {d.unit}</div></td><td>{d.stage}</td><td>{fmtMoney(d.value)}</td><td>{d.flag && <span className="status-badge sb-amber">{d.flag}</span>}</td></tr>)}</tbody>
        </table></div></div>
      )}
    </>
  );
}

function AgentDashboard({ user }) {
  return (
    <>
      <Greeting user={user} subtitle={`Agent ID ${user.agent.id}${user.agent.migrated ? ' · migrated from the legacy system' : ''}`} />
      <AgentBlocks user={user} />
      <div className="row g-3">
        <div className="col-lg-5"><RecentNotifications /></div>
        <div className="col-lg-4"><RecentAnnouncements /></div>
        <div className="col-lg-3"><QuickActions actions={[
          { to: '/renewal', label: 'Renew membership', icon: 'bi-arrow-repeat', primary: true },
          { to: '/profile', label: 'Edit my profile', icon: 'bi-person' },
          { to: '/report-problem', label: 'Report a problem', icon: 'bi-bug' },
          { to: '/contact-support', label: 'Contact support', icon: 'bi-headset' },
        ]} /></div>
      </div>
    </>
  );
}

/* ----------------------------- Team lead ----------------------------- */
function TeamLeadDashboard({ user }) {
  const { state } = useStore();
  const team = user.ledTeam;
  const members = state.agents.filter((a) => a.teamId === team.id);
  const invites = state.invitations.filter((i) => i.invitedBy === user.agent.id);
  const pendingInv = invites.filter((i) => ['Pending', 'Accepted', 'Registration In Progress'].includes(effectiveInviteStatus(i)));
  const recent = members.filter((a) => a.onboardedAt && Date.now() - new Date(a.teamHistory[a.teamHistory.length - 1]?.from || a.onboardedAt) < 45 * 86400000 && a.id !== user.agent.id);
  return (
    <>
      <Greeting user={user} subtitle={`Team lead of ${team.name} · ${team.region}`}>
        <Link to="/team/invitations" className="btn btn-light"><i className="bi bi-person-plus me-1" />Invite someone</Link>
      </Greeting>
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard icon="bi-people" label="Total team members" value={members.length} to="/team/members" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-check-circle" label="Active agents" value={members.filter((a) => a.status === 'Active').length} tone={TONES.green} to="/team/members" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-envelope-paper" label="Pending invitations" value={pendingInv.length} tone={TONES.amber} to="/team/invitations" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-person-plus" label="Recently joined" value={recent.length} tone={TONES.blue} to="/team/members" /></div>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between"><span>Team member directory</span><Link to="/team/members" className="small fw-normal">View all</Link></div>
            <div className="list-group list-group-flush">
              {members.slice(0, 6).map((a) => (
                <Link key={a.id} to={`/team/members?view=${a.id}`} className="list-group-item list-group-item-action d-flex align-items-center gap-2">
                  <Avatar name={fullName(a)} color={a.avatarColor} photo={a.photo} size={32} />
                  <span className="flex-grow-1 lh-sm"><span className="d-block fw-medium">{fullName(a)}{a.id === team.leadId && <span className="status-badge sb-purple ms-2">Lead</span>}</span><small className="text-muted">{a.id} · {a.phone}</small></span>
                  <StatusBadge status={a.status} />
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-header">Recently joined</div>
            <div className="list-group list-group-flush">
              {recent.map((a) => <Link key={a.id} to={`/team/members?highlight=${a.id}`} className="list-group-item list-group-item-action d-flex justify-content-between"><span>{fullName(a)} <small className="text-muted">{a.id}</small></span><small className="text-muted">{fmtDate(a.teamHistory[a.teamHistory.length - 1]?.from || a.onboardedAt)}</small></Link>)}
              {!recent.length && <div className="list-group-item small text-muted">No new members in the last 45 days.</div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">Team overview</div>
            <div className="card-body small">
              {['Active', 'Suspended', 'Expired', 'Resigned'].map((s) => {
                const n = members.filter((a) => a.status === s).length;
                return <div key={s} className="mb-2"><div className="d-flex justify-content-between"><span>{s}</span><span>{n}</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${members.length ? (n / members.length) * 100 : 0}%`, background: s === 'Active' ? 'var(--vb-green-600)' : s === 'Suspended' ? '#d98a00' : s === 'Expired' ? '#b42318' : '#8a949e' }} /></div></div>;
              })}
              <div className="mt-2 text-muted">{members.filter((a) => a.status === 'Active' && daysUntil(a.membershipExpiry) <= 60).length} member(s) expire within 60 days.</div>
            </div>
          </div>
        </div>
      </div>
      <h2 className="h5 mt-4 mb-3">My agent account</h2>
      <AgentBlocks user={user} />
      <div className="row g-3">
        <div className="col-lg-7"><RecentNotifications /></div>
        <div className="col-lg-5"><RecentAnnouncements /></div>
      </div>
    </>
  );
}

/* ----------------------------- Compliance ----------------------------- */
function ComplianceDashboard({ user }) {
  const { state } = useStore();
  const apps = state.applications;
  const pending = apps.filter((a) => ['Pending Review', 'Resubmitted'].includes(a.status));
  const clar = apps.filter((a) => a.status === 'Clarification Required');
  const approved = apps.filter((a) => a.status === 'Approved').sort((a, b) => new Date(b.timeline[b.timeline.length - 1].at) - new Date(a.timeline[a.timeline.length - 1].at));
  const renewals = state.renewals.filter((r) => !['Approved', 'Rejected'].includes(r.status));
  return (
    <>
      <Greeting user={user} subtitle={`${pending.length} application(s) waiting for review today.`}><Link to="/applications" className="btn btn-light">Open review queue</Link></Greeting>
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl"><StatCard icon="bi-inboxes" label="Total applications" value={apps.length} to="/applications" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-hourglass-split" label="Pending review" value={pending.length} tone={TONES.blue} to="/applications" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-question-diamond" label="Need clarification" value={clar.length} tone={TONES.amber} to="/applications" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-patch-check" label="Approved" value={approved.length} tone={TONES.green} to="/applications" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-arrow-repeat" label="Pending renewals" value={renewals.length} tone={TONES.purple} to="/renewals" /></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between"><span>Waiting for review</span><Link to="/applications" className="small fw-normal">View queue</Link></div>
            <div className="list-group list-group-flush">
              {pending.slice(0, 6).map((a) => (
                <Link key={a.id} to={`/applications/${a.id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-2">
                  <span className="lh-sm"><span className="d-block fw-medium">{a.personal.firstName} {a.personal.lastName}</span><small className="text-muted">{a.id} · {timeAgo(a.submittedAt)}</small></span>
                  <StatusBadge status={a.status} />
                </Link>
              ))}
              {!pending.length && <div className="list-group-item small text-muted">The review queue is empty.</div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">Recently approved</div>
            <div className="list-group list-group-flush">
              {approved.slice(0, 4).map((a) => <Link key={a.id} to={`/applications/${a.id}`} className="list-group-item list-group-item-action d-flex justify-content-between"><span>{a.personal.firstName} {a.personal.lastName} <small className="text-muted">→ {a.agentId}</small></span><small className="text-muted">{fmtDate(a.timeline[a.timeline.length - 1].at)}</small></Link>)}
            </div>
          </div>
        </div>
        <div className="col-lg-5"><ActivityFeed filter={(l) => ['Compliance Admin', 'Prospective Agent'].includes(l.role)} /></div>
      </div>
    </>
  );
}

/* ----------------------------- Agent manager ----------------------------- */
function AgentManagerDashboard({ user }) {
  const { state } = useStore();
  const ag = state.agents;
  const by = (s) => ag.filter((a) => a.status === s).length;
  const pendingOnboard = ag.filter((a) => !a.teamId && a.status === 'Active');
  const transfers = state.transferRequests.filter((r) => r.status === 'Pending');
  const renewals = state.renewals.filter((r) => !['Approved', 'Rejected'].includes(r.status));
  const max = Math.max(...state.teams.map((t) => ag.filter((a) => a.teamId === t.id).length), 1);
  return (
    <>
      <Greeting user={user} subtitle={`${pendingOnboard.length} agent(s) waiting for onboarding · ${renewals.length} open renewal request(s)`}><Link to="/onboarding" className="btn btn-light">Onboard agents</Link></Greeting>
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl"><StatCard icon="bi-people" label="Total agents" value={ag.length} to="/agents" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-check-circle" label="Active" value={by('Active')} tone={TONES.green} to="/agent-status" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-pause-circle" label="Suspended" value={by('Suspended')} tone={TONES.amber} to="/agent-status" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-calendar-x" label="Expired" value={by('Expired')} tone={TONES.red} to="/agent-status" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-box-arrow-right" label="Resigned" value={by('Resigned')} tone={TONES.gray} to="/agent-status" /></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100"><div className="card-header d-flex justify-content-between"><span>Team distribution</span><Link to="/teams" className="small fw-normal">Manage teams</Link></div><div className="card-body">
            {state.teams.map((t) => {
              const n = ag.filter((a) => a.teamId === t.id).length;
              const active = ag.filter((a) => a.teamId === t.id && a.status === 'Active').length;
              return <div key={t.id} className="mb-3"><div className="d-flex justify-content-between small mb-1"><span className="fw-medium">{t.name}</span><span className="text-muted">{active} active / {n}</span></div><div className="bar-track" style={{ height: 12 }}><div className="bar-fill" style={{ width: `${(n / max) * 100}%` }} /></div></div>;
            })}
            <div className="small text-muted">{pendingOnboard.length} agent(s) not yet assigned to a team.</div>
          </div></div>
        </div>
        <div className="col-lg-7 d-grid gap-3">
          <div className="card"><div className="card-header d-flex justify-content-between"><span>Pending onboarding</span><Link to="/onboarding" className="small fw-normal">Open onboarding</Link></div>
            <div className="list-group list-group-flush">
              {pendingOnboard.map((a) => <Link key={a.id} to={`/onboarding?agent=${a.id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"><span>{fullName(a)} <small className="text-muted">{a.id}</small></span><span className="btn btn-sm btn-outline-primary">Onboard</span></Link>)}
              {!pendingOnboard.length && <div className="list-group-item small text-muted">Everyone is assigned to a team.</div>}
            </div>
          </div>
          <div className="row g-3">
            <div className="col-md-6"><div className="card h-100"><div className="card-header d-flex justify-content-between"><span>Pending transfers</span><Link to="/teams" className="small fw-normal">Review</Link></div>
              <div className="list-group list-group-flush">{transfers.map((r) => <div key={r.id} className="list-group-item small">{fullName(ag.find((a) => a.id === r.agentId))}<div className="text-muted">{state.teams.find((t) => t.id === r.fromTeamId)?.name} → {state.teams.find((t) => t.id === r.toTeamId)?.name}</div></div>)}
                {!transfers.length && <div className="list-group-item small text-muted">None pending.</div>}</div></div></div>
            <div className="col-md-6"><div className="card h-100"><div className="card-header d-flex justify-content-between"><span>Renewal requests</span><Link to="/renewals" className="small fw-normal">Review</Link></div>
              <div className="list-group list-group-flush">{renewals.map((r) => <Link to={`/renewals?open=${r.id}`} key={r.id} className="list-group-item list-group-item-action small d-flex justify-content-between"><span>{fullName(ag.find((a) => a.id === r.agentId))}</span><StatusBadge status={r.status} /></Link>)}
                {!renewals.length && <div className="list-group-item small text-muted">None open.</div>}</div></div></div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ----------------------------- Support ----------------------------- */
function SupportDashboard({ user }) {
  const { state, can } = useStore();
  const openInq = state.inquiries.filter((i) => i.status === 'Open');
  const unanswered = openInq.filter((i) => !i.messages[i.messages.length - 1].staff);
  const openTickets = state.issues.filter((t) => !['Resolved', 'Closed'].includes(t.status));
  const recentTickets = [...state.issues].sort((a, b) => new Date(b.history[b.history.length - 1].at) - new Date(a.history[a.history.length - 1].at)).slice(0, 5);
  const openMsgs = state.threads.filter((t) => t.status === 'Open');
  return (
    <>
      <Greeting user={user} subtitle={`${unanswered.length} unanswered inquiry(ies) · ${openMsgs.length} open message(s)`}><Link to="/inquiries" className="btn btn-light">Answer inquiries</Link></Greeting>
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-3"><StatCard icon="bi-chat-square-dots" label="Open inquiries" value={openInq.length} to="/inquiries" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-exclamation-circle" label="Unanswered inquiries" value={unanswered.length} tone={TONES.amber} to="/inquiries" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-tools" label="Open support tickets" value={openTickets.length} tone={TONES.blue} to={can('issues', 'view') ? '/system-issues' : undefined} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-chat-left-text" label="Open messages" value={openMsgs.length} tone={TONES.purple} to={can('messages', 'view') ? '/support-inbox' : undefined} /></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card h-100"><div className="card-header d-flex justify-content-between"><span>Unanswered inquiries</span><Link to="/inquiries" className="small fw-normal">View all</Link></div>
            <div className="list-group list-group-flush">{unanswered.map((i) => <Link key={i.id} to={`/inquiries?open=${i.id}`} className="list-group-item list-group-item-action"><div className="d-flex justify-content-between"><span className="fw-medium">{i.subject}</span><small className="text-muted">{timeAgo(i.createdAt)}</small></div><small className="text-muted">{i.name}</small></Link>)}
              {!unanswered.length && <div className="list-group-item small text-muted">All inquiries answered.</div>}</div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card mb-3"><div className="card-header">Recently updated tickets</div>
            <div className="list-group list-group-flush">{recentTickets.map((t) => <Link key={t.id} to={`/system-issues?open=${t.id}`} className="list-group-item list-group-item-action d-flex justify-content-between gap-2"><span className="text-truncate"><strong>{t.id}</strong> {t.title}</span><StatusBadge status={t.status} /></Link>)}</div>
          </div>
          <div className="card"><div className="card-body d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <div><div className="fw-semibold">FAQ management</div><small className="text-muted">{state.faqs.filter((f) => f.published).length} published · {state.faqs.filter((f) => !f.published).length} unpublished</small></div>
            <Link to="/faq" className="btn btn-outline-primary"><i className="bi bi-journal-text me-1" />Manage FAQ</Link>
          </div></div>
        </div>
      </div>
    </>
  );
}

/* ----------------------------- IT admin ----------------------------- */
function ItDashboard({ user }) {
  const { state } = useStore();
  const admins = state.admins;
  const open = state.issues.filter((t) => !['Resolved', 'Closed'].includes(t.status));
  return (
    <>
      <Greeting user={user} subtitle={`${open.filter((t) => !t.assignedTo).length} unassigned technical issue(s)`}><Link to="/system-issues" className="btn btn-light">Open issue dashboard</Link></Greeting>
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl"><StatCard icon="bi-person-gear" label="Admin accounts" value={admins.length} to="/admin/accounts" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-person-check" label="Active administrators" value={admins.filter((a) => a.status === 'Active').length} tone={TONES.green} to="/admin/accounts" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-person-slash" label="Inactive administrators" value={admins.filter((a) => a.status !== 'Active').length} tone={TONES.gray} to="/admin/accounts" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-bug" label="Open technical issues" value={open.length} tone={TONES.blue} to="/system-issues" /></div>
        <div className="col-6 col-xl"><StatCard icon="bi-person-dash" label="Unassigned issues" value={open.filter((t) => !t.assignedTo).length} tone={TONES.amber} to="/system-issues" /></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card mb-3"><div className="card-header d-flex justify-content-between"><span>Open issues</span><Link to="/system-issues" className="small fw-normal">View all</Link></div>
            <div className="list-group list-group-flush">{open.slice(0, 6).map((t) => <Link key={t.id} to={`/system-issues?open=${t.id}`} className="list-group-item list-group-item-action d-flex justify-content-between gap-2 align-items-center"><span className="lh-sm text-truncate"><span className="d-block fw-medium text-truncate">{t.id} · {t.title}</span><small className="text-muted">{t.reporterName} · {fmtDateTime(t.createdAt)}</small></span><span className="d-flex gap-1"><StatusBadge status={t.priority} /><StatusBadge status={t.status} /></span></Link>)}</div>
          </div>
          <div className="card"><div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div><div className="fw-semibold">Role-based access control</div><small className="text-muted">4 back-office roles · permission matrix</small></div>
            <div className="d-flex gap-2"><Link to="/admin/roles" className="btn btn-primary"><i className="bi bi-shield-lock me-1" />Manage RBAC</Link><Link to="/admin/accounts" className="btn btn-outline-primary">Admin accounts</Link></div>
          </div></div>
        </div>
        <div className="col-lg-5"><ActivityFeed title="Recent admin activity" filter={(l) => !['Active Agent', 'Prospective Agent', 'Team Lead'].includes(l.role)} /></div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useStore();
  const map = { prospect: ProspectDashboard, agent: AgentDashboard, teamLead: TeamLeadDashboard, compliance: ComplianceDashboard, agentManager: AgentManagerDashboard, support: SupportDashboard, itAdmin: ItDashboard };
  const C = map[user.role];
  return <C user={user} />;
}
