import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnnouncementBanner, AnnouncementDetailModal, AnnouncementVisual } from '../../components/dashboard/AnnouncementBanner';
import { RENEWAL_REMINDER_DAYS, useStore } from '../../context/StoreContext';
import { Avatar, EmptyState, SearchInput, Select, StatCard, StatusBadge, TONES } from '../../components/common';
import InviteButton from '../../components/InviteButton';
import { ApplicationProgress } from '../agent/MyApplication';
import { CommissionBars, commissionSummary, monthlyCommission } from '../../components/dashboard/Commission';
import Help from '../agent/Help';
import { ROLES } from '../../utils/permissions';
import { periodSales, tierFor } from '../../utils/commission';
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
  const app = user.application;
  const openClar = app?.clarifications.find((c) => !c.response);
  return (
    <>
      <Greeting user={user} subtitle={app ? `Application ${app.id} · ${app.status}` : 'Start your journey as a VBEYOND agent.'}>
        {!app && <Link to="/register" className="btn btn-light btn-lg">Start registration</Link>}
      </Greeting>
      {openClar && <div className="alert alert-warning d-flex flex-wrap gap-3 align-items-center"><i className="bi bi-question-diamond fs-4" /><div className="flex-grow-1"><strong>Action needed:</strong> {openClar.message}</div><Link to="/my-application" className="btn btn-warning">Respond now</Link></div>}
      <div className="d-grid gap-3">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center gap-2">
              <span>Application status</span>
              {app && <Link to="/my-application" className="btn btn-sm btn-outline-primary">View application details</Link>}
            </div>
            <div className="card-body">
              {app ? <>
                <div className="mb-3">Reference <strong>{app.id}</strong> · submitted {fmtDate(app.submittedAt)}</div>
                <ApplicationProgress app={app} />
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

function TierTracker({ agentId }) {
  const { state } = useStore();
  const rules = state.commissionRules;
  const sales = periodSales(state.commissions, agentId, rules);
  const t = tierFor(sales, rules);
  const tiers = [...rules.tiers].sort((a, b) => a.minSales - b.minSales);
  return (
    <div className="card mb-3">
      <div className="card-header">Commission tier</div>
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-2">
          <div>
            <div className="font-brand fs-4 lh-1">{t.tier.name} <span className="fs-6 text-muted">· {t.rate.toFixed(1)}% commission</span></div>
            <small className="text-muted">Sales in the last {rules.tierPeriodMonths} month{rules.tierPeriodMonths > 1 ? 's' : ''}: <strong className="text-body">{fmtMoney(sales)}</strong></small>
          </div>
          <small className="text-muted">{t.next ? <><strong className="text-body">{fmtMoney(t.remaining)}</strong> more to reach {t.next.name} ({(rules.baseRate + t.next.bonus).toFixed(1)}%)</> : 'You are in the highest tier.'}</small>
        </div>
        <div className="bar-track" style={{ height: 10 }} role="progressbar" aria-label={`Progress to ${t.next?.name || 'top tier'}`} aria-valuenow={Math.round(t.progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="bar-fill" style={{ width: `${t.progress}%` }} />
        </div>
        <div className="d-flex justify-content-between small text-muted mt-2">
          {tiers.map((x) => <span key={x.id} className={x.id === t.tier.id ? 'fw-semibold text-body' : ''}>{x.name} · {fmtMoney(x.minSales)}+</span>)}
        </div>
      </div>
    </div>
  );
}

function DashboardAnnouncementFeed() {
  const { state, user, mutate, can } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [open, setOpen] = useState(null);
  const me = user.keys[0];
  const published = state.announcements.filter((announcement) => announcement.status === 'Published');
  const categories = [...new Set(published.map((announcement) => announcement.category))].sort();
  const announcements = published
    .filter((announcement) => category === 'All' || announcement.category === category)
    .filter((announcement) => !query || `${announcement.title} ${announcement.summary || ''} ${announcement.body}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'oldest'
      ? new Date(a.date) - new Date(b.date)
      : sort === 'title'
        ? a.title.localeCompare(b.title)
        : new Date(b.date) - new Date(a.date));
  const showAnnouncement = (announcement) => {
    setOpen(announcement);
    if (!announcement.readBy.includes(me)) {
      mutate((draft) => {
        const item = draft.announcements.find((entry) => entry.id === announcement.id);
        if (item && !item.readBy.includes(me)) item.readBy.push(me);
      });
    }
  };

  return (
    <section className="card dashboard-announcement-feed mb-3" aria-labelledby="dashboard-announcements-heading">
      <div className="card-header dashboard-announcement-feed-header">
        <div>
          <h2 id="dashboard-announcements-heading" className="h6 mb-1"><i className="bi bi-megaphone me-2" aria-hidden="true" />News & announcements</h2>
          <small className="text-muted">{published.length} published update{published.length === 1 ? '' : 's'}</small>
        </div>
        <Link to="/announcements" className="small fw-normal">{can('announcements', 'edit') ? 'Manage announcements' : 'View all'}</Link>
      </div>
      <div className="card-body dashboard-announcement-filters">
        <SearchInput value={query} onChange={setQuery} placeholder="Search announcements" className="dashboard-announcement-search" />
        <Select value={category} onChange={setCategory} label="Filter announcements by topic" options={[{ value: 'All', label: 'All topics' }, ...categories.map((value) => ({ value, label: value }))]} />
        <Select value={sort} onChange={setSort} label="Sort announcements" options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'title', label: 'Title A–Z' }]} />
      </div>
      {announcements.length ? (
        <div className="row g-3 dashboard-announcement-grid">
          {announcements.map((announcement) => {
            const unread = !announcement.readBy.includes(me);
            const summary = announcement.summary || announcement.body;
            const excerpt = summary.length > 130 ? `${summary.slice(0, 127).trimEnd()}...` : summary;
            return (
              <div className="col-md-6 col-xl-4" key={announcement.id}>
                <article className="card dashboard-announcement-card h-100">
                  <AnnouncementVisual a={announcement} height={150} />
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                      <span className="status-badge sb-teal">{announcement.category}</span>
                      {unread && <span className="badge bg-success">New</span>}
                    </div>
                    <h3 className="h6 dashboard-announcement-title">{announcement.title}</h3>
                    <p className="small text-muted dashboard-announcement-excerpt">{excerpt}</p>
                    <div className="d-flex justify-content-between align-items-center gap-2 mt-auto">
                      <small className="text-muted"><i className="bi bi-calendar3 me-1" aria-hidden="true" />{fmtDate(announcement.date)}</small>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => showAnnouncement(announcement)}>Read more</button>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      ) : <div className="dashboard-announcement-empty"><EmptyState icon="bi-megaphone" title={published.length ? 'No announcements match these filters' : 'No announcements yet'} /></div>}
      <AnnouncementDetailModal a={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function AgentBlocks({ user }) {
  const { state } = useStore();
  const a = user.agent;
  const left = daysUntil(a.membershipExpiry);
  const renewal = state.renewals.find((r) => r.agentId === a.id && !['Approved', 'Rejected'].includes(r.status));
  return (
    <>
      {a.status === 'Suspended' && <div className="alert alert-warning"><i className="bi bi-pause-circle me-2" /><strong>Your account is suspended.</strong> Restricted functions such as renewal, inviting others and new reservations are unavailable. Your existing deals are preserved and under manager review. {a.statusNote?.reason && `Reason: ${a.statusNote.reason}.`}</div>}
      {a.status === 'Expired' && <div className="alert alert-danger d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-calendar-x me-1" /><span className="flex-grow-1"><strong>Your membership has expired.</strong> Membership-dependent functions are restricted until you renew.</span><Link to="/renewal" className="btn btn-sm btn-danger">Renew now</Link></div>}
      {!a.teamId && a.status === 'Active' && <div className="alert alert-brand"><i className="bi bi-hourglass-split me-2" /><strong>Welcome aboard!</strong> An Agent Manager will assign you to a team shortly — you'll get a notification.</div>}
      {a.status === 'Active' && left <= RENEWAL_REMINDER_DAYS && !renewal && <div className="alert alert-warning d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-bell me-1" /><span className="flex-grow-1"><strong>Renewal reminder:</strong> your membership expires in {left} days ({fmtDate(a.membershipExpiry)}).</span><Link to="/renewal" className="btn btn-sm btn-warning">Start renewal</Link></div>}
      {renewal && <div className="alert alert-brand d-flex flex-wrap gap-2 align-items-center"><i className="bi bi-arrow-repeat me-1" /><span className="flex-grow-1">Renewal {renewal.id}: <strong>{renewal.status}</strong></span><Link to="/renewal" className="btn btn-sm btn-outline-primary">View renewal</Link></div>}
      <TierTracker agentId={a.id} />
      <CommissionOverview agentId={a.id} />
      <DashboardAnnouncementFeed />
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
  const memberIds = new Set(members.map((a) => a.id));
  const teamSales = (state.commissions || []).filter((c) => memberIds.has(c.agentId));
  const totalSales = teamSales.reduce((total, sale) => total + sale.saleValue, 0);
  const totalCommission = teamSales.reduce((total, sale) => total + sale.amount, 0);
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
            <div className="card-header d-flex justify-content-between"><span>Team member</span><Link to="/team/members" className="small fw-normal">View all</Link></div>
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
            <div className="card-header"><i className="bi bi-people me-2 text-brand" aria-hidden="true" />Team overview</div>
            <div className="card-body small">
              <div className="row g-2 mb-3">
                <div className="col-6"><div className="border rounded p-2 h-100"><div className="text-muted"><i className="bi bi-house-check me-1" aria-hidden="true" />Team total sales</div><div className="fw-semibold mt-1">{fmtMoney(totalSales)}</div></div></div>
                <div className="col-6"><div className="border rounded p-2 h-100"><div className="text-muted"><i className="bi bi-cash-coin me-1" aria-hidden="true" />Team commission</div><div className="fw-semibold mt-1">{fmtMoney(totalCommission)}</div></div></div>
              </div>
              {['Active', 'Suspended', 'Expired', 'Resigned'].map((s) => {
                const n = members.filter((a) => a.status === s).length;
                return <div key={s} className="mb-2"><div className="d-flex justify-content-between"><span>{s}</span><span>{n}</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${members.length ? (n / members.length) * 100 : 0}%`, background: s === 'Active' ? 'var(--vb-green-600)' : s === 'Suspended' ? '#d98a00' : s === 'Expired' ? '#b42318' : '#8a949e' }} /></div></div>;
              })}
              <div className="mt-2 text-muted">{members.filter((a) => a.status === 'Active' && daysUntil(a.membershipExpiry) <= 60).length} member(s) expire within 60 days.</div>
            </div>
          </div>
        </div>
      </div>
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
  const max = Math.max(...state.teams.map((t) => ag.filter((a) => a.teamId === t.id).length), 1);
  return (
    <>
      <Greeting user={user} subtitle={`${pendingOnboard.length} agent(s) waiting for onboarding · ${transfers.length} pending transfer(s) · ${renewals.length} open renewal request(s)`}><Link to="/teams?tab=onboarding" className="btn btn-light">Onboard agents</Link></Greeting>
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
          <div className="card"><div className="card-header d-flex justify-content-between"><span>Pending onboarding</span><Link to="/teams?tab=onboarding" className="small fw-normal">Open onboarding</Link></div>
            <div className="list-group list-group-flush">
              {pendingOnboard.map((a) => <Link key={a.id} to={`/teams?tab=onboarding&agent=${a.id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"><span>{fullName(a)} <small className="text-muted">{a.id}</small></span><span className="btn btn-sm btn-outline-primary">Onboard</span></Link>)}
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

function ContentAdminDashboard({ user }) {
  const { state } = useStore();
  const published = state.announcements.filter((announcement) => announcement.status === 'Published').length;
  const drafts = state.announcements.filter((announcement) => announcement.status === 'Draft').length;
  return (
    <>
      <Greeting user={user} subtitle={`${published} published update${published === 1 ? '' : 's'} · ${drafts} draft${drafts === 1 ? '' : 's'} to manage`}>
        <Link to="/announcements" className="btn btn-light">Manage content</Link>
      </Greeting>
      <DashboardAnnouncementFeed />
    </>
  );
}

function OperationsAdminDashboard({ user }) {
  const { state } = useStore();
  const pending = state.applications.filter((a) => a.status === 'Pending Review');
  const resubmitted = state.applications.filter((a) => a.status === 'Resubmitted');
  const queue = [...resubmitted, ...pending].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const pendingDocuments = queue.reduce((count, application) =>
    count + application.documents.filter((document) => document.status === 'Pending').length, 0);
  return (
    <>
      <Greeting user={user} subtitle={`${queue.length} application(s) need review · ${pendingDocuments} document(s) awaiting verification`}>
        <Link to="/applications" className="btn btn-light">Review applications</Link>
      </Greeting>
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-4"><StatCard icon="bi-inboxes" label="Applications to review" value={queue.length} to="/applications" /></div>
        <div className="col-6 col-xl-4"><StatCard icon="bi-file-earmark-check" label="Documents pending" value={pendingDocuments} tone={TONES.amber} to="/applications" /></div>
        <div className="col-6 col-xl-4"><StatCard icon="bi-journal-text" label="Registration FAQs" value={state.faqs.length} tone={TONES.green} to="/faq" /></div>
      </div>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Applications to review</span>
          <Link to="/faq" className="small fw-normal">Manage registration FAQs</Link>
        </div>
        <div className="list-group list-group-flush">
          {queue.slice(0, 8).map((application) => (
            <Link key={application.id} to={`/applications/${application.id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-2">
              <span className="lh-sm">
                <span className="d-block fw-medium">{application.personal.firstName} {application.personal.lastName}</span>
                <small className="text-muted">{application.id} · {timeAgo(application.submittedAt)}</small>
              </span>
              <StatusBadge status={application.status} />
            </Link>
          ))}
          {!queue.length && <div className="list-group-item small text-muted">No applications are waiting for review.</div>}
        </div>
      </div>
    </>
  );
}

function FinanceAdminDashboard({ user }) {
  const { state } = useStore();
  const { baseRate, tierPeriodMonths, tiers, split } = state.commissionRules;
  return (
    <>
      <Greeting user={user} subtitle="Manage base commission rates, tier rules, and deal split calculations.">
        <Link to="/commission-rules" className="btn btn-light">Edit commission rules</Link>
      </Greeting>
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-4"><StatCard icon="bi-percent" label="Base commission rate" value={`${baseRate}%`} /></div>
        <div className="col-6 col-xl-4"><StatCard icon="bi-bar-chart-steps" label="Commission tiers" value={tiers.length} tone={TONES.green} /></div>
        <div className="col-6 col-xl-4"><StatCard icon="bi-arrow-left-right" label="Deal split" value={split.type === 'percentage' ? `${split.value}%` : fmtMoney(split.value)} tone={TONES.amber} /></div>
      </div>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Commission configuration</span>
          <Link to="/commission-rules" className="small fw-normal">Open commission rules</Link>
        </div>
        <div className="card-body">
          <p className="text-muted mb-3">Tier performance period: {tierPeriodMonths} month(s).</p>
          <div className="list-group list-group-flush">
            {tiers.map((tier) => (
              <div key={tier.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span className="fw-medium">{tier.name}</span>
                <span className="small text-muted">{fmtMoney(tier.minSales)} minimum sales · {tier.bonus}% bonus</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useStore();
  const map = {
    prospect: ProspectDashboard,
    agent: AgentDashboard,
    teamLead: TeamLeadDashboard,
    agentManager: AgentManagerDashboard,
    contentAdmin: ContentAdminDashboard,
    financeAdmin: FinanceAdminDashboard,
    operationsAdmin: OperationsAdminDashboard,
  };
  const C = map[user.role];
  return (
    <div className="dashboard-page">
      <C user={user} />
      <footer className="dash-footer">
        <h2 className="dash-footer-title"><i className="bi bi-headset me-2" aria-hidden="true" />Contact Us</h2>
        <div className="dash-footer-contacts">
          <a href="tel:020068008"><i className="bi bi-telephone me-2" aria-hidden="true" />02 006 8008</a>
          <a href="mailto:info@vbeyond.co.th"><i className="bi bi-envelope me-2" aria-hidden="true" />info@vbeyond.co.th</a>
          <address><i className="bi bi-geo-alt me-2" aria-hidden="true" /><span>บริษัท กลุ่ม วีบียอนด์ เอกซ์ จำกัด (มหาชน) เลขที่ 1 อาคารเอ็มไพร์ ทาวเวอร์ ชั้น 47 ยูนิต 4701, 4711, 4712 ถนนสาทรใต้ แขวงยานนาวา เขตสาทร กรุงเทพ 10120</span></address>
        </div>
      </footer>
    </div>
  );
}
