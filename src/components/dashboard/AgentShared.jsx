import { Link } from 'react-router-dom';
import { Avatar, StatusBadge } from '../common';
import { Modal } from '../modals/Modal';
import { daysUntil, fmtDate, fullName } from '../../utils/format';

export function AgentProfileModal({ agent, teams, agents, onClose, showSensitive = true, fullLink }) {
  const team = teams.find((t) => t.id === agent?.teamId);
  const lead = agents.find((a) => a.id === team?.leadId);
  return (
    <Modal open={!!agent} onClose={onClose} title="Agent profile" size="lg"
      footer={<>{fullLink && <Link to={fullLink} className="btn btn-outline-primary">Open full record</Link>}<button className="btn btn-primary" onClick={onClose}>Close</button></>}>
      {agent && <div className="agent-profile-content">
        <div className="d-flex gap-3 align-items-center mb-3">
          <Avatar name={fullName(agent)} color={agent.avatarColor} photo={agent.photo} size={64} />
          <div>
            <h3 className="h5 mb-0">{fullName(agent)}</h3>
            <div className="text-muted small">{agent.id} · {team?.name || 'No team'}</div>
            <div className="mt-1 d-flex gap-2"><StatusBadge status={agent.status} />{team?.leadId === agent.id && <span className="status-badge sb-purple">Team Lead</span>}{!agent.activated && <span className="status-badge sb-amber">Not signed in yet</span>}</div>
          </div>
        </div>
        <h4 className="small-caps">Contact information</h4>
        <dl className="dl-grid mb-3">
          <div><dt>Email</dt><dd>{showSensitive ? <a href={`mailto:${agent.email}`}>{agent.email}</a> : '•••••• (restricted)'}</dd></div>
          <div><dt>Phone</dt><dd>{showSensitive ? <a href={`tel:${agent.phone}`}>{agent.phone}</a> : '•••••• (restricted)'}</dd></div>
          <div><dt>LINE ID</dt><dd>{showSensitive ? agent.lineId || '—' : '••••••'}</dd></div>
        </dl>
        <h4 className="small-caps">Membership & team</h4>
        <dl className="dl-grid mb-0">
          <div><dt>Team</dt><dd>{team?.name || 'Pending onboarding'}</dd></div>
          <div><dt>Team lead</dt><dd>{lead ? fullName(lead) : '—'}</dd></div>
          <div><dt>Registration date</dt><dd>{fmtDate(agent.registeredAt)}</dd></div>
          <div><dt>Membership expiry</dt><dd className={daysUntil(agent.membershipExpiry) < 60 ? 'text-danger' : ''}>{fmtDate(agent.membershipExpiry)}</dd></div>
          <div><dt>License no.</dt><dd>{agent.licenseNo}</dd></div>
          <div><dt>Onboarded</dt><dd>{fmtDate(agent.onboardedAt)}</dd></div>
        </dl>
      </div>}
    </Modal>
  );
}

function getAgentManager(agent, team, agents) {
  const manager = agents.find((candidate) => candidate.id === agent.reportsTo && candidate.teamId === team.id);
  return agent.id === team.leadId ? null : manager?.id || team.leadId;
}

function AgentReportBranch({ agent, team, agents, onSelect, canViewStatus, currentAgentId, ancestors = [] }) {
  const path = [...ancestors, agent.id];
  const isHighlighted = currentAgentId ? agent.id === currentAgentId : agent.id === team.leadId;
  const reports = agents.filter((candidate) => candidate.status !== 'Resigned'
    && !path.includes(candidate.id)
    && getAgentManager(candidate, team, agents) === agent.id);
  return (
    <div className="org-report-branch">
      <button type="button" className={`org-folder-agent ${isHighlighted ? 'org-folder-current' : ''}`} onClick={() => onSelect?.(agent)}>
        {isHighlighted
          ? <Avatar name={fullName(agent)} color={agent.avatarColor} photo={agent.photo} size={32} />
          : <i className="bi bi-person" aria-hidden="true" />}
        <span className="org-folder-agent-info"><strong>{fullName(agent)}</strong><small>{agent.id === team.leadId ? 'Team Lead' : agent.teamRole || 'Agent'} · {agent.id}{reports.length ? ` · ${reports.length} direct report${reports.length === 1 ? '' : 's'}` : ''}</small></span>
        {canViewStatus(agent) && <StatusBadge status={agent.status} />}
      </button>
      {reports.length > 0 && (
        <div className="org-folder-members">
          {reports.map((report) => <AgentReportBranch key={report.id} agent={report} team={team} agents={agents} onSelect={onSelect} canViewStatus={canViewStatus} currentAgentId={currentAgentId} ancestors={path} />)}
        </div>
      )}
    </div>
  );
}

function OrgTeamFolder({ team, agents, onSelect, canViewStatus, currentAgentId, initiallyOpen = false }) {
  const teamAgents = agents.filter((agent) => agent.teamId === team.id && agent.status !== 'Resigned');
  const lead = teamAgents.find((agent) => agent.id === team.leadId);
  return (
    <details className="org-folder-team" open={initiallyOpen}>
      <summary><span>{team.name}</span><small>{teamAgents.length} agents</small></summary>
      <div className="org-folder-children">
        {lead
          ? <AgentReportBranch agent={lead} team={team} agents={teamAgents} onSelect={onSelect} canViewStatus={canViewStatus} currentAgentId={currentAgentId} />
          : teamAgents.length
            ? teamAgents.filter((agent) => getAgentManager(agent, team, teamAgents) === null)
              .map((agent) => <AgentReportBranch key={agent.id} agent={agent} team={team} agents={teamAgents} onSelect={onSelect} canViewStatus={canViewStatus} currentAgentId={currentAgentId} />)
            : <div className="org-folder-empty">No team lead or members assigned</div>}
      </div>
    </details>
  );
}

export function OrgChart({ teams, agents, onlyTeamId, onSelect, canViewStatus = () => true, currentAgentId }) {
  const list = onlyTeamId ? teams.filter((team) => team.id === onlyTeamId) : teams;
  return (
    <div className="org-folder-tree">
      {!onlyTeamId && <details className="org-folder-root" open>
        <summary><i className="bi bi-building" aria-hidden="true" /><span>VBEYOND Agent Network</span><small>{list.length} teams</small></summary>
        <div className="org-folder-children">
          {list.map((team) => <OrgTeamFolder key={team.id} team={team} agents={agents} onSelect={onSelect} canViewStatus={canViewStatus} currentAgentId={currentAgentId} />)}
        </div>
      </details>}
      {onlyTeamId && list.map((team) => <OrgTeamFolder key={team.id} team={team} agents={agents} onSelect={onSelect} canViewStatus={canViewStatus} currentAgentId={currentAgentId} initiallyOpen />)}
    </div>
  );
}
