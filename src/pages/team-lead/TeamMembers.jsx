import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { Avatar, EmptyState, PageHeader, SearchInput, Select, StatusBadge } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { AgentProfileModal } from '../../components/dashboard/AgentShared';
import { daysUntil, fmtDate, fullName } from '../../utils/format';

export default function TeamMembers() {
  const { state, user } = useStore();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const team = user.ledTeam;
  const highlight = params.get('highlight');
  const selected = state.agents.find((a) => a.id === params.get('view'));

  if (!team) return <><PageHeader title="Team Members" crumbs={[{ label: 'My Team' }]} /><div className="card"><EmptyState icon="bi-people" title="You don't currently lead a team" /></div></>;

  const members = state.agents.filter((a) => a.teamId === team.id);
  const rows = members.filter((a) => (status === 'All' || a.status === status) && (!q || `${fullName(a)} ${a.id} ${a.email} ${a.phone}`.toLowerCase().includes(q.toLowerCase())));
  const newJoin = state.agents.find((a) => a.id === highlight);

  return (
    <>
      <PageHeader title={`${team.name} — Members`} subtitle={`${team.region} · ${team.focus}`} crumbs={[{ label: 'My Team' }, { label: 'Team Members' }]}
        actions={<Link to="/team/invitations" className="btn btn-primary"><i className="bi bi-person-plus me-1" />Invite someone</Link>} />

      {newJoin && newJoin.teamId === team.id && (
        <div className="alert alert-success d-flex flex-wrap gap-3 align-items-center">
          <Avatar name={fullName(newJoin)} color={newJoin.avatarColor} size={44} />
          <div className="flex-grow-1"><strong>New team member: {fullName(newJoin)}</strong>
            <div className="small">Agent ID {newJoin.id} · onboarded {fmtDate(newJoin.onboardedAt)}</div></div>
          <button className="btn btn-sm btn-success" onClick={() => setParams({ highlight, view: newJoin.id })}>View profile</button>
        </div>
      )}

      <div className="row g-3 mb-3">
        {[['Total members', members.length, 'bi-people'], ['Active', members.filter((a) => a.status === 'Active').length, 'bi-check-circle'], ['Expiring in 60 days', members.filter((a) => a.status === 'Active' && daysUntil(a.membershipExpiry) <= 60).length, 'bi-calendar-x'], ['Inactive', members.filter((a) => a.status !== 'Active').length, 'bi-pause-circle']].map(([l, v, i]) => (
          <div className="col-6 col-md-3" key={l}><div className="card"><div className="card-body stat-card"><div className="stat-icon"><i className={`bi ${i}`} /></div><div><div className="stat-value">{v}</div><div className="stat-label">{l}</div></div></div></div></div>
        ))}
      </div>

      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name, ID, email or phone" className="flex-grow-1" />
          <Select value={status} onChange={setStatus} label="Status" options={['All', 'Active', 'Suspended', 'Expired', 'Resigned'].map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} />
        </div>
        <DataTable rows={rows} onRowClick={(r) => setParams({ view: r.id })} rowClassName={(r) => (r.id === highlight ? 'row-highlight' : '')}
          columns={[
            { key: 'name', label: 'Agent', sortValue: fullName, render: (a) => <div className="d-flex gap-2 align-items-center"><Avatar name={fullName(a)} color={a.avatarColor} photo={a.photo} size={32} /><div className="lh-sm"><div className="fw-medium">{fullName(a)}{a.id === team.leadId && <span className="status-badge sb-purple ms-2">Lead</span>}</div><small className="text-muted">{a.id}</small></div></div> },
            { key: 'email', label: 'Email', render: (a) => <a href={`mailto:${a.email}`}>{a.email}</a> },
            { key: 'phone', label: 'Phone' },
            { key: 'registeredAt', label: 'Registered', render: (a) => fmtDate(a.registeredAt) },
            { key: 'membershipExpiry', label: 'Membership expiry', render: (a) => <span className={daysUntil(a.membershipExpiry) < 60 ? 'text-danger fw-medium' : ''}>{fmtDate(a.membershipExpiry)}</span> },
            { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
            { key: 'actions', label: '', render: (a) => <button className="btn btn-sm btn-light" onClick={() => setParams({ view: a.id })}>View</button> },
          ]} />
      </div>
      <AgentProfileModal agent={selected} teams={state.teams} agents={state.agents} onClose={() => setParams(highlight ? { highlight } : {})} />
    </>
  );
}
