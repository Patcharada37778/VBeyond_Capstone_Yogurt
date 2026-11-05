import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Avatar, EmptyState, PageHeader } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { CommissionBars } from '../../components/dashboard/Commission';
import { Modal } from '../../components/modals/Modal';
import { periodSales, tierFor } from '../../utils/commission';
import { fmtDate, fmtMoney, fullName } from '../../utils/format';

const MONTHS = Array.from({ length: 12 }, (_, month) => ({
  value: String(month),
  label: new Date(2026, month, 1).toLocaleDateString('en-GB', { month: 'long' }),
  short: new Date(2026, month, 1).toLocaleDateString('en-GB', { month: 'short' }),
}));

function sumSales(records) {
  return records.reduce((totals, record) => ({
    sales: totals.sales + record.saleValue,
    commission: totals.commission + record.amount,
    deals: totals.deals + 1,
  }), { sales: 0, commission: 0, deals: 0 });
}

function periodRecords(records, year, month) {
  return records.filter((record) => {
    const closedAt = new Date(record.closedAt);
    return closedAt.getFullYear() === year && (month === undefined || closedAt.getMonth() === month);
  });
}

function getHierarchyLevel(agent, team, members) {
  if (agent.id === team.leadId) return 1;
  const visited = new Set([agent.id]);
  const lead = members.find((member) => member.id === team.leadId);
  let current = agent;
  let level = 1;

  while (current.id !== team.leadId) {
    const manager = members.find((member) => member.id === current.reportsTo && member.id !== current.id);
    current = manager || lead;
    if (!current || visited.has(current.id)) return level + 1;
    visited.add(current.id);
    level += 1;
  }
  return level;
}

function monthChange(current, previous) {
  if (!previous) return current ? 'New activity this month' : 'No change from last month';
  const difference = ((current - previous) / previous) * 100;
  if (difference === 0) return 'No change from last month';
  return `${difference > 0 ? '+' : ''}${difference.toFixed(1)}% vs previous month`;
}

function SummaryCard({ icon, label, current, previous }) {
  return (
    <div className="card h-100 team-commission-summary-card">
      <div className="card-body">
        <div className="team-commission-summary-icon"><i className={`bi ${icon}`} aria-hidden="true" /></div>
        <div className="team-commission-summary-content">
          <div className="small text-muted">{label} · this month</div>
          <strong>{fmtMoney(current)}</strong>
          <div className="small text-muted">Previous month: {fmtMoney(previous)}</div>
          <div className={`small fw-medium ${current >= previous ? 'text-success' : 'text-danger'}`}>{monthChange(current, previous)}</div>
        </div>
      </div>
    </div>
  );
}

