import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnnouncementBanner, AnnouncementDetailModal } from '../../components/dashboard/AnnouncementBanner';
import { RENEWAL_REMINDER_DAYS, useStore } from '../../context/StoreContext';
import { Avatar, StatCard, StatusBadge, TONES } from '../../components/common';
import InviteButton from '../../components/InviteButton';
import { ApplicationProgress } from '../agent/MyApplication';
import { CommissionBars, commissionSummary, monthlyCommission } from '../../components/dashboard/Commission';
import Help from '../agent/Help';
import { ROLES } from '../../utils/permissions';
import { daysUntil, fmtDate, fmtMoney, fullName, timeAgo } from '../../utils/format';

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

function AgentAnnouncements() {
  const { state, user, mutate } = useStore();
  const [open, setOpen] = useState(null);
  const me = user.keys[0];
  const items = state.announcements.filter((a) => a.status === 'Published').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const show = (a) => {
    setOpen(a);
    if (!a.readBy.includes(me)) mutate((d) => { d.announcements.find((x) => x.id === a.id).readBy.push(me); });
  };
  return (
    <>
      <AnnouncementBanner items={items} onOpen={show} />
      <AnnouncementDetailModal a={open} onClose={() => setOpen(null)} />
    </>
  );
}

/* ----------------------------- Prospect ----------------------------- */
function ProspectDashboard({ user }) {
  const { state } = useStore();
  const app = user.application;
  const agent = state.agents.find((a) => a.id === app?.agentId);
  const openClar = app?.clarifications.find((c) => !c.response);
  return (
    <>
      <Greeting user={user} subtitle={app ? `Application ${app.id} · ${app.status}` : 'Start your journey as a VBEYOND agent.'}>
        {!app && <Link to="/register" className="btn btn-light btn-lg">Start registration</Link>}
        {app?.status === 'Approved' && !agent?.activated && <Link to={`/first-login?app=${app.id}`} className="btn btn-light btn-lg">Proceed to first login</Link>}
      </Greeting>
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
          <div className="mt-2"><Help embedded /></div>
      </div>
    </>
  );
}

/* ----------------------------- Agent ----------------------------- */
function CommissionOverview({ agentId }) {
  const { state } = useStore();
  const mine = (state.commissions || []).filter((c) => c.agentId === agentId);
  const s = commissionSummary(mine);
  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between"><span>Overall commission</span><Link to="/commission" className="small fw-normal">View statement</Link></div>
      <div className="card-body">
        <div className="row g-4 align-items-center">
          <div className="col-lg-5">
            <div className="small text-muted">Total commission · last 12 months</div>
            <div className="font-brand" style={{ fontSize: '2rem', lineHeight: 1.2 }}>{fmtMoney(s.total)}</div>
            <div className="small text-muted mb-3">from {s.deals} closed deal{s.deals === 1 ? '' : 's'}</div>
            <div className="row g-2 small">
              <div className="col-6"><div className="border rounded p-2"><div className="text-muted">Earned in {new Date().getFullYear()}</div><div className="fw-semibold">{fmtMoney(s.ytd)}</div></div></div>
              <div className="col-6"><div className="border rounded p-2"><div className="text-muted">This month</div><div className="fw-semibold">{fmtMoney(s.thisMonth)}</div></div></div>
              <div className="col-6"><div className="border rounded p-2"><div className="text-muted">Paid out</div><div className="fw-semibold text-green">{fmtMoney(s.paid)}</div></div></div>
              <div className="col-6"><div className="border rounded p-2"><div className="text-muted">Upcoming</div><div className="fw-semibold">{fmtMoney(s.upcoming)}</div></div></div>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="small text-muted mb-1">Commission by month</div>
            <CommissionBars data={monthlyCommission(mine, 6)} />
          </div>
        </div>
      </div>
    </div>
  );
}

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
      {a.status === 'Suspended' && <div className="alert alert-warning"><i className="bi bi-pause-circle me-2" /><strong>Your account is suspended.</strong> Restricted functions such as renewal, inviting others and new reservations are unavailable. Your existing deals are preserved and under manager review. {a.statusNote?.reason && `Reason: ${a.statusNote.reason}.`}</div>}
      {a.status === 'Expired' && <div className="alert alert-danger d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-calendar-x me-1" /><span className="flex-grow-1"><strong>Your membership has expired.</strong> Membership-dependent functions are restricted until you renew.</span><Link to="/renewal" className="btn btn-sm btn-danger">Renew now</Link></div>}
      {!a.teamId && a.status === 'Active' && <div className="alert alert-brand"><i className="bi bi-hourglass-split me-2" /><strong>Welcome aboard!</strong> An Agent Manager will assign you to a team shortly — you'll get a notification.</div>}
      {a.status === 'Active' && left <= RENEWAL_REMINDER_DAYS && !renewal && <div className="alert alert-warning d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-bell me-1" /><span className="flex-grow-1"><strong>Renewal reminder:</strong> your membership expires in {left} days ({fmtDate(a.membershipExpiry)}).</span><Link to="/renewal" className="btn btn-sm btn-warning">Start renewal</Link></div>}
      {renewal && <div className="alert alert-brand d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-arrow-repeat me-1" /><span className="flex-grow-1">Renewal {renewal.id}: <strong>{renewal.status}</strong></span><Link to="/renewal" className="btn btn-sm btn-outline-primary">View renewal</Link></div>}
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Membership status</div><div className="mt-2"><StatusBadge status={a.status} /></div></div></div></div>
        <div className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Membership expiry</div><div className={`fw-semibold mt-1 ${left < 60 ? 'text-danger' : ''}`}>{fmtDate(a.membershipExpiry)}</div><small className="text-muted">{left > 0 ? `${left} days left` : 'Expired'}</small></div></div></div>
        <div className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Current team</div><div className="fw-semibold mt-1">{team?.name || 'Pending onboarding'}</div><small className="text-muted">{team?.region}</small></div></div></div>
        <div className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="small text-muted">Team lead</div>
          {lead ? <div className="d-flex align-items-center gap-2 mt-1"><Avatar name={fullName(lead)} color={lead.avatarColor} photo={lead.photo} size={28} /><div className="lh-sm"><div className="fw-semibold small">{lead.id === a.id ? 'You' : fullName(lead)}</div><small className="text-muted">{lead.phone}</small></div></div> : <div className="fw-semibold mt-1">—</div>}
        </div></div></div>
      </div>
      <CommissionOverview agentId={a.id} />
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
      <Greeting user={user} subtitle={`Agent ID ${user.agent.id}${user.agent.migrated ? ' · migrated from the legacy system' : ''}`}>
        <InviteButton />
      </Greeting>
      <AgentAnnouncements />
      <AgentBlocks user={user} />
    </>
  );
}

