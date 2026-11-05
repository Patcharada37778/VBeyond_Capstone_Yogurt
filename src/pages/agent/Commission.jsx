import { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { PageHeader, SearchInput, StatCard } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { CommissionBars, commissionSummary, monthlyCommission } from '../../components/dashboard/Commission';
import { fmtDate, fmtMoney } from '../../utils/format';

const TIERS = [
  { name: 'Tier 1', rate: 2, limit: 15_000_000 },
  { name: 'Tier 2', rate: 2.5, limit: 40_000_000 },
  { name: 'Tier 3', rate: 3, limit: null },
];

function getRange(records, key, step) {
  if (!records.length) return { min: 0, max: step, step, disabled: true };
  const values = records.map((record) => record[key]);
  const min = Math.floor(Math.min(...values) / step) * step;
  const max = Math.ceil(Math.max(...values) / step) * step;
  return { min, max: max > min ? max : min + step, step, disabled: false };
}

function TierTracker({ salesVolume, quarterStart, quarterEnd }) {
  const tierIndex = TIERS.findIndex((tier) => tier.limit === null || salesVolume < tier.limit);
  const tier = TIERS[tierIndex];
  const previousLimit = tierIndex === 0 ? 0 : TIERS[tierIndex - 1].limit;
  const progress = tier.limit === null
    ? 100
    : Math.min(100, Math.max(0, ((salesVolume - previousLimit) / (tier.limit - previousLimit)) * 100));
  const amountToNext = tier.limit === null ? 0 : Math.max(0, tier.limit - salesVolume);

  return (
    <section className="card commission-tier-card mb-3" aria-labelledby="commission-tier-heading">
      <div className="card-body">
        <div className="commission-tier-top">
          <div className="commission-section-heading">
            <i className="bi bi-award" aria-hidden="true" />
            <div>
              <h2 id="commission-tier-heading" className="h6 mb-1">Quarterly commission tier</h2>
              <small className="text-muted">Based on your closed sales volume this quarter · {fmtDate(quarterStart)}–{fmtDate(new Date(quarterEnd.getTime() - 86400000))}</small>
            </div>
          </div>
          <div className="commission-current-tier">
            <span className="small text-muted">Current tier</span>
            <strong>{tier.name} · {tier.rate.toFixed(1)}%</strong>
          </div>
        </div>
        <div className="commission-tier-progress-row">
          <div className="progress commission-tier-progress" role="progressbar" aria-label="Progress toward next commission tier" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="small fw-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="commission-tier-foot small text-muted">
          <span>Quarter sales: <strong>{fmtMoney(salesVolume)}</strong></span>
          {tier.limit === null
            ? <span>You’re at the highest tier.</span>
            : <span>{fmtMoney(amountToNext)} to reach {TIERS[tierIndex + 1].name} ({TIERS[tierIndex + 1].rate.toFixed(1)}%)</span>}
        </div>
        <p className="commission-tier-note small text-muted mb-0">Tier guide: up to ฿15M · 2.0%, ฿15M–฿40M · 2.5%, above ฿40M · 3.0%.</p>
      </div>
    </section>
  );
}

function RangeFilter({ id, label, value, bounds, onChange, format }) {
  const [minValue, maxValue] = value;
  const [minInput, setMinInput] = useState(String(minValue));
  const [maxInput, setMaxInput] = useState(String(maxValue));
  const disabled = bounds.disabled;
  const range = bounds.max - bounds.min || 1;
  const minPosition = ((minValue - bounds.min) / range) * 100;
  const maxPosition = ((maxValue - bounds.min) / range) * 100;

  useEffect(() => {
    setMinInput(String(minValue));
    setMaxInput(String(maxValue));
  }, [minValue, maxValue]);

  const updateMin = (raw) => {
    setMinInput(raw);
    if (raw === '') return;
    const next = Number(raw);
    if (Number.isFinite(next)) {
      const clamped = Math.min(maxValue, Math.max(bounds.min, next));
      setMinInput(String(clamped));
      onChange([clamped, maxValue]);
    }
  };
  const updateMax = (raw) => {
    setMaxInput(raw);
    if (raw === '') return;
    const next = Number(raw);
    if (Number.isFinite(next)) {
      const clamped = Math.max(minValue, Math.min(bounds.max, next));
      setMaxInput(String(clamped));
      onChange([minValue, clamped]);
    }
  };

  return (
    <fieldset className="commission-range-filter">
      <legend>{label}</legend>
      <div className="commission-range-inputs">
        <div><label htmlFor={`${id}-min`}>Min</label><div className="input-group input-group-sm"><span className="input-group-text">฿</span><input id={`${id}-min`} type="number" className="form-control" min={bounds.min} max={maxValue} step="1" value={minInput} disabled={disabled} onChange={(event) => updateMin(event.target.value)} onBlur={() => setMinInput(String(minValue))} /></div></div>
        <div><label htmlFor={`${id}-max`}>Max</label><div className="input-group input-group-sm"><span className="input-group-text">฿</span><input id={`${id}-max`} type="number" className="form-control" min={minValue} max={bounds.max} step="1" value={maxInput} disabled={disabled} onChange={(event) => updateMax(event.target.value)} onBlur={() => setMaxInput(String(maxValue))} /></div></div>
      </div>
      <div className="commission-dual-range" style={{ '--range-min': `${minPosition}%`, '--range-max': `${maxPosition}%` }}>
        <div className="commission-dual-range-track" aria-hidden="true" />
        <label className="visually-hidden" htmlFor={`${id}-slider-min`}>{label} minimum</label>
        <input id={`${id}-slider-min`} type="range" className="commission-dual-range-thumb commission-dual-range-thumb-min" min={bounds.min} max={bounds.max} step={bounds.step} value={minValue} disabled={disabled}
          aria-valuetext={format(minValue)} onChange={(event) => onChange([Math.min(Number(event.target.value), maxValue), maxValue])} />
        <label className="visually-hidden" htmlFor={`${id}-slider-max`}>{label} maximum</label>
        <input id={`${id}-slider-max`} type="range" className="commission-dual-range-thumb commission-dual-range-thumb-max" min={bounds.min} max={bounds.max} step={bounds.step} value={maxValue} disabled={disabled}
          aria-valuetext={format(maxValue)} onChange={(event) => onChange([minValue, Math.max(Number(event.target.value), minValue)])} />
      </div>
      <div className="commission-range-endpoints"><span>{format(bounds.min)}</span><span>{format(bounds.max)}</span></div>
    </fieldset>
  );
}

export default function Commission() {
  const { state, user } = useStore();
  const mine = (state.commissions || []).filter((c) => c.agentId === user.agent.id);
  const saleBounds = getRange(mine, 'saleValue', 100_000);
  const commissionBounds = getRange(mine, 'amount', 5_000);
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saleRange, setSaleRange] = useState([saleBounds.min, saleBounds.max]);
  const [commissionRange, setCommissionRange] = useState([commissionBounds.min, commissionBounds.max]);
  const s = commissionSummary(mine);
  const totalSales = mine.reduce((total, sale) => total + sale.saleValue, 0);

  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 1);
  const quarterlySales = mine
    .filter((sale) => {
      const closedAt = new Date(sale.closedAt);
      return closedAt >= quarterStart && closedAt < quarterEnd;
    })
    .reduce((total, sale) => total + sale.saleValue, 0);

  const rows = mine.filter((sale) => {
    const closedDate = new Date(sale.closedAt).toISOString().slice(0, 10);
    const matchesSearch = !q || `${sale.project} ${sale.unit} ${sale.id}`.toLowerCase().includes(q.toLowerCase());
    return matchesSearch
      && (!startDate || closedDate >= startDate)
      && (!endDate || closedDate <= endDate)
      && sale.saleValue >= saleRange[0] && sale.saleValue <= saleRange[1]
      && sale.amount >= commissionRange[0] && sale.amount <= commissionRange[1];
  });

  const hasFilters = q || startDate || endDate
    || saleRange[0] !== saleBounds.min || saleRange[1] !== saleBounds.max
    || commissionRange[0] !== commissionBounds.min || commissionRange[1] !== commissionBounds.max;
  const clearFilters = () => {
    setQ('');
    setStartDate('');
    setEndDate('');
    setSaleRange([saleBounds.min, saleBounds.max]);
    setCommissionRange([commissionBounds.min, commissionBounds.max]);
  };

  return (
    <div className="commission-page">
      <PageHeader title="My Commission" subtitle="Review your sales, commission totals, and quarterly tier progress." crumbs={[{ label: 'My Account' }, { label: 'My Commission' }]} />
      <TierTracker salesVolume={quarterlySales} quarterStart={quarterStart} quarterEnd={quarterEnd} />
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6"><StatCard icon="bi-cash-coin" label="Total commission" value={fmtMoney(s.total)} /></div>
        <div className="col-12 col-md-6"><StatCard icon="bi-house-check" label="Total sales value" value={fmtMoney(totalSales)} tone={['#e3eeee', '#1f4e52']} /></div>
      </div>
      <div className="card commission-chart-card mb-3">
        <div className="card-header"><div className="commission-section-heading"><i className="bi bi-bar-chart-line" aria-hidden="true" /><div><h2 className="h6 mb-0">Commission by month</h2><small className="text-muted">Monthly totals for the last 12 months</small></div></div></div>
        <div className="card-body">
          <CommissionBars data={monthlyCommission(mine, 12)} height={200} />
          <p className="commission-chart-hint small text-muted mb-0"><i className="bi bi-info-circle me-1" aria-hidden="true" />Hover over or focus a bar to see its total and number of closed deals.</p>
        </div>
      </div>
      <div className="card commission-statement-card">
        <div className="card-header commission-statement-heading">
          <div><h2 className="h6 mb-1">Commission statement</h2><small className="text-muted">{rows.length} of {s.deals} sale{s.deals === 1 ? '' : 's'} shown</small></div>
        </div>
        <div className="card-body commission-filters">
          <div className="commission-search"><label className="form-label" htmlFor="commission-search">Search sales</label><SearchInput id="commission-search" value={q} onChange={setQ} placeholder="Search project, unit, or reference" className="w-100" /></div>
          <div className="commission-date-filter">
            <div><label className="form-label" htmlFor="commission-start-date">Start date</label><input id="commission-start-date" className="form-control" type="date" max={endDate || undefined} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
            <div><label className="form-label" htmlFor="commission-end-date">End date</label><input id="commission-end-date" className="form-control" type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
          </div>
          <RangeFilter id="sale-value-range" label="Sale value range" value={saleRange} bounds={saleBounds} onChange={setSaleRange} format={fmtMoney} />
          <RangeFilter id="commission-amount-range" label="Commission range" value={commissionRange} bounds={commissionBounds} onChange={setCommissionRange} format={fmtMoney} />
          <div className="commission-filter-actions">
            <span className="small text-muted" aria-live="polite">{rows.length} matching sale{rows.length === 1 ? '' : 's'}</span>
            {hasFilters && <button type="button" className="btn btn-link btn-sm p-0" onClick={clearFilters}>Clear filters</button>}
          </div>
        </div>
        <DataTable rows={rows} initialSort={{ key: 'closedAt', dir: 'desc' }} empty={mine.length ? 'No sales match these filters.' : 'No commission records yet.'}
          rowKey="id"
          columns={[
            { key: 'closedAt', label: 'Closed', render: (sale) => fmtDate(sale.closedAt) },
            { key: 'project', label: 'Project / unit', render: (sale) => <div className="commission-project"><span>{sale.project}</span><small className="text-muted">Unit {sale.unit} · Ref {sale.id}</small></div> },
            { key: 'saleValue', label: 'Sale value', render: (sale) => fmtMoney(sale.saleValue), className: 'text-end text-nowrap' },
            { key: 'rate', label: 'Rate', render: (sale) => `${(sale.rate * 100).toFixed(1)}%`, className: 'text-end text-nowrap' },
            { key: 'amount', label: 'Commission', render: (sale) => <strong>{fmtMoney(sale.amount)}</strong>, className: 'text-end text-nowrap' },
          ]} />
      </div>
    </div>
  );
}
