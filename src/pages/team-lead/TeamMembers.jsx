import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { Avatar, EmptyState, PageHeader, SearchInput, Select, StatCard, StatusBadge, TONES } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { AgentProfileModal, OrgChart } from '../../components/dashboard/AgentShared';
import { Modal } from '../../components/modals/Modal';
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

function getDescendantIds(agentId, members) {
  const descendants = new Set();
  const visited = new Set([agentId]);
  const managers = [agentId];
  while (managers.length) {
    const managerId = managers.pop();
    members.filter((member) => member.reportsTo === managerId && !visited.has(member.id))
      .forEach((member) => {
        visited.add(member.id);
        descendants.add(member.id);
        managers.push(member.id);
      });
  }
  return descendants;
}

export default function TeamMembers() {
  const { state, user } = useStore();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const isTeamLead = user.role === 'teamLead';
  const team = user.ledTeam || state.teams.find((item) => item.id === user.agent?.teamId);
  const highlight = params.get('highlight');
  const members = team ? state.agents.filter((agent) => agent.teamId === team.id) : [];
  const downlineIds = !isTeamLead && user.agent ? getDescendantIds(user.agent.id, members) : new Set();
  const selected = members.find((agent) => agent.id === params.get('view'));

  if (!team) return <div className="team-page"><PageHeader title="Team Member" crumbs={[{ label: 'My Team' }]} /><div className="card"><EmptyState icon="bi-people" title="You are not currently assigned to a team" /></div></div>;

  const rows = members.filter((agent) => (isTeamLead || status === 'All' || agent.status === status)
    && (!q || `${fullName(agent)} ${agent.id} ${agent.email} ${agent.phone}`.toLowerCase().includes(q.toLowerCase())));
  const newJoin = state.agents.find((a) => a.id === highlight);

  return (
    <div className="team-page">
      <PageHeader title="Team Member" subtitle={`${team.name} · ${team.region} · ${team.focus}`} crumbs={[{ label: 'My Team' }, { label: 'Team Member' }]}
        actions={isTeamLead && <InviteButton className="btn btn-primary" />} />

      <section className="card team-hierarchy-card mb-3" aria-labelledby="team-hierarchy-heading">
        <div className="card-header team-section-header">
          <div><h2 id="team-hierarchy-heading" className="h6 mb-1"><i className="bi bi-diagram-3 me-2" aria-hidden="true" />Team hierarchy</h2><small className="text-muted">Browse your team’s reporting structure and select a person to view available profile details.</small></div>
        </div>
        <div className="card-body"><OrgChart
          teams={state.teams}
          agents={state.agents}
          onlyTeamId={team.id}
          onSelect={(agent) => setParams({ view: agent.id })}
          canViewStatus={(agent) => isTeamLead || downlineIds.has(agent.id)}
          currentAgentId={user.agent?.id}
        /></div>
      </section>

      {isTeamLead && newJoin && newJoin.teamId === team.id && (
        <div className="alert alert-success d-flex flex-wrap gap-3 align-items-center">
          <Avatar name={fullName(newJoin)} color={newJoin.avatarColor} size={44} />
          <div className="flex-grow-1"><strong>New team member: {fullName(newJoin)}</strong>
            <div className="small">Agent ID {newJoin.id} · onboarded {fmtDate(newJoin.onboardedAt)}</div></div>
          <button className="btn btn-sm btn-success" onClick={() => setParams({ highlight, view: newJoin.id })}>View profile</button>
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-3"><StatCard icon="bi-people" label="Total members" value={members.length} /></div>
        {isTeamLead && <>
          <div className="col-6 col-xl-3"><StatCard icon="bi-check-circle" label="Active" value={members.filter((a) => a.status === 'Active').length} tone={TONES.green} /></div>
          <div className="col-6 col-xl-3"><StatCard icon="bi-calendar-x" label="Expiring in 60 days" value={members.filter((a) => a.status === 'Active' && daysUntil(a.membershipExpiry) <= 60).length} tone={TONES.amber} /></div>
          <div className="col-6 col-xl-3"><StatCard icon="bi-pause-circle" label="Inactive" value={members.filter((a) => a.status !== 'Active').length} tone={TONES.gray} /></div>
        </>}
      </div>

      <div className="card team-members-card">
        <div className="card-header team-section-header">
          <div><h2 className="h6 mb-0"><i className="bi bi-people me-2" aria-hidden="true" />Team members</h2></div>
          <small className="text-muted">{isTeamLead ? `${rows.length} of ${members.length} members` : `${members.length} members`}</small>
        </div>
        <div className="card-body team-member-filters">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name, ID, email or phone" className="flex-grow-1" />
          {isTeamLead && <Select value={status} onChange={setStatus} label="Filter members by status" options={['All', 'Active', 'Suspended', 'Expired', 'Resigned'].map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} />}
        </div>
        <DataTable rows={rows} initialSort={{ key: 'hierarchyLevel', dir: 'asc' }} onRowClick={(r) => setParams({ view: r.id })} rowClassName={(r) => (r.id === highlight ? 'row-highlight' : '')}
          empty={members.length ? 'No team members match these filters.' : 'No team members are assigned to your team yet.'}
          columns={[
            { key: 'name', label: 'Agent', sortValue: fullName, render: (a) => <div className="d-flex gap-2 align-items-center"><Avatar name={fullName(a)} color={a.avatarColor} photo={a.photo} size={36} /><div className="lh-sm"><div className="fw-medium">{fullName(a)}{a.id === team.leadId && <span className="status-badge sb-purple ms-2">Lead</span>}</div><small className="text-muted">{a.id}</small></div></div> },
            { key: 'hierarchyLevel', label: 'Hierarchy level', sortValue: (a) => getHierarchyLevel(a, team, members), render: (a) => { const level = getHierarchyLevel(a, team, members); return <span className="team-hierarchy-level">Level {level}</span>; } },
            { key: 'email', label: 'Email', render: (a) => <a href={`mailto:${a.email}`}>{a.email}</a> },
            { key: 'phone', label: 'Phone' },
            { key: 'status', label: 'Status', render: (a) => isTeamLead || downlineIds.has(a.id) ? <StatusBadge status={a.status} /> : <span className="text-muted">—</span> },
          ]} />
      </div>
      {isTeamLead
        ? <AgentProfileModal agent={selected} teams={state.teams} agents={state.agents} onClose={() => setParams(highlight ? { highlight } : {})} showSensitive={selected?.teamId === team.id} />
        : <Modal open={!!selected} onClose={() => setParams({})} title="Team member information" footer={<button className="btn btn-primary" onClick={() => setParams({})}>Close</button>}>
          {selected && <div className="team-member-profile">
            <div className="d-flex align-items-center gap-3 mb-3">
              <Avatar name={fullName(selected)} color={selected.avatarColor} photo={selected.photo} size={56} />
              <div><h3 className="h6 mb-1">{fullName(selected)}</h3><div className="small text-muted">{selected.id} · {selected.teamRole || 'Agent'}</div></div>
              {downlineIds.has(selected.id) && <StatusBadge status={selected.status} />}
            </div>
            <dl className="dl-grid mb-0">
              <div><dt>Email</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd></div>
              <div><dt>Phone</dt><dd><a href={`tel:${selected.phone}`}>{selected.phone}</a></dd></div>
              <div><dt>LINE ID</dt><dd>{selected.lineId || '—'}</dd></div>
              <div><dt>Team</dt><dd>{team.name}</dd></div>
              <div><dt>Team lead</dt><dd>{fullName(state.agents.find((agent) => agent.id === team.leadId))}</dd></div>
              <div><dt>Hierarchy level</dt><dd>{getHierarchyLevel(selected, team, members)}</dd></div>
            </dl>
          </div>}
        </Modal>}
    </div>
  );
}
