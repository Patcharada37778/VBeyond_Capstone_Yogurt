// Commission calculation from the rules set by the back office (BO-SC-01).

export const monthKey = (iso) => new Date(iso).toISOString().slice(0, 7); // "YYYY-MM"
export const monthLabel = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

/** The last `n` month keys, newest first. */
export function recentMonths(n = 12) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    return d.toISOString().slice(0, 7);
  });
}

/** Sales volume for one agent in the tier period ending with `month` (inclusive). */
export function periodSales(commissions, agentId, rules, month = monthKey(new Date().toISOString())) {
  const end = new Date(`${month}-01T00:00:00`);
  end.setMonth(end.getMonth() + 1);
  const start = new Date(end);
  start.setMonth(start.getMonth() - rules.tierPeriodMonths);
  return commissions
    .filter((c) => c.agentId === agentId && new Date(c.closedAt) >= start && new Date(c.closedAt) < end)
    .reduce((t, c) => t + c.saleValue, 0);
}

/** Current tier, the next tier and progress towards it. */
export function tierFor(sales, rules) {
  const tiers = [...rules.tiers].sort((a, b) => a.minSales - b.minSales);
  let idx = 0;
  tiers.forEach((t, i) => { if (sales >= t.minSales) idx = i; });
  const tier = tiers[idx];
  const next = tiers[idx + 1] || null;
  const progress = next ? Math.min(100, ((sales - tier.minSales) / (next.minSales - tier.minSales)) * 100) : 100;
  return { tier, next, progress, rate: rules.baseRate + tier.bonus, remaining: next ? next.minSales - sales : 0 };
}

/** Commission for one sale: gross at the tier rate, minus the team lead split. */
export function calcCommission(saleValue, rate, rules, hasUpline) {
  const gross = Math.round(saleValue * (rate / 100));
  const split = !hasUpline ? 0 : rules.split.type === 'flat' ? Math.min(gross, rules.split.value) : Math.round(gross * (rules.split.value / 100));
  return { gross, split, amount: gross - split };
}
