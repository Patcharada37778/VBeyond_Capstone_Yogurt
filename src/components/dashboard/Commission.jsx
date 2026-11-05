import { useState } from 'react';
import { fmtMoney } from '../../utils/format';

const MONTH = (d) => d.toLocaleDateString('en-GB', { month: 'short' });

/** Commission totals for one agent. */
export function commissionSummary(list) {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const sum = (arr) => arr.reduce((t, c) => t + c.amount, 0);
  return {
    total: sum(list),
    ytd: sum(list.filter((c) => new Date(c.closedAt) >= yearStart)),
    paid: sum(list.filter((c) => c.status === 'Paid')),
    upcoming: sum(list.filter((c) => c.status !== 'Paid')),
    thisMonth: sum(list.filter((c) => new Date(c.closedAt) >= monthStart)),
    deals: list.length,
  };
}

/** Last N months of commission, oldest first. */
export function monthlyCommission(list, months = 6, value = (c) => c.amount) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const items = list.filter((c) => { const d = new Date(c.closedAt); return d >= start && d < end; });
    return { label: MONTH(start), full: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), amount: items.reduce((t, c) => t + value(c), 0), count: items.length };
  });
}

const short = (n) => (n >= 1e6 ? `฿${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `฿${Math.round(n / 1e3)}k` : `฿${n}`);

/** Single-series monthly bar chart with a hover/focus tooltip. */
export function CommissionBars({ data, height = 160, title = 'Monthly commission' }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className={`comm-chart-shell ${data.length > 10 ? 'comm-chart-shell-wide' : ''}`}>
      <div className="comm-chart" role="group" aria-label={`${title}: ${data.map((d) => `${d.full} ${fmtMoney(d.amount)}`).join(', ')}`}>
        <div className="comm-bars" style={{ height }}>
          {data.map((d, i) => (
            <div key={d.label + i} className="comm-col" tabIndex={0} aria-label={`${d.full}: ${fmtMoney(d.amount)}, ${d.count} closed deal${d.count === 1 ? '' : 's'}`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
              {hover === i && (
                <div className="comm-tip" role="tooltip">
                  <div className="fw-semibold">{d.full}</div>
                  <div>{fmtMoney(d.amount)}</div>
                  <div className="text-muted">{d.count} closed deal{d.count === 1 ? '' : 's'}</div>
                </div>
              )}
              <div className={`comm-bar ${hover === i ? 'active' : ''}`} style={{ height: `${(d.amount / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="comm-axis">
          {data.map((d, i) => <span key={d.label + i} className={i === data.length - 1 ? 'fw-semibold text-body' : ''}>{d.label}</span>)}
        </div>
        <div className="comm-max small text-muted">{short(max)}</div>
      </div>
    </div>
  );
}
