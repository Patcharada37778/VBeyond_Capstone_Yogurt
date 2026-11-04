import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, PageHeader, SearchInput, Select, StatusBadge } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { daysUntil, fmtDate, fullName } from '../../utils/format';
import { AGENT_STATUSES } from '../../services/agentLifecycle';

export const mask = (s) => (s ? `${s.slice(0, 2)}••••${s.slice(-3)}` : '—');

export default function AgentDirectory() {
  const { state, can } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('All');
  const [status, setStatus] = useState('All');
  const sensitive = can('agents', 'edit');

  const rows = state.agents.filter((a) => (team === 'All' || (team === 'none' ? !a.teamId : a.teamId === team))
    && (status === 'All' || a.status === status)
    && (!q || `${fullName(a)} ${a.id} ${a.email} ${a.phone} ${a.legacyId || ''}`.toLowerCase().includes(q.toLowerCase())));

  const exportCsv = () => {
    const header = ['Agent ID', 'Name', 'Email', 'Phone', 'Team', 'Status', 'Membership expiry'];
    const lines = rows.map((a) => [a.id, fullName(a), sensitive ? a.email : mask(a.email), sensitive ? a.phone : mask(a.phone), state.teams.find((t) => t.id === a.teamId)?.name || '', a.status, fmtDate(a.membershipExpiry)].map((v) => `"${v}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'agent-directory.csv'; link.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${rows.length} agents to CSV.`);
  };

  return (
    <>
      <PageHeader title="Agent List" subtitle="View agent information and contact details." crumbs={[{ label: 'Agent Team Management' }, { label: 'Agent List' }]}
        actions={<button className="btn btn-outline-primary" onClick={exportCsv}><i className="bi bi-download me-1" />Export CSV</button>} />
      {!sensitive && <div className="alert alert-light border small"><i className="bi bi-shield-lock me-1" />Contact details are partially hidden for your role.</div>}
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, agent ID, email, phone" className="flex-grow-1" />
          <Select value={team} onChange={setTeam} label="Team" options={[{ value: 'All', label: 'All teams' }, ...state.teams.map((t) => ({ value: t.id, label: t.name })), { value: 'none', label: 'No team (pending onboarding)' }]} />
          <Select value={status} onChange={setStatus} label="Status" options={['All', ...AGENT_STATUSES].map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} />
        </div>
        <DataTable rows={rows} pageSize={12} onRowClick={(a) => navigate(`/agents/${a.id}`)} initialSort={{ key: 'id', dir: 'asc' }}
          columns={[
            { key: 'name', label: 'Agent', sortValue: fullName, render: (a) => <div className="d-flex gap-2 align-items-center"><Avatar name={fullName(a)} color={a.avatarColor} photo={a.photo} size={34} /><div className="lh-sm"><div className="fw-medium">{fullName(a)}</div><small className="text-muted">{a.id}{a.migrated ? ' · migrated' : ''}</small></div></div> },
            { key: 'email', label: 'Email', render: (a) => (sensitive ? a.email : mask(a.email)) },
            { key: 'phone', label: 'Phone', render: (a) => (sensitive ? a.phone : mask(a.phone)) },
            { key: 'teamId', label: 'Team', sortValue: (a) => state.teams.find((t) => t.id === a.teamId)?.name || 'zz', render: (a) => state.teams.find((t) => t.id === a.teamId)?.name || <span className="status-badge sb-amber">Pending onboarding</span> },
            { key: 'lead', label: 'Team lead', sortable: false, render: (a) => { const t = state.teams.find((x) => x.id === a.teamId); const l = state.agents.find((x) => x.id === t?.leadId); return l ? (l.id === a.id ? <span className="status-badge sb-purple">Is team lead</span> : fullName(l)) : '—'; } },
            { key: 'registeredAt', label: 'Registered', render: (a) => fmtDate(a.registeredAt) },
            { key: 'membershipExpiry', label: 'Expiry', render: (a) => <span className={daysUntil(a.membershipExpiry) < 30 ? 'text-danger fw-medium' : ''}>{fmtDate(a.membershipExpiry)}</span> },
            { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
          ]} />
      </div>
    </>
  );
}
