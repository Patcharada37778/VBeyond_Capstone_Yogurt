import { useState } from 'react';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common';
import { fmtDateTime, fmtMoney } from '../../utils/format';

const toForm = (r) => ({
  baseRate: String(r.baseRate),
  tierPeriodMonths: String(r.tierPeriodMonths),
  tiers: r.tiers.map((t) => ({ ...t, minSales: String(t.minSales), bonus: String(t.bonus) })),
  split: { type: r.split.type, value: String(r.split.value) },
});

function validate(f) {
  const e = { tiers: {} };
  const num = (v) => v !== '' && !Number.isNaN(Number(v));
  if (!num(f.baseRate) || Number(f.baseRate) <= 0 || Number(f.baseRate) > 20) e.baseRate = 'Enter a rate between 0 and 20%.';
  if (!num(f.tierPeriodMonths) || ![1, 3, 6, 12].includes(Number(f.tierPeriodMonths))) e.tierPeriodMonths = 'Choose a period.';
  if (f.tiers.length < 3) e.tierCount = 'At least 3 tiers are required.';
  f.tiers.forEach((t, i) => {
    const te = {};
    if (!t.name.trim()) te.name = 'Required.';
    if (!num(t.minSales) || Number(t.minSales) < 0) te.minSales = 'Enter an amount.';
    else if (i === 0 && Number(t.minSales) !== 0) te.minSales = 'The first tier must start at 0.';
    else if (i > 0 && Number(t.minSales) <= Number(f.tiers[i - 1].minSales)) te.minSales = 'Must be higher than the tier above.';
    if (!num(t.bonus) || Number(t.bonus) < 0 || Number(t.bonus) > 10) te.bonus = '0–10%.';
    if (Object.keys(te).length) e.tiers[i] = te;
  });
  const v = Number(f.split.value);
  if (!num(f.split.value) || v < 0 || (f.split.type === 'percentage' && v > 100)) e.split = f.split.type === 'percentage' ? 'Enter 0–100%.' : 'Enter an amount of 0 or more.';
  if (!Object.keys(e.tiers).length) delete e.tiers;
  return e;
}

