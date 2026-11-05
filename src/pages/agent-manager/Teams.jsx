import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, EmptyState, PageHeader, SearchInput, StatusBadge, Tabs } from '../../components/common';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { AgentProfileModal, OrgChart } from '../../components/dashboard/AgentShared';
import { changeTeamLead, transferAgent } from '../../services/agentLifecycle';
import OnboardingPanel from './Onboarding';
import { fmtDate, fmtDateTime, fullName } from '../../utils/format';

function TeamCard({ team, agents, onChangeLead, canEdit }) {
  const members = agents.filter((a) => a.teamId === team.id);
  const lead = agents.find((a) => a.id === team.leadId);
  const active = members.filter((a) => a.status === 'Active').length;
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div><h3 className="h6 mb-0 font-brand">{team.name}</h3><small className="text-muted">{team.region}</small></div>
          <span className="badge text-bg-light border">{members.length} agents</span>
        </div>
        <div className="small text-muted mt-1">{team.focus}</div>
        <div className="d-flex align-items-center gap-2 mt-3 p-2 rounded bg-brand-soft">
          {lead ? <><Avatar name={fullName(lead)} color={lead.avatarColor} photo={lead.photo} size={34} /><div className="lh-sm flex-grow-1"><div className="fw-semibold small">{fullName(lead)}</div><small className="text-muted">Team lead · {lead.id}</small></div></>
            : <div className="small text-danger flex-grow-1"><i className="bi bi-exclamation-triangle me-1" />No team lead assigned</div>}
          {canEdit && <button className="btn btn-sm btn-light" onClick={() => onChangeLead(team)}>Change</button>}
        </div>
        <div className="mt-3">
          <div className="d-flex justify-content-between small mb-1"><span>Active members</span><span>{active}/{members.length}</span></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${members.length ? (active / members.length) * 100 : 0}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

export default function Teams() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const canEdit = can('teams', 'edit');
  const canApprove = can('teams', 'approve');
  const tab = params.get('tab') || (params.get('transfer') ? 'transfer' : 'structure');
  const setTab = (t) => setParams({ tab: t });
  const unassigned = state.agents.filter((a) => !a.teamId && a.status === 'Active');
  const [selected, setSelected] = useState(null);

  // transfer wizard state
  const [tq, setTq] = useState('');
  const [tAgent, setTAgent] = useState(params.get('transfer') || '');
  const [tTeam, setTTeam] = useState('');
  const [tReason, setTReason] = useState('');
  const [tErr, setTErr] = useState({});
  const [tConfirm, setTConfirm] = useState(false);

  // change lead state
  const [leadTeam, setLeadTeam] = useState(null);
  const [newLead, setNewLead] = useState('');
  const [leadConfirm, setLeadConfirm] = useState(false);

  const [decline, setDecline] = useState(null);

  const agentT = state.agents.find((a) => a.id === tAgent);
  const fromTeam = state.teams.find((t) => t.id === agentT?.teamId);
  const toTeam = state.teams.find((t) => t.id === tTeam);
  const candidates = state.agents.filter((a) => a.teamId && a.status !== 'Resigned' && (!tq || `${fullName(a)} ${a.id}`.toLowerCase().includes(tq.toLowerCase()))).slice(0, 8);

  const startTransfer = () => {
    const e = {};
    if (!agentT) e.agent = 'Select an agent.';
    if (!tTeam) e.team = 'Select the destination team.';
    else if (tTeam === agentT?.teamId) e.team = 'Destination must be different from the current team.';
    if (tReason.trim().length < 5) e.reason = 'Enter a reason for the transfer.';
    setTErr(e);
    if (!Object.keys(e).length) setTConfirm(true);
  };
  const doTransfer = () => {
    mutate((d) => transferAgent(d, user, tAgent, tTeam, tReason.trim()));
    toast(`${fullName(agentT)} transferred to ${toTeam.name}.`, 'success', 'Transfer complete');
    setTConfirm(false); setTAgent(''); setTTeam(''); setTReason(''); setParams({});
  };
  const doChangeLead = () => {
    const l = state.agents.find((a) => a.id === newLead);
    mutate((d) => changeTeamLead(d, user, leadTeam.id, newLead));
    toast(`${fullName(l)} is now the team lead of ${leadTeam.name}. Affected users were notified.`, 'success', 'Team lead changed');
    setLeadConfirm(false); setLeadTeam(null); setNewLead('');
  };
  const approveRequest = (r) => {
    mutate((d) => { transferAgent(d, user, r.agentId, r.toTeamId, r.reason); const x = d.transferRequests.find((y) => y.id === r.id); x.status = 'Approved'; x.decidedBy = user.name; x.decidedAt = new Date().toISOString(); });
    toast('Transfer request approved and the agent was moved.');
  };
  const declineRequest = () => {
    mutate((d) => { const x = d.transferRequests.find((y) => y.id === decline.id); x.status = 'Declined'; x.decidedBy = user.name; x.decidedAt = new Date().toISOString(); logAction(d, user, 'Declined transfer request', x.id); });
    toast('Transfer request declined.', 'info'); setDecline(null);
  };

  const pendingReq = state.transferRequests.filter((r) => r.status === 'Pending');
  const history = state.agents.flatMap((a) => a.teamHistory.filter((h) => h.reason?.startsWith('Transfer') || h.reason === 'Appointed team lead').map((h) => ({ ...h, agent: a }))).sort((a, b) => new Date(b.from) - new Date(a.from));

  return (
    <>
      <PageHeader title="Team Structure Management" subtitle="Manage teams, onboarding, team leads, transfers and hierarchy." crumbs={[{ label: 'Agent Team Management' }, { label: 'Team Management' }]}
        actions={canEdit && <button className="btn btn-primary" onClick={() => setTab('transfer')}><i className="bi bi-arrow-left-right me-1" />Transfer an agent</button>} />
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'structure', label: 'Teams' }, ...(can('onboarding', 'view') ? [{ key: 'onboarding', label: 'Unassigned / Onboarding', count: unassigned.length }] : []), { key: 'hierarchy', label: 'Hierarchy' }, ...(canEdit ? [{ key: 'transfer', label: 'Transfer agent' }] : []), { key: 'requests', label: 'Transfer requests', count: pendingReq.length }, { key: 'history', label: 'History' }]} />

      {tab === 'structure' && <div className="row g-3">{state.teams.map((t) => <div className="col-md-6 col-xl-3" key={t.id}><TeamCard team={t} agents={state.agents} canEdit={canEdit} onChangeLead={(team) => { setLeadTeam(team); setNewLead(''); }} /></div>)}</div>}

      {tab === 'onboarding' && can('onboarding', 'view') && <OnboardingPanel />}

      {tab === 'hierarchy' && <div className="card"><div className="card-body"><OrgChart teams={state.teams} agents={state.agents} onSelect={setSelected} /></div></div>}

      {tab === 'transfer' && canEdit && (
        <div className="card">
          <div className="card-body">
            <div className="row g-4">
              <div className="col-lg-5">
                <h3 className="h6">1. Select the agent</h3>
                <SearchInput value={tq} onChange={setTq} placeholder="Search agents" />
                <div className="list-group mt-2">
                  {(agentT && !candidates.includes(agentT) ? [agentT, ...candidates] : candidates).map((a) => (
                    <button key={a.id} className={`list-group-item list-group-item-action d-flex gap-2 align-items-center ${tAgent === a.id ? 'active' : ''}`} onClick={() => { setTAgent(a.id); setTErr({}); }}>
                      <Avatar name={fullName(a)} color={a.avatarColor} size={28} />
                      <span className="flex-grow-1">{fullName(a)} <small className="opacity-75">{a.id}</small></span>
                      <small className="opacity-75">{state.teams.find((t) => t.id === a.teamId)?.name}</small>
                    </button>
                  ))}
                </div>
                {tErr.agent && <div className="text-danger small mt-1">{tErr.agent}</div>}
              </div>
              <div className="col-lg-7">
                <h3 className="h6">2. Choose destination & review</h3>
                <div className="row g-2 align-items-stretch mb-3">
                  <div className="col-5"><div className="border rounded p-3 h-100"><div className="small-caps">Current team</div><div className="fw-semibold mt-1">{fromTeam?.name || '—'}</div><small className="text-muted">{fromTeam ? `Lead: ${fullName(state.agents.find((a) => a.id === fromTeam.leadId)) || '—'}` : 'Select an agent'}</small></div></div>
                  <div className="col-2 d-grid place-items-center text-center align-self-center"><i className="bi bi-arrow-right fs-3 text-brand" /></div>
                  <div className="col-5"><div className={`border rounded p-3 h-100 ${toTeam ? 'border-success bg-brand-soft' : ''}`}><div className="small-caps">New team</div><div className="fw-semibold mt-1">{toTeam?.name || '—'}</div><small className="text-muted">{toTeam ? `Lead: ${fullName(state.agents.find((a) => a.id === toTeam.leadId))}` : 'Select below'}</small></div></div>
                </div>
                <label className="form-label required" htmlFor="tr-t">Destination team</label>
                <select id="tr-t" className={`form-select ${tErr.team ? 'is-invalid' : ''}`} value={tTeam} onChange={(e) => setTTeam(e.target.value)}>
                  <option value="">Select a team…</option>
                  {state.teams.map((t) => <option key={t.id} value={t.id} disabled={t.id === agentT?.teamId}>{t.name}{t.id === agentT?.teamId ? ' (current)' : ''}</option>)}
                </select>
                {tErr.team && <div className="invalid-feedback">{tErr.team}</div>}
                {agentT && state.teams.some((t) => t.leadId === agentT.id) && <div className="alert alert-warning small mt-2 mb-0">{fullName(agentT)} is currently a team lead. Transferring will leave {fromTeam?.name} without a lead.</div>}
                <label className="form-label required mt-3" htmlFor="tr-r">Reason</label>
                <textarea id="tr-r" rows={3} className={`form-control ${tErr.reason ? 'is-invalid' : ''}`} value={tReason} onChange={(e) => setTReason(e.target.value)} />
                {tErr.reason && <div className="invalid-feedback">{tErr.reason}</div>}
                <div className="text-end mt-3"><button className="btn btn-primary" onClick={startTransfer}>Review & confirm transfer</button></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="card">
          <div className="list-group list-group-flush">
            {state.transferRequests.map((r) => {
              const a = state.agents.find((x) => x.id === r.agentId);
              return (
                <div key={r.id} className="list-group-item d-flex flex-wrap gap-3 align-items-center">
                  <Avatar name={fullName(a)} color={a?.avatarColor} size={38} />
                  <div className="flex-grow-1" style={{ minWidth: 220 }}>
                    <div className="fw-semibold">{fullName(a)} <small className="text-muted">{r.id}</small></div>
                    <div className="small">{state.teams.find((t) => t.id === r.fromTeamId)?.name} → {state.teams.find((t) => t.id === r.toTeamId)?.name} · requested by {fullName(state.agents.find((x) => x.id === r.requestedBy))} · {fmtDate(r.requestedAt)}</div>
                    <div className="small text-muted">{r.reason}</div>
                  </div>
                  <StatusBadge status={r.status} />
                  {r.status === 'Pending' && canApprove && <div className="d-flex gap-2"><button className="btn btn-sm btn-light text-danger" onClick={() => setDecline(r)}>Decline</button><button className="btn btn-sm btn-success" onClick={() => approveRequest(r)}>Approve</button></div>}
                </div>
              );
            })}
          </div>
          {!state.transferRequests.length && <EmptyState title="No transfer requests" />}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="table-responsive"><table className="table">
            <thead><tr><th>Date</th><th>Agent</th><th>Team</th><th>Detail</th></tr></thead>
            <tbody>{history.map((h, i) => <tr key={i}><td>{fmtDateTime(h.from)}</td><td><Link to={`/agents/${h.agent.id}`}>{fullName(h.agent)}</Link></td><td>{state.teams.find((t) => t.id === h.teamId)?.name}</td><td className="small">{h.reason}</td></tr>)}</tbody>
          </table></div>
          {!history.length && <EmptyState icon="bi-clock-history" title="No transfers or lead changes recorded yet" />}
        </div>
      )}

      <AgentProfileModal agent={selected} teams={state.teams} agents={state.agents} onClose={() => setSelected(null)} fullLink={selected ? `/agents/${selected.id}` : null} />

      <ConfirmModal open={tConfirm} onClose={() => setTConfirm(false)} onConfirm={doTransfer} title="Confirm transfer" confirmLabel="Transfer agent">
        {agentT && toTeam && <>
          <p>Transfer <strong>{fullName(agentT)}</strong> from <strong>{fromTeam?.name}</strong> to <strong>{toTeam.name}</strong>?</p>
          <ul className="small mb-0"><li>The previous assignment is kept in the agent's team history.</li><li>The agent and both team leads will be notified.</li><li>Reason: {tReason}</li></ul>
        </>}
      </ConfirmModal>

      <Modal open={!!leadTeam && !leadConfirm} onClose={() => setLeadTeam(null)} title={`Change team lead — ${leadTeam?.name}`}
        footer={<><button className="btn btn-light" onClick={() => setLeadTeam(null)}>Cancel</button><button className="btn btn-primary" disabled={!newLead} onClick={() => setLeadConfirm(true)}>Continue</button></>}>
        {leadTeam && <>
          <p className="small">Current lead: <strong>{fullName(state.agents.find((a) => a.id === leadTeam.leadId)) || 'None'}</strong></p>
          <label className="form-label required" htmlFor="nl">New team lead</label>
          <select id="nl" className="form-select" value={newLead} onChange={(e) => setNewLead(e.target.value)}>
            <option value="">Select an agent…</option>
            <optgroup label={`${leadTeam.name} members`}>
              {state.agents.filter((a) => a.teamId === leadTeam.id && a.status === 'Active' && a.id !== leadTeam.leadId).map((a) => <option key={a.id} value={a.id}>{fullName(a)} ({a.id})</option>)}
            </optgroup>
            <optgroup label="Other teams (will be transferred)">
              {state.agents.filter((a) => a.teamId && a.teamId !== leadTeam.id && a.status === 'Active').map((a) => <option key={a.id} value={a.id}>{fullName(a)} — {state.teams.find((t) => t.id === a.teamId)?.name}</option>)}
            </optgroup>
          </select>
        </>}
      </Modal>
      <ConfirmModal open={leadConfirm} onClose={() => setLeadConfirm(false)} onConfirm={doChangeLead} title="Confirm team lead change" confirmLabel="Change team lead">
        {leadTeam && newLead && <>
          <p><strong>{fullName(state.agents.find((a) => a.id === newLead))}</strong> will become team lead of <strong>{leadTeam.name}</strong>.</p>
          <ul className="small mb-0">
            <li>The hierarchy will update immediately.</li>
            <li>The new lead, previous lead and all team members will be notified.</li>
            {state.teams.some((t) => t.leadId === newLead) && <li className="text-danger">This agent currently leads another team, which will be left without a lead.</li>}
          </ul>
        </>}
      </ConfirmModal>
      <ConfirmModal open={!!decline} onClose={() => setDecline(null)} onConfirm={declineRequest} title="Decline transfer request?" confirmLabel="Decline" variant="danger">
        The agent will stay in their current team.
      </ConfirmModal>
    </>
  );
}
