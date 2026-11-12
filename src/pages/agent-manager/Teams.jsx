import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, EmptyState, PageHeader, SearchInput, Tabs } from '../../components/common';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { AgentProfileModal, OrgChart } from '../../components/dashboard/AgentShared';
import { changeTeamLead, transferAgent } from '../../services/agentLifecycle';
import OnboardingPanel from './Onboarding';
import { fmtDateTime, fullName } from '../../utils/format';

function TeamCard({ team, agents, onChangeLead, canEdit }) {
  const members = agents.filter((a) => a.teamId === team.id);
  const lead = agents.find((a) => a.id === team.leadId);
  const active = members.filter((a) => a.status === 'Active').length;
  return (
    <div className="card h-100 team-structure-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div><h3 className="h6 mb-0 font-brand">{team.name}</h3><small className="text-muted">{team.region}</small></div>
          <span className="badge text-bg-light border">{members.length} agents</span>
        </div>
        <div className="team-structure-description text-muted mt-1">{team.focus}</div>
        <div className="team-lead-card d-flex align-items-center gap-2 mt-3 p-2 rounded bg-brand-soft">
          {lead ? <><Avatar name={fullName(lead)} color={lead.avatarColor} photo={lead.photo} size={34} /><div className="lh-sm flex-grow-1"><small className="team-lead-label">Team lead</small><div className="fw-semibold small">{fullName(lead)}</div><small className="text-muted">{lead.id}</small></div></>
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
  const canCreate = can('teams', 'create');
  const requestedTab = params.get('tab');
  const tab = requestedTab === 'requests' ? 'structure' : requestedTab || (params.get('transfer') ? 'transfer' : 'structure');
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

  const blankNewTeam = { name: '', region: '', focus: '', leadId: '', members: [] };
  const [newTeam, setNewTeam] = useState(blankNewTeam);
  const [newTeamErrors, setNewTeamErrors] = useState({});
  const [newTeamOpen, setNewTeamOpen] = useState(false);

  const agentT = state.agents.find((a) => a.id === tAgent);
  const fromTeam = state.teams.find((t) => t.id === agentT?.teamId);
  const toTeam = state.teams.find((t) => t.id === tTeam);
  const candidates = state.agents.filter((a) => a.teamId && a.status !== 'Resigned' && (!tq || `${fullName(a)} ${a.id}`.toLowerCase().includes(tq.toLowerCase()))).slice(0, 8);
  const activeAgents = state.agents.filter((agent) => agent.status === 'Active');

  const openNewTeam = () => {
    setNewTeam({ ...blankNewTeam, members: [] });
    setNewTeamErrors({});
    setNewTeamOpen(true);
  };
  const updateNewTeamLead = (leadId) => {
    setNewTeam((current) => ({
      ...current,
      leadId,
      members: current.members.map((member) => ({
        ...member,
        reportsTo: member.reportsTo && member.reportsTo !== current.leadId ? member.reportsTo : leadId,
      })),
    }));
  };
  const updateNewTeamMember = (index, changes) => {
    setNewTeam((current) => ({
      ...current,
      members: current.members.map((member, row) => row === index ? { ...member, ...changes } : member),
    }));
  };
  const addNewTeamMember = () => setNewTeam((current) => ({ ...current, members: [...current.members, { agentId: '', reportsTo: current.leadId }] }));
  const removeNewTeamMember = (index) => setNewTeam((current) => ({ ...current, members: current.members.filter((_, row) => row !== index) }));

  const createTeam = () => {
    const errors = {};
    const assignedIds = newTeam.members.map((member) => member.agentId).filter(Boolean);
    if (!newTeam.name.trim()) errors.name = 'Enter a team name.';
    else if (state.teams.some((team) => team.name.trim().toLowerCase() === newTeam.name.trim().toLowerCase())) errors.name = 'A team with this name already exists.';
    if (newTeam.leadId && assignedIds.includes(newTeam.leadId)) errors.lead = 'The team lead cannot also be added as a member.';
    if (new Set(assignedIds).size !== assignedIds.length) errors.members = 'An agent can only be selected once.';
    newTeam.members.forEach((member, index) => {
      if (!member.agentId) return;
      const availableManagers = [
        ...(newTeam.leadId ? [newTeam.leadId] : []),
        ...newTeam.members.slice(0, index).map((priorMember) => priorMember.agentId).filter(Boolean),
      ];
      if (member.reportsTo && !availableManagers.includes(member.reportsTo)) errors[`reportsTo-${index}`] = 'Choose the team lead or a member listed above.';
      if (newTeam.leadId && !member.reportsTo) errors[`reportsTo-${index}`] = 'Choose who this member reports to.';
    });
    setNewTeamErrors(errors);
    if (Object.keys(errors).length) return;

    const membersToAssign = newTeam.members.filter((member) => member.agentId);
    let createdTeamId;
    mutate((d) => {
      const existingIds = new Set(d.teams.map((team) => team.id));
      let suffix = d.teams.length + 1;
      do { createdTeamId = `T-${String(suffix).padStart(3, '0')}`; suffix += 1; } while (existingIds.has(createdTeamId));
      const team = {
        id: createdTeamId,
        name: newTeam.name.trim(),
        leadId: null,
        region: newTeam.region.trim() || 'Region not specified',
        focus: newTeam.focus.trim() || 'Focus not specified',
        createdAt: new Date().toISOString(),
      };
      d.teams.push(team);

      const assignmentIds = [...new Set([newTeam.leadId, ...membersToAssign.map((member) => member.agentId)].filter(Boolean))];
      assignmentIds.forEach((agentId) => transferAgent(d, user, agentId, createdTeamId, `Assigned to new team ${team.name}`));
      if (newTeam.leadId) {
        const lead = d.agents.find((agent) => agent.id === newTeam.leadId);
        if (lead) lead.reportsTo = null;
        changeTeamLead(d, user, createdTeamId, newTeam.leadId);
      }
      membersToAssign.forEach((member) => {
        const agent = d.agents.find((item) => item.id === member.agentId);
        if (agent) agent.reportsTo = member.reportsTo || null;
      });
      logAction(d, user, 'Created team', `${team.name} (${team.id})`);
    });
    toast(`${newTeam.name.trim()} created.`, 'success', 'Team created');
    setNewTeamOpen(false);
    setNewTeam({ ...blankNewTeam, members: [] });
  };

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
  const history = state.agents.flatMap((a) => a.teamHistory.filter((h) => h.reason?.startsWith('Transfer') || h.reason === 'Appointed team lead').map((h) => ({ ...h, agent: a }))).sort((a, b) => new Date(b.from) - new Date(a.from));

  return (
    <>
      <PageHeader title="Team Structure Management" subtitle="Manage teams, onboarding, team leads, transfers and hierarchy." crumbs={[{ label: 'Agent Team Management' }, { label: 'Team Management' }]}
        actions={<>
          {canCreate && <button className="btn btn-outline-primary" onClick={openNewTeam}><i className="bi bi-plus-lg me-1" />Add a new team</button>}
          {canEdit && <button className="btn btn-primary" onClick={() => setTab('transfer')}><i className="bi bi-arrow-left-right me-1" />Transfer an agent</button>}
        </>} />
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'structure', label: 'Teams' }, ...(can('onboarding', 'view') ? [{ key: 'onboarding', label: 'Unassigned / Onboarding', count: unassigned.length }] : []), { key: 'hierarchy', label: 'Hierarchy' }, ...(canEdit ? [{ key: 'transfer', label: 'Transfer agent' }] : []), { key: 'history', label: 'History' }]} />

      {tab === 'structure' && <div className="row g-3">{state.teams.map((t) => <div className="col-md-6 col-xl-4" key={t.id}><TeamCard team={t} agents={state.agents} canEdit={canEdit} onChangeLead={(team) => { setLeadTeam(team); setNewLead(''); }} /></div>)}</div>}

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

      <Modal open={newTeamOpen} onClose={() => setNewTeamOpen(false)} title="Create a new team" size="lg"
        footer={<><button type="button" className="btn btn-light" onClick={() => setNewTeamOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={createTeam}>Create team</button></>}>
        <div className="new-team-form">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label required" htmlFor="new-team-name">Team name</label>
              <input id="new-team-name" className={`form-control ${newTeamErrors.name ? 'is-invalid' : ''}`} value={newTeam.name} onChange={(event) => setNewTeam({ ...newTeam, name: event.target.value })} placeholder="e.g. Team Echo" />
              {newTeamErrors.name && <div className="invalid-feedback">{newTeamErrors.name}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="new-team-region">Region</label>
              <input id="new-team-region" className="form-control" value={newTeam.region} onChange={(event) => setNewTeam({ ...newTeam, region: event.target.value })} placeholder="Sales region" />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="new-team-focus">Team focus</label>
              <input id="new-team-focus" className="form-control" value={newTeam.focus} onChange={(event) => setNewTeam({ ...newTeam, focus: event.target.value })} placeholder="Property types or sales focus" />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="new-team-lead">Team lead <span className="text-muted fw-normal">(optional)</span></label>
              <select id="new-team-lead" className={`form-select ${newTeamErrors.lead ? 'is-invalid' : ''}`} value={newTeam.leadId} onChange={(event) => updateNewTeamLead(event.target.value)}>
                <option value="">Leave unassigned</option>
                {activeAgents.filter((agent) => !newTeam.members.some((member) => member.agentId === agent.id)).map((agent) => (
                  <option key={agent.id} value={agent.id}>{fullName(agent)} · {agent.id}{agent.teamId ? ` — ${state.teams.find((item) => item.id === agent.teamId)?.name || 'Assigned'}` : ' — Unassigned'}</option>
                ))}
              </select>
              {newTeamErrors.lead && <div className="invalid-feedback d-block">{newTeamErrors.lead}</div>}
              <small className="form-text text-muted">Selecting an agent from another team will transfer them to this team.</small>
            </div>
          </div>

          <div className="new-team-members-heading">
            <div><h3 className="h6 mb-1">Team members <span className="text-muted fw-normal">(optional)</span></h3><small className="text-muted">Members can report to the team lead or a member listed above.</small></div>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addNewTeamMember}><i className="bi bi-plus-lg me-1" />Add member</button>
          </div>
          {newTeamErrors.members && <div className="text-danger small">{newTeamErrors.members}</div>}
          {newTeam.members.length ? <div className="new-team-member-rows">
            {newTeam.members.map((member, index) => {
              const priorMemberIds = newTeam.members.slice(0, index).map((prior) => prior.agentId).filter(Boolean);
              const reportingOptions = [
                ...(newTeam.leadId ? [newTeam.leadId] : []),
                ...priorMemberIds,
              ];
              return <div className="new-team-member-row" key={`new-member-${index}`}>
                <div>
                  <label className="form-label" htmlFor={`new-team-member-${index}`}>Member {index + 1}</label>
                  <select id={`new-team-member-${index}`} className={`form-select ${newTeamErrors[`member-${index}`] ? 'is-invalid' : ''}`} value={member.agentId} onChange={(event) => updateNewTeamMember(index, { agentId: event.target.value, reportsTo: event.target.value ? (member.reportsTo || newTeam.leadId) : '' })}>
                    <option value="">Leave this position open</option>
                    {activeAgents.filter((agent) => agent.id === member.agentId || (agent.id !== newTeam.leadId && !newTeam.members.some((other, otherIndex) => otherIndex !== index && other.agentId === agent.id))).map((agent) => (
                      <option key={agent.id} value={agent.id}>{fullName(agent)} · {agent.id}{agent.teamId ? ` — ${state.teams.find((item) => item.id === agent.teamId)?.name || 'Assigned'}` : ' — Unassigned'}</option>
                    ))}
                  </select>
                  {newTeamErrors[`member-${index}`] && <div className="invalid-feedback">{newTeamErrors[`member-${index}`]}</div>}
                </div>
                <div>
                  <label className="form-label" htmlFor={`new-team-report-${index}`}>Reports to</label>
                  <select id={`new-team-report-${index}`} className={`form-select ${newTeamErrors[`reportsTo-${index}`] ? 'is-invalid' : ''}`} value={member.reportsTo} disabled={!member.agentId} onChange={(event) => updateNewTeamMember(index, { reportsTo: event.target.value })}>
                    <option value="">{newTeam.leadId ? 'Select a manager' : 'Top-level member'}</option>
                    {reportingOptions.map((agentId) => {
                      const agent = state.agents.find((item) => item.id === agentId);
                      return agent && <option key={agent.id} value={agent.id}>{fullName(agent)}{agent.id === newTeam.leadId ? ' · Team lead' : ''}</option>;
                    })}
                  </select>
                  {newTeamErrors[`reportsTo-${index}`] && <div className="invalid-feedback">{newTeamErrors[`reportsTo-${index}`]}</div>}
                </div>
                <button type="button" className="btn btn-light text-danger new-team-remove-member" aria-label={`Remove member row ${index + 1}`} onClick={() => removeNewTeamMember(index)}><i className="bi bi-trash" aria-hidden="true" /></button>
              </div>;
            })}
          </div> : <div className="new-team-empty small text-muted">No team members assigned. You can add or onboard agents later.</div>}
        </div>
      </Modal>

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
    </>
  );
}
