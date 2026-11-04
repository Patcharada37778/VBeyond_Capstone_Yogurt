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
      {agent && <>
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
      </>}
    </Modal>
  );
}

export function OrgChart({ teams, agents, onlyTeamId, onSelect }) {
  const list = onlyTeamId ? teams.filter((t) => t.id === onlyTeamId) : teams;
  return (
    <div className="org-tree">
      {!onlyTeamId && <>
        <div className="org-node lead" style={{ background: 'var(--vb-teal-700)', color: '#fff', borderColor: 'var(--vb-teal-700)' }}>
          <i className="bi bi-building fs-5" /><div><div className="fw-semibold">VBEYOND Agent Network</div><small className="opacity-75">Agent Management Office</small></div>
        </div>
        <div className="org-connector" />
      </>}
      <div className="org-children">
        {list.map((t) => {
          const lead = agents.find((a) => a.id === t.leadId);
          const members = agents.filter((a) => a.teamId === t.id && a.id !== t.leadId && a.status !== 'Resigned');
          return (
            <div key={t.id} className="border rounded-3 p-3 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-2"><strong className="font-brand">{t.name}</strong><small className="text-muted">{members.length + (lead ? 1 : 0)} agents</small></div>
              <button className="org-node lead w-100 text-start mb-2" onClick={() => lead && onSelect?.(lead)}>
                {lead ? <><Avatar name={fullName(lead)} color={lead.avatarColor} photo={lead.photo} size={32} /><div className="lh-sm"><div className="fw-semibold small">{fullName(lead)}</div><small className="text-muted">Team Lead · {lead.id}</small></div></> : <small className="text-muted">No team lead assigned</small>}
              </button>
              <div className="ps-3 border-start d-grid gap-1" style={{ borderColor: '#c9d6d7' }}>
                {members.map((m) => (
                  <button key={m.id} className="org-node w-100 text-start py-1" onClick={() => onSelect?.(m)} style={{ minWidth: 0 }}>
                    <Avatar name={fullName(m)} color={m.avatarColor} photo={m.photo} size={26} />
                    <span className="small text-truncate flex-grow-1">{fullName(m)}</span>
                    {m.status !== 'Active' && <StatusBadge status={m.status} />}
                  </button>
                ))}
                {!members.length && <small className="text-muted">No members</small>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
