import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { PageHeader, SearchInput, Select, StatCard, StatusBadge, TONES } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { CommissionBars, commissionSummary, monthlyCommission } from '../../components/dashboard/Commission';
import { fmtDate, fmtMoney } from '../../utils/format';

const STATUSES = ['Paid', 'Processing', 'Pending Transfer'];

export default function Commission() {
  const { state, user } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const mine = (state.commissions || []).filter((c) => c.agentId === user.agent.id);
  const s = commissionSummary(mine);
  const rows = mine.filter((c) => (status === 'All' || c.status === status) && (!q || `${c.project} ${c.unit} ${c.id}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title="My Commission" subtitle="Overall commission earned from your closed sales." crumbs={[{ label: 'My Account' }, { label: 'My Commission' }]} />
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-3"><StatCard icon="bi-cash-coin" label="Total commission (12 months)" value={fmtMoney(s.total)} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-calendar-check" label={`Earned in ${new Date().getFullYear()}`} value={fmtMoney(s.ytd)} tone={TONES.blue} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-check2-circle" label="Paid out" value={fmtMoney(s.paid)} tone={TONES.green} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-hourglass-split" label="Upcoming (processing + pending)" value={fmtMoney(s.upcoming)} tone={TONES.amber} /></div>
      </div>
      <div className="card mb-3">
        <div className="card-header">Commission by month (last 12 months)</div>
        <div className="card-body"><CommissionBars data={monthlyCommission(mine, 12)} height={200} /></div>
      </div>
      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Commission statement · {s.deals} closed deal{s.deals === 1 ? '' : 's'}</span>
        </div>
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search project or unit" className="flex-grow-1" />
          <Select value={status} onChange={setStatus} label="Payment status" options={[{ value: 'All', label: 'All statuses' }, ...STATUSES]} />
        </div>
        <DataTable rows={rows} initialSort={{ key: 'closedAt', dir: 'desc' }} empty="No commission records"
          columns={[
            { key: 'closedAt', label: 'Closed', render: (c) => fmtDate(c.closedAt) },
            { key: 'project', label: 'Project', render: (c) => <div className="lh-sm"><div>{c.project}</div><small className="text-muted">Unit {c.unit} · {c.id}</small></div> },
            { key: 'saleValue', label: 'Sale value', render: (c) => fmtMoney(c.saleValue), className: 'text-end' },
            { key: 'rate', label: 'Rate', render: (c) => `${(c.rate * 100).toFixed(1)}%`, className: 'text-end' },
            { key: 'amount', label: 'Commission', render: (c) => <strong>{fmtMoney(c.amount)}</strong>, className: 'text-end' },
            { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
          ]} />
      </div>
    </>
  );
}
