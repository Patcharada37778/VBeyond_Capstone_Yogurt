import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, EmptyState, PageHeader, SearchInput, Select, StatusBadge } from '../../components/common';
import { ConfirmModal } from '../../components/modals/Modal';
import { AGENT_STATUSES, applyStatusChange, statusConsequences } from '../../services/agentLifecycle';
import { fmtDate, fmtDateTime, fmtMoney, fullName } from '../../utils/format';

const STATUS_HELP = {
  Active: 'Restore eligible access (reactivation).',
  Suspended: 'Temporarily block restricted functions, e.g. during an investigation.',
  Expired: 'Membership lapsed without renewal.',
  Resigned: 'Agent has left VBEYOND.',
};

export default function AgentStatus() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const agentId = params.get('agent');
  const agent = state.agents.find((a) => a.id === agentId);
  const blank = { status: '', reason: '', date: new Date().toISOString().slice(0, 10), notes: '', reassignTo: '', teamId: '' };
  const [form, setForm] = useState(blank);
  const [lastAgent, setLastAgent] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const canChange = can('agentStatus', 'edit') || can('agentStatus', 'approve');

  if (agentId !== lastAgent) { setLastAgent(agentId); setForm(blank); setErrors({}); }

  const list = state.agents.filter((a) => a.activated !== false || a.migrated).filter((a) => (filter === 'All' || a.status === filter) && (!q || `${fullName(a)} ${a.id}`.toLowerCase().includes(q.toLowerCase())));
  const deals = agent ? state.deals.filter((d) => d.agentId === agent.id) : [];
  const consequences = agent && form.status ? statusConsequences(agent, form.status, state) : [];
  const team = state.teams.find((t) => t.id === agent?.teamId);
  const reassignOptions = state.agents.filter((a) => a.status === 'Active' && a.id !== agent?.id && a.teamId);
  const recent = state.logs.filter((l) => l.action === 'Changed agent status').slice(0, 8);

  const review = () => {
    const e = {};
    if (!form.status) e.status = 'Choose the new status.';
    if (form.reason.trim().length < 5) e.reason = 'Enter the reason for this change.';
    if (!form.date) e.date = 'Set an effective date.';
    if (form.status === 'Resigned' && deals.length && !form.reassignTo) e.reassignTo = 'Select who will take over the outstanding deals.';
    setErrors(e);
    if (!Object.keys(e).length) setConfirm(true);
  };
  const apply = () => {
    mutate((d) => applyStatusChange(d, user, agent.id, form.status, { reason: form.reason.trim(), effectiveDate: form.date, notes: form.notes.trim(), reassignTo: form.reassignTo, teamId: form.teamId }));
    toast(`${fullName(agent)} is now ${form.status}.`, 'success', 'Status updated');
    setConfirm(false); setForm(blank);
  };

  return (
    <>
      <PageHeader title="Agent Status Management" subtitle="Change agent status and review the consequences before confirming." crumbs={[{ label: 'Agent Team Management' }, { label: 'Agent Status' }]} />
      <div className="row g-3 mb-3">
        {AGENT_STATUSES.map((s) => (
          <div className="col-6 col-md-3" key={s}><button className={`card w-100 text-start ${filter === s ? 'border-primary' : ''}`} onClick={() => setFilter(filter === s ? 'All' : s)}>
            <div className="card-body d-flex justify-content-between align-items-center"><div><div className="stat-value font-brand fs-4">{state.agents.filter((a) => a.status === s).length}</div><div className="small text-muted">{s}</div></div><StatusBadge status={s} /></div>
          </button></div>
        ))}
      </div>
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">Select an agent</div>
            <div className="p-2 border-bottom d-flex gap-2"><SearchInput value={q} onChange={setQ} placeholder="Search agents" className="flex-grow-1" />
              <Select value={filter} onChange={setFilter} label="Status filter" options={['All', ...AGENT_STATUSES]} /></div>
            <div className="list-group list-group-flush" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {list.map((a) => (
                <button key={a.id} className={`list-group-item list-group-item-action d-flex gap-2 align-items-center ${a.id === agentId ? 'active' : ''}`} onClick={() => setParams({ agent: a.id })}>
                  <Avatar name={fullName(a)} color={a.avatarColor} photo={a.photo} size={30} />
                  <span className="flex-grow-1 text-truncate">{fullName(a)} <small className="opacity-75">{a.id}</small></span>
                  <StatusBadge status={a.status} />
                </button>
              ))}
              {!list.length && <div className="p-3 small text-muted">No agents match.</div>}
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          {agent ? (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Change status — {fullName(agent)}</span>
                <Link to={`/agents/${agent.id}`} className="small">View agent record</Link>
              </div>
              <div className="card-body">
                <dl className="dl-grid mb-3">
                  <div><dt>Current status</dt><dd><StatusBadge status={agent.status} /></dd></div>
                  <div><dt>Team</dt><dd>{team?.name || 'No team'}</dd></div>
                  <div><dt>Membership expiry</dt><dd>{fmtDate(agent.membershipExpiry)}</dd></div>
                  <div><dt>Open deals</dt><dd>{deals.length}</dd></div>
                </dl>
                <label className="form-label required">New status</label>
                <div className="row g-2 mb-1">
                  {AGENT_STATUSES.map((s) => {
                    const label = s === 'Active' && agent.status !== 'Active' ? 'Reactivate (Active)' : s;
                    const disabled = s === agent.status;
                    return (
                      <div className="col-sm-6" key={s}>
                        <label className={`border rounded p-2 d-flex gap-2 h-100 ${form.status === s ? 'border-primary bg-brand-soft' : ''} ${disabled ? 'opacity-50' : ''}`} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
                          <input type="radio" className="form-check-input mt-1" name="ns" disabled={disabled || !canChange} checked={form.status === s} onChange={() => setForm({ ...form, status: s })} />
                          <span><span className="fw-semibold d-block">{label}{disabled ? ' (current)' : ''}</span><small className="text-muted">{STATUS_HELP[s]}</small></span>
                        </label>
                      </div>
                    );
                  })}
                </div>
                {errors.status && <div className="text-danger small">{errors.status}</div>}

                {form.status && (
                  <div className="border border-warning rounded p-3 my-3 bg-warning-subtle">
                    <div className="fw-semibold mb-2"><i className="bi bi-exclamation-triangle me-1" />What will happen</div>
                    <ul className="small mb-0">{consequences.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    {deals.length > 0 && (
                      <div className="table-responsive mt-2"><table className="table table-sm small mb-0 bg-white">
                        <thead><tr><th>Deal</th><th>Project</th><th>Stage</th><th>Value</th></tr></thead>
                        <tbody>{deals.map((d) => <tr key={d.id}><td>{d.id}</td><td>{d.project} · {d.unit}</td><td>{d.stage}</td><td>{fmtMoney(d.value)}</td></tr>)}</tbody>
                      </table></div>
                    )}
                  </div>
                )}

                <div className="row g-3">
                  {form.status === 'Resigned' && deals.length > 0 && (
                    <div className="col-12">
                      <label className="form-label required" htmlFor="as-ra">Reassign outstanding deals to</label>
                      <select id="as-ra" className={`form-select ${errors.reassignTo ? 'is-invalid' : ''}`} value={form.reassignTo} onChange={(e) => setForm({ ...form, reassignTo: e.target.value })}>
                        <option value="">Select an active agent…</option>
                        {reassignOptions.map((a) => <option key={a.id} value={a.id}>{fullName(a)} — {state.teams.find((t) => t.id === a.teamId)?.name}{a.teamId === agent.teamId ? ' (same team)' : ''}</option>)}
                      </select>
                      {errors.reassignTo && <div className="invalid-feedback">{errors.reassignTo}</div>}
                    </div>
                  )}
                  {form.status === 'Active' && !agent.teamId && (
                    <div className="col-12">
                      <label className="form-label" htmlFor="as-t">Reassign to team</label>
                      <select id="as-t" className="form-select" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
                        <option value="">Leave unassigned (onboard later)</option>
                        {state.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="col-md-8">
                    <label className="form-label required" htmlFor="as-r">Reason</label>
                    <input id="as-r" className={`form-control ${errors.reason ? 'is-invalid' : ''}`} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Customer complaint under investigation" />
                    {errors.reason && <div className="invalid-feedback">{errors.reason}</div>}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label required" htmlFor="as-d">Effective date</label>
                    <input id="as-d" type="date" className={`form-control ${errors.date ? 'is-invalid' : ''}`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="as-n">Internal notes</label>
                    <textarea id="as-n" rows={2} className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="card-footer bg-white d-flex justify-content-end gap-2">
                <button className="btn btn-light" onClick={() => setParams({})}>Cancel</button>
                <button className="btn btn-primary" disabled={!canChange} onClick={review}>Review change</button>
              </div>
            </div>
          ) : <div className="card"><EmptyState icon="bi-toggles" title="Select an agent to change their status" /></div>}

          <div className="card mt-3">
            <div className="card-header">Recent status changes</div>
            <div className="list-group list-group-flush">
              {recent.map((l) => <div key={l.id} className="list-group-item small d-flex justify-content-between gap-2"><span>{l.target}</span><span className="text-muted text-nowrap">{l.actor} · {fmtDateTime(l.at)}</span></div>)}
              {!recent.length && <div className="list-group-item small text-muted">No changes yet.</div>}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={apply} title={`Change status to ${form.status}?`} confirmLabel="Confirm status change" variant={form.status === 'Active' ? 'success' : 'danger'}>
        {agent && <>
          <p><strong>{fullName(agent)}</strong>: <StatusBadge status={agent.status} /> → <StatusBadge status={form.status} /> effective {fmtDate(form.date)}</p>
          <ul className="small">{consequences.map((c, i) => <li key={i}>{c}</li>)}</ul>
          {form.reassignTo && <p className="small mb-0">Deals will be reassigned to <strong>{fullName(state.agents.find((a) => a.id === form.reassignTo))}</strong>.</p>}
        </>}
      </ConfirmModal>
    </>
  );
}
