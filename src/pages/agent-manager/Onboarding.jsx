import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, EmptyState, PageHeader, SearchInput } from '../../components/common';
import { ConfirmModal } from '../../components/modals/Modal';
import { onboardAgent } from '../../services/agentLifecycle';
import { fmtDate, fullName } from '../../utils/format';

export default function Onboarding() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const pending = state.agents.filter((a) => !a.teamId && a.status === 'Active');
  const recent = state.agents.filter((a) => a.teamId && a.onboardedAt && (Date.now() - new Date(a.onboardedAt)) < 30 * 86400000 && a.teamHistory.length === 1).sort((a, b) => new Date(b.onboardedAt) - new Date(a.onboardedAt));
  const selected = pending.find((a) => a.id === params.get('agent')) || null;
  const app = state.applications.find((x) => x.agentId === selected?.id);
  const invitedTeamId = selected?.preferredTeamId || app?.preferredTeamId || '';
  const [form, setForm] = useState({ teamId: '', reportsTo: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [lastSel, setLastSel] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const canOnboard = can('onboarding', 'edit') || can('onboarding', 'approve');

  if (selected && selected.id !== lastSel) {
    setLastSel(selected.id);
    const t = state.teams.find((x) => x.id === invitedTeamId);
    setForm({ teamId: invitedTeamId, reportsTo: t?.leadId || '', date: new Date().toISOString().slice(0, 10), notes: '' });
    setErrors({});
  }
  const team = state.teams.find((t) => t.id === form.teamId);
  const teamMembers = state.agents.filter((a) => a.teamId === form.teamId && a.status === 'Active');
  const list = pending.filter((a) => !q || `${fullName(a)} ${a.id} ${a.email}`.toLowerCase().includes(q.toLowerCase()));

  const review = () => {
    const e = {};
    if (!form.teamId) e.teamId = 'Select a team.';
    if (!form.reportsTo) e.reportsTo = 'Select the team lead the agent will report to.';
    if (!form.date) e.date = 'Set the onboarding date.';
    setErrors(e);
    if (!Object.keys(e).length) setConfirm(true);
  };
  const doOnboard = () => {
    mutate((d) => onboardAgent(d, user, selected.id, { teamId: form.teamId, onboardDate: form.date, notes: form.notes.trim(), reportsTo: form.reportsTo }));
    toast(`${fullName(selected)} onboarded to ${team.name}. The agent and team lead were notified.`, 'success', 'Onboarding complete');
    setConfirm(false);
    setParams({});
  };

  return (
    <>
      <PageHeader title="Onboarding Agents to Teams" subtitle="Assign newly approved agents to a team and team lead." crumbs={[{ label: 'Agent Team Management' }, { label: 'Onboarding' }]} />
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header d-flex justify-content-between"><span>Approved agents awaiting a team</span><span className="badge text-bg-light border">{pending.length}</span></div>
            <div className="p-2 border-bottom"><SearchInput value={q} onChange={setQ} placeholder="Search approved agents" /></div>
            <div className="list-group list-group-flush">
              {list.map((a) => {
                const pref = state.teams.find((t) => t.id === (a.preferredTeamId || state.applications.find((x) => x.agentId === a.id)?.preferredTeamId));
                return (
                  <button key={a.id} className={`list-group-item list-group-item-action d-flex gap-2 align-items-center ${selected?.id === a.id ? 'active' : ''}`} onClick={() => setParams({ agent: a.id })}>
                    <Avatar name={fullName(a)} color={a.avatarColor} size={34} />
                    <div className="lh-sm flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-medium text-truncate">{fullName(a)}</div>
                      <small className="opacity-75">{a.id} · approved {fmtDate(a.registeredAt)}{pref ? ` · invited to ${pref.name}` : ''}</small>
                    </div>
                  </button>
                );
              })}
            </div>
            {!list.length && <EmptyState icon="bi-person-check" title="No agents waiting">Approved applicants appear here until they're onboarded.</EmptyState>}
          </div>
        </div>
        <div className="col-lg-8">
          {selected ? (
            <div className="card">
              <div className="card-header">Onboard {fullName(selected)}</div>
              <div className="card-body">
                <div className="d-flex gap-3 align-items-center mb-3 p-3 rounded bg-brand-soft">
                  <Avatar name={fullName(selected)} color={selected.avatarColor} size={52} />
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{fullName(selected)} <small className="text-muted">· {selected.id}</small></div>
                    <div className="small text-muted">{selected.email} · {selected.phone}</div>
                    <div className="small text-muted">{selected.experience}</div>
                  </div>
                  <Link to={`/agents/${selected.id}`} className="btn btn-sm btn-light">View details</Link>
                </div>
                {!selected.activated && <div className="alert alert-light border small"><i className="bi bi-info-circle me-1" />This agent hasn't completed first login yet. You can still onboard them now.</div>}
                {invitedTeamId && <div className="alert alert-brand small"><i className="bi bi-envelope-paper me-1" />Invited by a team lead and pre-assigned to <strong>{state.teams.find((t) => t.id === invitedTeamId)?.name}</strong>.</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label required" htmlFor="ob-t">Team</label>
                    <select id="ob-t" className={`form-select ${errors.teamId ? 'is-invalid' : ''}`} value={form.teamId} onChange={(e) => { const t = state.teams.find((x) => x.id === e.target.value); setForm({ ...form, teamId: e.target.value, reportsTo: t?.leadId || '' }); }}>
                      <option value="">Select a team…</option>
                      {state.teams.map((t) => <option key={t.id} value={t.id}>{t.name} — {state.agents.filter((a) => a.teamId === t.id && a.status === 'Active').length} active</option>)}
                    </select>
                    {errors.teamId && <div className="invalid-feedback">{errors.teamId}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label required" htmlFor="ob-l">Team lead (reports to)</label>
                    <select id="ob-l" className={`form-select ${errors.reportsTo ? 'is-invalid' : ''}`} value={form.reportsTo} onChange={(e) => setForm({ ...form, reportsTo: e.target.value })} disabled={!form.teamId}>
                      <option value="">Select…</option>
                      {teamMembers.map((a) => <option key={a.id} value={a.id}>{fullName(a)}{team?.leadId === a.id ? ' (team lead)' : ''}</option>)}
                    </select>
                    {errors.reportsTo && <div className="invalid-feedback">{errors.reportsTo}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label required" htmlFor="ob-d">Onboarding date</label>
                    <input id="ob-d" type="date" className={`form-control ${errors.date ? 'is-invalid' : ''}`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="ob-n">Internal notes</label>
                    <textarea id="ob-n" rows={3} className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Visible to back-office staff only" />
                  </div>
                </div>
              </div>
              <div className="card-footer bg-white d-flex justify-content-end gap-2">
                <button className="btn btn-light" onClick={() => setParams({})}>Cancel</button>
                <button className="btn btn-primary" onClick={review} disabled={!canOnboard}><i className="bi bi-person-check me-1" />Confirm onboarding</button>
              </div>
            </div>
          ) : <div className="card"><EmptyState icon="bi-person-plus" title="Select an approved agent">Choose an agent from the list to assign a team.</EmptyState></div>}

          <div className="card mt-3">
            <div className="card-header">Recently onboarded (30 days)</div>
            <div className="list-group list-group-flush">
              {recent.map((a) => <Link key={a.id} to={`/agents/${a.id}`} className="list-group-item list-group-item-action d-flex justify-content-between"><span>{fullName(a)} <small className="text-muted">{a.id}</small></span><small className="text-muted">{state.teams.find((t) => t.id === a.teamId)?.name} · {fmtDate(a.onboardedAt)}</small></Link>)}
              {!recent.length && <div className="list-group-item small text-muted">No agents onboarded in the last 30 days.</div>}
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={doOnboard} title="Confirm onboarding" confirmLabel="Onboard agent">
        {selected && team && <>
          <p><strong>{fullName(selected)}</strong> ({selected.id}) will join <strong>{team.name}</strong> on {fmtDate(form.date)}, reporting to <strong>{fullName(state.agents.find((a) => a.id === form.reportsTo))}</strong>.</p>
          <ul className="small mb-0"><li>The agent's profile will show the new team.</li><li>The agent and the team lead will be notified.</li></ul>
        </>}
      </ConfirmModal>
    </>
  );
}