/** Commission rules configuration (BO-SC-01): base rate, tiers and team lead split. */
export default function CommissionRules() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const rules = state.commissionRules;
  const [f, setF] = useState(() => toForm(rules));
  const [errors, setErrors] = useState({});
  const editable = can('commissionRules', 'edit');
  const dirty = JSON.stringify(f) !== JSON.stringify(toForm(rules));

  const setTier = (i, k, v) => setF((x) => ({ ...x, tiers: x.tiers.map((t, n) => (n === i ? { ...t, [k]: v } : t)) }));
  const addTier = () => setF((x) => ({ ...x, tiers: [...x.tiers, { id: `TR-${Date.now()}`, name: `Tier ${x.tiers.length + 1}`, minSales: '', bonus: '' }] }));
  const removeTier = (i) => setF((x) => ({ ...x, tiers: x.tiers.filter((_, n) => n !== i) }));

  const save = () => {
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) { toast('Please fix the highlighted fields.', 'warning'); return; }
    mutate((d) => {
      d.commissionRules = {
        baseRate: Number(f.baseRate),
        tierPeriodMonths: Number(f.tierPeriodMonths),
        tiers: f.tiers.map((t) => ({ id: t.id, name: t.name.trim(), minSales: Number(t.minSales), bonus: Number(t.bonus) })),
        split: { type: f.split.type, value: Number(f.split.value) },
        updatedAt: new Date().toISOString(),
        updatedBy: user.name,
      };
      logAction(d, user, 'Updated commission rules', 'Commission rules');
    });
    toast('Commission rules saved. They apply to the next sales upload.', 'success');
  };

  const te = (i, k) => errors.tiers?.[i]?.[k];

  return (
    <>
      <PageHeader title="Commission Rules" subtitle={`Last updated ${fmtDateTime(rules.updatedAt)} by ${rules.updatedBy}`} crumbs={[{ label: 'Sales & Commission' }, { label: 'Commission Rules' }]}
        actions={editable && <>
          <button className="btn btn-light" disabled={!dirty} onClick={() => { setF(toForm(rules)); setErrors({}); }}>Discard changes</button>
          <button className="btn btn-primary" disabled={!dirty} onClick={save}>Save rules</button>
        </>} />

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-header">Base rate</div>
            <div className="card-body">
              <label className="form-label required" htmlFor="cr-base">Base commission rate (%)</label>
              <input id="cr-base" type="number" step="0.1" min="0" className={`form-control ${errors.baseRate ? 'is-invalid' : ''}`} value={f.baseRate} disabled={!editable} onChange={(e) => setF({ ...f, baseRate: e.target.value })} />
              {errors.baseRate && <div className="invalid-feedback">{errors.baseRate}</div>}
              <div className="form-text">Applies to every sale. Tier bonuses are added on top.</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">Team lead split</div>
            <div className="card-body">
              <div className="d-flex gap-3 mb-2">
                {[['percentage', 'Percentage of commission'], ['flat', 'Flat amount per sale']].map(([v, l]) => (
                  <div className="form-check" key={v}>
                    <input className="form-check-input" type="radio" id={`sp-${v}`} name="split" checked={f.split.type === v} disabled={!editable} onChange={() => setF({ ...f, split: { ...f.split, type: v } })} />
                    <label className="form-check-label small" htmlFor={`sp-${v}`}>{l}</label>
                  </div>
                ))}
              </div>
              <div className="input-group">
                {f.split.type === 'flat' && <span className="input-group-text">฿</span>}
                <input type="number" min="0" aria-label="Split value" className={`form-control ${errors.split ? 'is-invalid' : ''}`} value={f.split.value} disabled={!editable} onChange={(e) => setF({ ...f, split: { ...f.split, value: e.target.value } })} />
                {f.split.type === 'percentage' && <span className="input-group-text">%</span>}
              </div>
              {errors.split && <div className="text-danger small mt-1">{errors.split}</div>}
              <div className="form-text">Deducted from the agent's commission and paid to their team lead.</div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center gap-2">
              <span>Commission tiers</span>
              <div className="d-flex align-items-center gap-2 fw-normal small">
                <label htmlFor="cr-period" className="text-muted">Tier based on sales in the last</label>
                <select id="cr-period" className="form-select form-select-sm" style={{ width: 'auto' }} value={f.tierPeriodMonths} disabled={!editable} onChange={(e) => setF({ ...f, tierPeriodMonths: e.target.value })}>
                  {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Tier name</th><th>Sales from (฿)</th><th>Bonus (%)</th><th className="text-end">Total rate</th>{editable && <th />}</tr></thead>
                <tbody>
                  {f.tiers.map((t, i) => (
                    <tr key={t.id}>
                      <td><input aria-label={`Tier ${i + 1} name`} className={`form-control form-control-sm ${te(i, 'name') ? 'is-invalid' : ''}`} value={t.name} disabled={!editable} onChange={(e) => setTier(i, 'name', e.target.value)} />{te(i, 'name') && <div className="invalid-feedback">{te(i, 'name')}</div>}</td>
                      <td><input aria-label={`Tier ${i + 1} minimum sales`} type="number" min="0" step="1000000" className={`form-control form-control-sm ${te(i, 'minSales') ? 'is-invalid' : ''}`} value={t.minSales} disabled={!editable || i === 0} onChange={(e) => setTier(i, 'minSales', e.target.value)} />{te(i, 'minSales') && <div className="invalid-feedback">{te(i, 'minSales')}</div>}</td>
                      <td><input aria-label={`Tier ${i + 1} bonus`} type="number" min="0" step="0.1" className={`form-control form-control-sm ${te(i, 'bonus') ? 'is-invalid' : ''}`} value={t.bonus} disabled={!editable} onChange={(e) => setTier(i, 'bonus', e.target.value)} />{te(i, 'bonus') && <div className="invalid-feedback">{te(i, 'bonus')}</div>}</td>
                      <td className="text-end fw-semibold">{(Number(f.baseRate || 0) + Number(t.bonus || 0)).toFixed(1)}%</td>
                      {editable && <td className="text-end"><button className="btn btn-sm btn-light" disabled={f.tiers.length <= 3} onClick={() => removeTier(i)} aria-label={`Remove ${t.name}`} title={f.tiers.length <= 3 ? 'At least 3 tiers are required' : 'Remove tier'}><i className="bi bi-trash" /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-body border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
              <small className={errors.tierCount ? 'text-danger' : 'text-muted'}>{errors.tierCount || `Example: a ${fmtMoney(5_000_000)} sale in ${f.tiers[1]?.name || 'Tier 2'} earns ${fmtMoney(Math.round(5_000_000 * (Number(f.baseRate || 0) + Number(f.tiers[1]?.bonus || 0)) / 100))} before the split.`}</small>
              {editable && <button className="btn btn-sm btn-outline-primary" onClick={addTier}><i className="bi bi-plus-lg me-1" />Add tier</button>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