export default function TeamCommission() {
  const { state, user } = useStore();
  const team = user.ledTeam;
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  if (!team) {
    return <div className="team-page"><PageHeader title="Team Commission" crumbs={[{ label: 'My Team' }, { label: 'Team Commission' }]} /><div className="card"><EmptyState icon="bi-cash-stack" title="You don't currently lead a team" /></div></div>;
  }

  const members = state.agents.filter((agent) => agent.teamId === team.id);
  const memberIds = new Set(members.map((agent) => agent.id));
  const teamSales = (state.commissions || []).filter((record) => memberIds.has(record.agentId));
  const currentMonthRecords = periodRecords(teamSales, today.getFullYear(), today.getMonth());
  const previousDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthRecords = periodRecords(teamSales, previousDate.getFullYear(), previousDate.getMonth());
  const currentTotals = sumSales(currentMonthRecords);
  const previousTotals = sumSales(previousMonthRecords);
  const years = [...new Set([today.getFullYear(), ...teamSales.map((record) => new Date(record.closedAt).getFullYear())])]
    .sort((a, b) => b - a);
  const year = Number(selectedYear);
  const month = Number(selectedMonth);
  const filteredRecords = periodRecords(teamSales, year, month);
  const selectedTotals = sumSales(filteredRecords);
  const rows = members.map((agent) => {
    const sales = filteredRecords.filter((record) => record.agentId === agent.id);
    const totals = sumSales(sales);
    return { ...agent, salesValue: totals.sales, commissionAmount: totals.commission, deals: totals.deals };
  });
  const selectedAgent = members.find((agent) => agent.id === selectedAgentId);
  const selectedAgentSales = selectedAgent
    ? filteredRecords.filter((record) => record.agentId === selectedAgent.id)
    : [];
  const selectedAgentTotals = sumSales(selectedAgentSales);
  const rules = state.commissionRules;
  const selectedAgentQuarterSales = selectedAgent ? periodSales(state.commissions, selectedAgent.id, rules) : 0;
  const selectedAgentTier = tierFor(selectedAgentQuarterSales, rules).tier;
  const chartData = MONTHS.map((item, index) => {
    const totals = sumSales(periodRecords(teamSales, year, index));
    return {
      label: item.short,
      full: `${item.label} ${year}`,
      amount: totals.commission,
      count: totals.deals,
    };
  });
  const selectedPeriodLabel = `${MONTHS[month].label} ${year}`;

  return (
    <div className="team-page team-commission-page">
      <PageHeader title="Team Commission" subtitle={`${team.name} · Team sales and commission performance`} crumbs={[{ label: 'My Team' }, { label: 'Team Commission' }]} />

      <section className="team-commission-overview mb-3" aria-label="Current month team performance">
        <div className="team-commission-overview-heading">
          <div><h2 className="h6 mb-1">This month</h2><small className="text-muted">Compared with the previous month</small></div>
          <span className="team-commission-period">{today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="row g-3">
          <div className="col-12 col-md-6"><SummaryCard icon="bi-house-check" label="Team sales" current={currentTotals.sales} previous={previousTotals.sales} /></div>
          <div className="col-12 col-md-6"><SummaryCard icon="bi-cash-coin" label="Team commission" current={currentTotals.commission} previous={previousTotals.commission} /></div>
        </div>
      </section>

      <section className="card team-commission-period-card mb-3" aria-label="Select commission period">
        <div className="card-body team-commission-period-controls">
          <div><label className="form-label" htmlFor="team-commission-month">Month</label><select id="team-commission-month" className="form-select" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div><label className="form-label" htmlFor="team-commission-year">Year</label><select id="team-commission-year" className="form-select" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <div className="team-commission-selected-total"><span className="small text-muted">{selectedPeriodLabel} team totals</span><strong>{fmtMoney(selectedTotals.sales)} sales</strong><strong>{fmtMoney(selectedTotals.commission)} commission</strong></div>
        </div>
      </section>

      <section className="card commission-chart-card mb-3">
        <div className="card-header">
          <div className="commission-section-heading"><i className="bi bi-bar-chart-line" aria-hidden="true" /><div><h2 className="h6 mb-0">Commission by month</h2><small className="text-muted">Team commission totals for {year}</small></div></div>
        </div>
        <div className="card-body">
          <CommissionBars data={chartData} height={200} />
          <p className="commission-chart-hint small text-muted mb-0"><i className="bi bi-info-circle me-1" aria-hidden="true" />Hover over or focus a bar to see total commission and closed deals.</p>
        </div>
      </section>

      <section className="card team-members-card">
        <div className="card-header team-section-header">
          <div><h2 className="h6 mb-1">Individual team performance</h2><small className="text-muted">Sales and commission by member for {selectedPeriodLabel}</small></div>
          <small className="text-muted">{selectedTotals.deals} sale{selectedTotals.deals === 1 ? '' : 's'} · {members.length} members</small>
        </div>
        <DataTable rows={rows} initialSort={{ key: 'salesValue', dir: 'desc' }} onRowClick={(agent) => setSelectedAgentId(agent.id)} empty={`No team sales were recorded in ${selectedPeriodLabel}.`}
          columns={[
            { key: 'name', label: 'Team member', sortValue: fullName, render: (agent) => <button type="button" className="team-commission-agent-link" onClick={() => setSelectedAgentId(agent.id)}><Avatar name={fullName(agent)} color={agent.avatarColor} photo={agent.photo} size={36} /><span className="lh-sm text-start"><span className="fw-medium d-block">{fullName(agent)}</span><small className="text-muted">{agent.id}</small></span></button> },
            { key: 'salesValue', label: 'Sales', render: (agent) => fmtMoney(agent.salesValue), className: 'text-end text-nowrap' },
            { key: 'commissionAmount', label: 'Commission', render: (agent) => <strong>{fmtMoney(agent.commissionAmount)}</strong>, className: 'text-end text-nowrap' },
            { key: 'deals', label: 'Closed sales', render: (agent) => agent.deals, className: 'text-end' },
          ]} />
      </section>
      <Modal open={!!selectedAgent} onClose={() => setSelectedAgentId(null)} title="Agent sales and commission" size="lg"
        footer={<button type="button" className="btn btn-primary" onClick={() => setSelectedAgentId(null)}>Close</button>}>
        {selectedAgent && <div className="team-commission-agent-details">
          <div className="team-commission-agent-heading">
            <Avatar name={fullName(selectedAgent)} color={selectedAgent.avatarColor} photo={selectedAgent.photo} size={48} />
            <div className="team-commission-agent-identity">
              <div className="team-commission-agent-name">
                <h3 className="h6 mb-0">{fullName(selectedAgent)}</h3>
                <span className="team-commission-tag">{`Level ${getHierarchyLevel(selectedAgent, team, members)}`}</span>
                <span className="team-commission-tag team-commission-tier-tag" title={`Based on sales in the last ${rules.tierPeriodMonths} months: ${fmtMoney(selectedAgentQuarterSales)}`}>{selectedAgentTier.name}</span>
              </div>
              <div className="small text-muted">{selectedAgent.id} · {selectedPeriodLabel}</div>
            </div>
          </div>
          <div className="team-commission-agent-totals">
            <div><span>Total sales</span><strong>{fmtMoney(selectedAgentTotals.sales)}</strong></div>
            <div><span>Total commission</span><strong>{fmtMoney(selectedAgentTotals.commission)}</strong></div>
          </div>
          <div className="team-commission-sales-table table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead><tr><th>Property</th><th>Closed</th><th className="text-end">Sale price</th><th className="text-end">Commission rate</th><th className="text-end">Commission amount</th></tr></thead>
              <tbody>
                {selectedAgentSales.length ? selectedAgentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td><div className="commission-project"><span>{sale.project}</span><small className="text-muted">Unit {sale.unit} · Ref {sale.id}</small></div></td>
                    <td className="text-nowrap">{fmtDate(sale.closedAt)}</td>
                    <td className="text-end text-nowrap">{fmtMoney(sale.saleValue)}</td>
                    <td className="text-end text-nowrap">{(sale.rate * 100).toFixed(1)}%</td>
                    <td className="text-end text-nowrap"><strong>{fmtMoney(sale.saleValue * sale.rate)}</strong></td>
                  </tr>
                )) : <tr><td colSpan="5" className="text-center text-muted py-4">No sales recorded for this agent in {selectedPeriodLabel}.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>}
      </Modal>
    </div>
  );
}
