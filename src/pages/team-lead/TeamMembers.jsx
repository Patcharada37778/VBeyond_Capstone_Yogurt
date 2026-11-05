import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { Avatar, EmptyState, PageHeader, SearchInput, Select, StatCard, StatusBadge, TONES } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { AgentProfileModal, OrgChart } from '../../components/dashboard/AgentShared';
import InviteButton from '../../components/InviteButton';
import { daysUntil, fmtDate, fullName } from '../../utils/format';

function getHierarchyLevel(agent, team, members) {
  if (agent.id === team.leadId) return 1;

  const visited = new Set([agent.id]);
  let current = agent;
  let level = 1;
  const lead = members.find((member) => member.id === team.leadId);

  while (current.id !== team.leadId) {
    const manager = members.find((member) => member.id === current.reportsTo && member.id !== current.id);
    current = manager || lead;
    if (!current || visited.has(current.id)) return level + 1;
    visited.add(current.id);
    level += 1;
  }

  return level;
}

export default function TeamMembers() {
  const { state, user } = useStore();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const team = user.ledTeam;
  const highlight = params.get('highlight');
  const selected = state.agents.find((a) => a.id === params.get('view'));

  if (!team) return <div className="team-page"><PageHeader title="Team Member" crumbs={[{ label: 'My Team' }]} /><div className="card"><EmptyState icon="bi-people" title="You don't currently lead a team" /></div></div>;

  const members = state.agents.filter((a) => a.teamId === team.id);
  const rows = members.filter((a) => (status === 'All' || a.status === status) && (!q || `${fullName(a)} ${a.id} ${a.email} ${a.phone}`.toLowerCase().includes(q.toLowerCase())));
  const newJoin = state.agents.find((a) => a.id === highlight);

  return (
    <div className="team-page">
      <PageHeader title="Team Member" subtitle={`${team.name} · ${team.region} · ${team.focus}`} crumbs={[{ label: 'My Team' }, { label: 'Team Member' }]}
        actions={<InviteButton className="btn btn-primary" />} />

      <section className="card team-hierarchy-card mb-3" aria-labelledby="team-hierarchy-heading">
        <div className="card-header team-section-header">
          <div><h2 id="team-hierarchy-heading" className="h6 mb-1"><i className="bi bi-diagram-3 me-2" aria-hidden="true" />Team hierarchy</h2><small className="text-muted">Browse your team’s reporting structure and select a person to view their profile.</small></div>
        </div>
        <div className="card-body"><OrgChart teams={state.teams} agents={state.agents} onlyTeamId={team.id} onSelect={(agent) => setParams({ view: agent.id })} /></div>
      </section>

      {newJoin && newJoin.teamId === team.id && (
        <div className="alert alert-success d-flex flex-wrap gap-3 align-items-center">
          <Avatar name={fullName(newJoin)} color={newJoin.avatarColor} size={44} />
          <div className="flex-grow-1"><strong>New team member: {fullName(newJoin)}</strong>
            <div className="small">Agent ID {newJoin.id} · onboarded {fmtDate(newJoin.onboardedAt)}</div></div>
          <button className="btn btn-sm btn-success" onClick={() => setParams({ highlight, view: newJoin.id })}>View profile</button>
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-3"><StatCard icon="bi-people" label="Total members" value={members.length} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-check-circle" label="Active" value={members.filter((a) => a.status === 'Active').length} tone={TONES.green} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-calendar-x" label="Expiring in 60 days" value={members.filter((a) => a.status === 'Active' && daysUntil(a.membershipExpiry) <= 60).length} tone={TONES.amber} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-pause-circle" label="Inactive" value={members.filter((a) => a.status !== 'Active').length} tone={TONES.gray} /></div>
      </div>

      <div className="card team-members-card">
        <div className="card-header team-section-header">
          <div><h2 className="h6 mb-0"><i className="bi bi-people me-2" aria-hidden="true" />Team members</h2></div>
          <small className="text-muted">{rows.length} of {members.length} members</small>
        </div>
        <div className="card-body team-member-filters">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name, ID, email or phone" className="flex-grow-1" />
          <Select value={status} onChange={setStatus} label="Filter members by status" options={['All', 'Active', 'Suspended', 'Expired', 'Resigned'].map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} />
        </div>
        <DataTable rows={rows} initialSort={{ key: 'hierarchyLevel', dir: 'asc' }} onRowClick={(r) => setParams({ view: r.id })} rowClassName={(r) => (r.id === highlight ? 'row-highlight' : '')}
          empty={members.length ? 'No team members match these filters.' : 'No team members are assigned to your team yet.'}
          columns={[
            { key: 'name', label: 'Agent', sortValue: fullName, render: (a) => <div className="d-flex gap-2 align-items-center"><Avatar name={fullName(a)} color={a.avatarColor} photo={a.photo} size={36} /><div className="lh-sm"><div className="fw-medium">{fullName(a)}{a.id === team.leadId && <span className="status-badge sb-purple ms-2">Lead</span>}</div><small className="text-muted">{a.id}</small></div></div> },
            { key: 'hierarchyLevel', label: 'Hierarchy level', sortValue: (a) => getHierarchyLevel(a, team, members), render: (a) => { const level = getHierarchyLevel(a, team, members); return <span className="team-hierarchy-level">Level {level}</span>; } },
            { key: 'email', label: 'Email', render: (a) => <a href={`mailto:${a.email}`}>{a.email}</a> },
            { key: 'phone', label: 'Phone' },
            { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
          ]} />
      </div>
      <AgentProfileModal agent={selected} teams={state.teams} agents={state.agents} onClose={() => setParams(highlight ? { highlight } : {})} showSensitive={selected?.teamId === team.id} />
    </div>
  );
}
