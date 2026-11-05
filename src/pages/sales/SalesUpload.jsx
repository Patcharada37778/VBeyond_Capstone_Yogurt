import { useRef, useState } from 'react';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, Select, StatCard, TONES } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { ConfirmModal } from '../../components/modals/Modal';
import { calcCommission, monthKey, monthLabel, periodSales, recentMonths, tierFor } from '../../utils/commission';
import { readSheet, toDate } from '../../utils/spreadsheet';
import { fileSize, fmtDate, fmtDateTime, fmtMoney, fullName } from '../../utils/format';

const MAX_SIZE = 5 * 1024 * 1024;
const COLUMNS = [
  { key: 'agentId', label: 'Agent ID' },
  { key: 'project', label: 'Project' },
  { key: 'unit', label: 'Unit' },
  { key: 'saleValue', label: 'Sale Value' },
  { key: 'closedAt', label: 'Closing Date' },
];
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

function downloadTemplate(month, agents) {
  const ids = agents.filter((a) => a.status === 'Active' && a.teamId).slice(0, 2).map((a) => a.id);
  const csv = [COLUMNS.map((c) => c.label).join(','), `${ids[0]},Sukhumvit 77 Skyline,A-1203,3950000,${month}-05`, `${ids[1]},Bangna Park Townhome,T-08,4890000,${month}-18`].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `sales-template-${month}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

/** Validates the sheet and calculates commission for each row from the current rules. */
function buildPreview(sheet, month, state) {
  const [header = [], ...data] = sheet;
  const idx = Object.fromEntries(COLUMNS.map((c) => [c.key, header.findIndex((h) => norm(h) === norm(c.label))]));
  const missing = COLUMNS.filter((c) => idx[c.key] < 0).map((c) => c.label);
  if (missing.length) return { fileError: `Wrong columns. Missing: ${missing.join(', ')}. Use the template.` };
  if (!data.length) return { fileError: 'The file has no sales rows.' };

  const rules = state.commissionRules;
  const seen = new Set();
  const rows = data.map((r, i) => {
    const get = (k) => r[idx[k]] || '';
    const agent = state.agents.find((a) => a.id.toLowerCase() === get('agentId').toLowerCase());
    const saleValue = Number(get('saleValue').replace(/[,฿\s]/g, ''));
    const date = toDate(get('closedAt'));
    const errors = [];
    if (!agent) errors.push(`Unknown agent ID "${get('agentId')}"`);
    if (!get('project')) errors.push('Project is empty');
    if (!get('unit')) errors.push('Unit is empty');
    if (!saleValue || saleValue <= 0) errors.push('Sale value must be a positive number');
    if (!date) errors.push('Closing date is not a valid date');
    else if (monthKey(date.toISOString()) !== month) errors.push(`Closing date is not in ${monthLabel(month)}`);
    const key = `${get('project')}|${get('unit')}`.toLowerCase();
    if (seen.has(key)) errors.push('Duplicate unit in this file');
    seen.add(key);
    return { id: `row-${i}`, line: i + 2, agent, project: get('project'), unit: get('unit'), saleValue, closedAt: date?.toISOString(), errors };
  });

  // Tier = sales in the tier period, with this month's records replaced by the uploaded rows.
  const others = state.commissions.filter((c) => monthKey(c.closedAt) !== month);
  const uploaded = rows.filter((r) => !r.errors.length).map((r) => ({ agentId: r.agent.id, saleValue: r.saleValue, closedAt: r.closedAt }));
  const ledger = [...others, ...uploaded];
  rows.forEach((r) => {
    if (r.errors.length) return;
    const team = state.teams.find((t) => t.id === r.agent.teamId);
    const t = tierFor(periodSales(ledger, r.agent.id, rules, month), rules);
    r.tier = t.tier.name;
    r.rate = t.rate;
    Object.assign(r, calcCommission(r.saleValue, t.rate, rules, !!team?.leadId && team.leadId !== r.agent.id));
    r.leadId = team?.leadId !== r.agent.id ? team?.leadId : null;
  });
  return { rows, replaced: state.commissions.filter((c) => monthKey(c.closedAt) === month).length };
}

/** Monthly sales upload (BO-SC-03): choose month, upload, validate, preview, publish. */
export default function SalesUpload() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const months = recentMonths(12);
  const [month, setMonth] = useState(months[1]);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const input = useRef(null);
  const canPublish = can('salesUpload', 'approve');

  const load = async (f, m = month) => {
    setFile(f);
    setResult(null);
    if (!f) return;
    if (!/\.(xlsx|csv)$/i.test(f.name)) { setResult({ fileError: 'Unsupported file type. Upload an Excel (.xlsx) or CSV file.' }); return; }
    if (f.size > MAX_SIZE) { setResult({ fileError: `The file is too large (${fileSize(f.size)}). The limit is 5 MB.` }); return; }
    if (!f.size) { setResult({ fileError: 'The file is empty.' }); return; }
    setBusy(true);
    try {
      setResult(buildPreview(await readSheet(f), m, state));
    } catch {
      setResult({ fileError: 'The file could not be read. Make sure it is a valid Excel or CSV file.' });
    }
    setBusy(false);
  };
  const changeMonth = (m) => { setMonth(m); if (file) load(file, m); };
  const reset = () => { setFile(null); setResult(null); };

  const rows = result?.rows || [];
  const bad = rows.filter((r) => r.errors.length);
  const good = rows.filter((r) => !r.errors.length);
  const sum = (k) => good.reduce((t, r) => t + r[k], 0);

  const publish = () => {
    const uploadId = `UP-${String(state.counters.upload || 1).padStart(3, '0')}`;
    mutate((d) => {
      d.counters.upload = (d.counters.upload || 1) + 1;
      d.commissions = d.commissions.filter((c) => monthKey(c.closedAt) !== month);
      good.forEach((r, i) => d.commissions.push({
        id: `CM-${uploadId}-${i + 1}`, agentId: r.agent.id, project: r.project, unit: r.unit, saleValue: r.saleValue,
        rate: r.rate / 100, gross: r.gross, split: r.split, amount: r.amount, leadId: r.leadId, closedAt: r.closedAt, status: 'Processing', uploadId,
      }));
      d.salesUploads.unshift({ id: uploadId, month, fileName: file.name, rows: good.length, totalSales: sum('saleValue'), totalCommission: sum('gross'), publishedAt: new Date().toISOString(), by: user.name });
      const agentIds = [...new Set(good.map((r) => r.agent.id))];
      notify(d, agentIds.map((id) => `agent:${id}`), { category: 'Commission updates', title: `Your sales for ${monthLabel(month)} are published`, body: 'Check your updated commission statement.', link: '/commission' });
      const leads = [...new Set(good.map((r) => d.teams.find((t) => t.id === r.agent.teamId)?.leadId).filter(Boolean))];
      notify(d, leads.map((id) => `agent:${id}`), { category: 'Commission updates', title: `Team sales for ${monthLabel(month)} are published`, body: 'See how your team performed.', link: '/team/sales' });
      logAction(d, user, `Published sales for ${monthLabel(month)}`, `${uploadId} · ${file.name}`);
    });
    setConfirm(false);
    reset();
    toast(`${good.length} sales published to agent and team dashboards.`, 'success', `${monthLabel(month)} published`);
  };

  return (
    <>
      <PageHeader title="Monthly Sales Upload" subtitle="Upload the month's closed sales. Commission is calculated from the current rules."
        crumbs={[{ label: 'Sales & Commission' }, { label: 'Monthly Sales Upload' }]} />

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-3 align-items-end">
          <div>
            <div className="form-label">Sales month</div>
            <Select value={month} onChange={changeMonth} label="Sales month" options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
          </div>
          <div className="flex-grow-1" style={{ minWidth: 240 }}>
            <label className="form-label" htmlFor="su-file">Sales file</label>
            <div className="doc-tile">
              <div className="doc-icon"><i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" /></div>
              <div className="flex-grow-1 text-truncate">
                {file ? <><div className="fw-medium text-truncate">{file.name}</div><small className="text-muted">{fileSize(file.size)}</small></> : <small className="text-muted">Excel (.xlsx) or CSV · max 5 MB</small>}
              </div>
              <input ref={input} id="su-file" type="file" className="d-none" accept=".xlsx,.csv" onChange={(e) => { load(e.target.files?.[0] || null); e.target.value = ''; }} />
              <button className="btn btn-sm btn-outline-primary" onClick={() => input.current?.click()}>{file ? 'Replace' : 'Choose file'}</button>
              {file && <button className="btn btn-sm btn-light" aria-label="Remove file" onClick={reset}><i className="bi bi-x-lg" /></button>}
            </div>
          </div>
          <button className="btn btn-light" onClick={() => downloadTemplate(month, state.agents)}><i className="bi bi-download me-1" aria-hidden="true" />Download template</button>
        </div>
        <div className="card-footer bg-white small text-muted">Required columns: {COLUMNS.map((c) => c.label).join(', ')}.</div>
      </div>

      {busy && <div className="card mb-3"><div className="card-body text-muted small">Reading file…</div></div>}
      {result?.fileError && <div className="alert alert-danger" role="alert"><i className="bi bi-x-circle me-2" aria-hidden="true" />{result.fileError}</div>}

      {rows.length > 0 && <>
        <div className="row g-3 mb-3">
          <div className="col-6 col-xl-3"><StatCard icon="bi-list-check" label="Valid rows" value={`${good.length} / ${rows.length}`} tone={bad.length ? TONES.amber : TONES.green} /></div>
          <div className="col-6 col-xl-3"><StatCard icon="bi-cash-stack" label="Total sales" value={fmtMoney(sum('saleValue'))} /></div>
          <div className="col-6 col-xl-3"><StatCard icon="bi-cash-coin" label="Total commission" value={fmtMoney(sum('gross'))} tone={TONES.blue} /></div>
          <div className="col-6 col-xl-3"><StatCard icon="bi-people" label="Agents" value={new Set(good.map((r) => r.agent.id)).size} tone={TONES.gray} /></div>
        </div>
        {bad.length > 0 && <div className="alert alert-warning"><i className="bi bi-exclamation-triangle me-2" aria-hidden="true" /><strong>{bad.length} row{bad.length > 1 ? 's have' : ' has'} errors.</strong> Fix the file and upload it again before publishing.</div>}
        <div className="card mb-3">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>Preview · {monthLabel(month)}</span>
            {canPublish && <button className="btn btn-primary" disabled={!!bad.length || !good.length} onClick={() => setConfirm(true)}>Publish to dashboards</button>}
          </div>
          <DataTable rows={rows} pageSize={15} initialSort={bad.length ? { key: 'status', dir: 'asc' } : undefined}
            rowClassName={(r) => (r.errors.length ? 'table-danger' : '')}
            columns={[
              { key: 'line', label: 'Row' },
              { key: 'agent', label: 'Agent', sortValue: (r) => r.agent ? fullName(r.agent) : '', render: (r) => r.agent ? <div className="lh-sm"><div>{fullName(r.agent)}</div><small className="text-muted">{r.agent.id}</small></div> : '—' },
              { key: 'project', label: 'Project / unit', render: (r) => <div className="lh-sm"><div>{r.project || '—'}</div><small className="text-muted">{r.unit || '—'}</small></div> },
              { key: 'closedAt', label: 'Closed', render: (r) => fmtDate(r.closedAt) },
              { key: 'saleValue', label: 'Sale value', className: 'text-end', render: (r) => (r.saleValue ? fmtMoney(r.saleValue) : '—') },
              { key: 'tier', label: 'Tier', render: (r) => r.tier ? `${r.tier} · ${r.rate.toFixed(1)}%` : '—' },
              { key: 'gross', label: 'Commission', className: 'text-end', render: (r) => (r.gross != null ? fmtMoney(r.gross) : '—') },
              { key: 'split', label: 'Team lead split', className: 'text-end', render: (r) => (r.split != null ? fmtMoney(r.split) : '—') },
              { key: 'status', label: 'Check', sortValue: (r) => (r.errors.length ? 0 : 1), render: (r) => r.errors.length ? <small className="text-danger">{r.errors.join('; ')}</small> : <span className="text-green"><i className="bi bi-check-circle-fill" aria-label="Valid" /></span> },
            ]} />
        </div>
      </>}

      <div className="card">
        <div className="card-header">Upload history</div>
        {state.salesUploads.length ? (
          <DataTable rows={state.salesUploads} columns={[
            { key: 'month', label: 'Month', render: (u) => monthLabel(u.month) },
            { key: 'fileName', label: 'File' },
            { key: 'rows', label: 'Sales', className: 'text-end' },
            { key: 'totalSales', label: 'Total sales', className: 'text-end', render: (u) => fmtMoney(u.totalSales) },
            { key: 'totalCommission', label: 'Commission', className: 'text-end', render: (u) => fmtMoney(u.totalCommission) },
            { key: 'publishedAt', label: 'Published', render: (u) => <div className="lh-sm"><div>{fmtDateTime(u.publishedAt)}</div><small className="text-muted">{u.by}</small></div> },
          ]} />
        ) : <EmptyState icon="bi-clock-history" title="No uploads yet">Published monthly uploads appear here.</EmptyState>}
      </div>

      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={publish} title={`Publish ${monthLabel(month)}`} confirmLabel="Publish">
        <p><strong>{good.length}</strong> sales totalling <strong>{fmtMoney(sum('saleValue'))}</strong> will be published.</p>
        <ul className="small mb-0">
          {result?.replaced > 0 && <li>{result.replaced} existing sales record{result.replaced > 1 ? 's' : ''} for {monthLabel(month)} will be replaced.</li>}
          <li>Agents and team leads will see the new figures on their dashboards and be notified.</li>
        </ul>
      </ConfirmModal>
    </>
  );
}