/* ----------------------------- Team lead ----------------------------- */
function TeamLeadDashboard({ user }) {
  const { state } = useStore();
  const team = user.ledTeam;
  const members = state.agents.filter((a) => a.teamId === team.id);
  const referrals = state.applications.filter((x) => x.referredBy === user.agent.id && !['Approved', 'Rejected'].includes(x.status));
  const recent = members.filter((a) => a.onboardedAt && Date.now() - new Date(a.teamHistory[a.teamHistory.length - 1]?.from || a.onboardedAt) < 45 * 86400000 && a.id !== user.agent.id);
  return (
    <>
      <Greeting user={user} subtitle={`Team lead of ${team.name} · ${team.region}`}>
        <InviteButton />
      </Greeting>
      <AgentAnnouncements />
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard icon="bi-people" label="Total team members" value={members.length} to="/team/members" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-check-circle" label="Active agents" value={members.filter((a) => a.status === 'Active').length} tone={TONES.green} to="/team/members" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-envelope-paper" label="Invited applicants in review" value={referrals.length} tone={TONES.amber} /></div>
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
  const toReview = state.applications.filter((a) => ['Pending Review', 'Resubmitted'].includes(a.status));
  const max = Math.max(...state.teams.map((t) => ag.filter((a) => a.teamId === t.id).length), 1);
  return (
    <>
      <Greeting user={user} subtitle={`${toReview.length} application(s) to review · ${pendingOnboard.length} agent(s) waiting for onboarding · ${renewals.length} open renewal request(s)`}><Link to="/onboarding" className="btn btn-light">Onboard agents</Link></Greeting>
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
          <div className="card"><div className="card-header d-flex justify-content-between"><span>Applications to review</span><Link to="/applications" className="small fw-normal">Open review queue</Link></div>
            <div className="list-group list-group-flush">
              {toReview.slice(0, 5).map((a) => <Link key={a.id} to={`/applications/${a.id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-2"><span className="lh-sm"><span className="d-block fw-medium">{a.personal.firstName} {a.personal.lastName}</span><small className="text-muted">{a.id} · {timeAgo(a.submittedAt)}</small></span><StatusBadge status={a.status} /></Link>)}
              {!toReview.length && <div className="list-group-item small text-muted">No applications waiting for review.</div>}
            </div>
          </div>
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

export default function Dashboard() {
  const { user } = useStore();
  const map = { prospect: ProspectDashboard, agent: AgentDashboard, teamLead: TeamLeadDashboard, agentManager: AgentManagerDashboard };
  const C = map[user.role];
  return (
    <>
      <C user={user} />
      <footer className="dash-footer">
        <span className="fw-semibold"><i className="bi bi-headset me-2" aria-hidden="true" />Contact support</span>
        <a href="mailto:info@vbeyond.co.th"><i className="bi bi-envelope me-1" aria-hidden="true" />info@vbeyond.co.th</a>
      </footer>
    </>
  );
}
