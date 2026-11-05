import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Avatar, EmptyState, PageHeader, Select, StatCard, TONES } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { monthKey, monthLabel, recentMonths } from '../../utils/commission';
import { fmtMoney, fullName } from '../../utils/format';

/** Team sales & commission for the team lead (AG-SC-02). */
export default function TeamSales() {
  const { state, user } = useStore();
  const months = recentMonths(12);
  const [month, setMonth] = useState(months[0]);
  const team = user.ledTeam;
  if (!team) return <><PageHeader title="Team Sales" crumbs={[{ label: 'My Team' }]} /><div className="card"><EmptyState icon="bi-graph-up" title="You don't currently lead a team" /></div></>;

  const members = state.agents.filter((a) => a.teamId === team.id);
  const sales = state.commissions.filter((c) => monthKey(c.closedAt) === month && members.some((m) => m.id === c.agentId));
  const rows = members.map((a) => {
    const mine = sales.filter((c) => c.agentId === a.id);
    return { id: a.id, agent: a, units: mine.length, sales: mine.reduce((t, c) => t + c.saleValue, 0), commission: mine.reduce((t, c) => t + c.amount, 0) };
  });
  const ranked = [...rows].sort((a, b) => b.sales - a.sales);
  const rank = (r) => (r.sales ? ranked.indexOf(r) + 1 : '—');
  const total = (k) => rows.reduce((t, r) => t + r[k], 0);

  return (
    <>
      <PageHeader title={`${team.name} — Sales`} subtitle="Sales and commission for your team members." crumbs={[{ label: 'My Team' }, { label: 'Team Sales' }]}
        actions={<Select value={month} onChange={setMonth} label="Month" options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />} />
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-3"><StatCard icon="bi-cash-stack" label={`Team sales · ${monthLabel(month)}`} value={fmtMoney(total('sales'))} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-house-check" label="Units sold" value={total('units')} tone={TONES.blue} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-cash-coin" label="Team commission" value={fmtMoney(total('commission'))} tone={TONES.green} /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-person-check" label="Members with sales" value={`${rows.filter((r) => r.units).length} / ${members.length}`} tone={TONES.gray} /></div>
      </div>
      <div className="card">
        <div className="card-header">Member ranking · {monthLabel(month)}</div>
        <DataTable rows={rows} initialSort={{ key: 'sales', dir: 'desc' }} pageSize={20} empty="No team members"
          columns={[
            { key: 'rank', label: 'Rank', sortValue: (r) => (r.sales ? ranked.indexOf(r) : 999), render: (r) => <span className="fw-semibold">{rank(r)}</span> },
            { key: 'agent', label: 'Agent', sortValue: (r) => fullName(r.agent), render: (r) => <div className="d-flex gap-2 align-items-center"><Avatar name={fullName(r.agent)} color={r.agent.avatarColor} photo={r.agent.photo} size={30} /><div className="lh-sm"><div className="fw-medium">{fullName(r.agent)}</div><small className="text-muted">{r.agent.id}</small></div></div> },
            { key: 'units', label: 'Units sold', className: 'text-end' },
            { key: 'sales', label: 'Sales', className: 'text-end', render: (r) => <strong>{fmtMoney(r.sales)}</strong> },
            { key: 'commission', label: 'Commission', className: 'text-end', render: (r) => fmtMoney(r.commission) },
          ]} />
      </div>
    </>
  );
}
