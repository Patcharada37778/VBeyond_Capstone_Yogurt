import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SearchInput, Select } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { fmtDateTime } from '../../utils/format';

export default function ActivityLogs() {
  const { state } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('All');
  const [range, setRange] = useState('all');
  const roles = [...new Set(state.logs.map((l) => l.role))];
  const days = { today: 1, week: 7, month: 30 }[range];
  const rows = state.logs.filter((l) => (role === 'All' || l.role === role) && (!days || Date.now() - new Date(l.at) < days * 86400000)
    && (!q || `${l.actor} ${l.action} ${l.target}`.toLowerCase().includes(q.toLowerCase())));

  const exportCsv = () => {
    const csv = ['Time,Actor,Role,Action,Target', ...rows.map((l) => [fmtDateTime(l.at), l.actor, l.role, l.action, l.target].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'arms-activity-log.csv'; a.click(); URL.revokeObjectURL(url);
    toast(`Exported ${rows.length} log entries.`);
  };

  return (
    <>
      <PageHeader title="Activity Logs" subtitle="Audit trail of actions taken in ARMS." crumbs={[{ label: 'Administration' }, { label: 'Activity Logs' }]}
        actions={<button className="btn btn-outline-primary" onClick={exportCsv}><i className="bi bi-download me-1" />Export CSV</button>} />
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search actor, action or target" className="flex-grow-1" />
          <Select value={role} onChange={setRole} label="Role" options={[{ value: 'All', label: 'All roles' }, ...roles]} />
          <Select value={range} onChange={setRange} label="Time range" options={[{ value: 'all', label: 'All time' }, { value: 'today', label: 'Last 24 hours' }, { value: 'week', label: 'Last 7 days' }, { value: 'month', label: 'Last 30 days' }]} />
        </div>
        <DataTable rows={rows} pageSize={15} initialSort={{ key: 'at', dir: 'desc' }} empty="No activity recorded"
          columns={[
            { key: 'at', label: 'Time', render: (l) => <span className="text-nowrap">{fmtDateTime(l.at)}</span> },
            { key: 'actor', label: 'User' },
            { key: 'role', label: 'Role', render: (l) => <span className="status-badge sb-teal">{l.role}</span> },
            { key: 'action', label: 'Action', render: (l) => <span className="fw-medium">{l.action}</span> },
            { key: 'target', label: 'Target' },
          ]} />
      </div>
    </>
  );
}
