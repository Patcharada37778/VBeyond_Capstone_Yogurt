// Simulated agent lifecycle rules. All functions operate on a draft of the store state.
import { logAction, notify } from '../context/StoreContext';
import { fullName } from '../utils/format';

export const AGENT_STATUSES = ['Active', 'Suspended', 'Expired', 'Resigned'];

/** Human-readable consequences shown before confirming a status change. */
export function statusConsequences(agent, target, state) {
  const deals = state.deals.filter((d) => d.agentId === agent.id);
  const team = state.teams.find((t) => t.id === agent.teamId);
  const isLead = state.teams.some((t) => t.leadId === agent.id);
  const n = deals.length;
  const c = {
    Suspended: [
      'Agent cannot access restricted agent functions (renewal, invitations, new reservations).',
      `${n} existing deal record${n === 1 ? '' : 's'} will be preserved.`,
      `Team assignment is kept${team ? ` (${team.name})` : ''} and recorded in history.`,
      `${n} active deal${n === 1 ? '' : 's'} will be flagged for manager review.`,
    ],
    Expired: [
      'Membership will be marked as expired.',
      'Membership-dependent functions (reservations, new leads) will be restricted.',
      'Historical records and team assignment are preserved.',
      `${n} active deal${n === 1 ? '' : 's'} will be flagged for follow-up.`,
    ],
    Resigned: [
      'Agent access to the portal will be restricted.',
      'Historical records and deals are preserved.',
      `Agent will be removed from active team membership${team ? ` (${team.name})` : ''}.`,
      n ? `${n} outstanding deal${n === 1 ? '' : 's'} must be reassigned to another agent (select below).` : 'No outstanding deals to reassign.',
      ...(isLead ? ['This agent is a team lead — the team will have no lead until a new one is assigned.'] : []),
    ],
    Active: [
      agent.status === 'Resigned' ? 'Agent will be reactivated and must be reassigned to a team.' : 'Eligible access will be restored.',
      'Existing records and deals are preserved; review flags will be cleared.',
      ...(agent.status === 'Expired' ? ['Membership will be extended by 1 year from today.'] : []),
      ...(!agent.teamId ? ['Select a team to reassign the agent (optional).'] : []),
      'Agent status will be updated to Active.',
    ],
  };
  return c[target] || [];
}

export function applyStatusChange(d, user, agentId, target, { reason, effectiveDate, notes, reassignTo, teamId }) {
  const a = d.agents.find((x) => x.id === agentId);
  const from = a.status;
  const now = new Date().toISOString();
  const deals = d.deals.filter((x) => x.agentId === agentId);
  a.status = target;
  a.statusNote = { reason, effectiveDate, notes, by: user.name, at: now, from };

  if (target === 'Suspended') deals.forEach((x) => { x.flag = 'Manager review'; });
  if (target === 'Expired') { deals.forEach((x) => { x.flag = 'Follow-up required'; }); a.membershipExpiry = effectiveDate ? new Date(effectiveDate).toISOString() : now; }
  if (target === 'Resigned') {
    const cur = a.teamHistory.find((h) => !h.to);
    if (cur) { cur.to = now; cur.reason = `${cur.reason} · ended: resigned`; }
    d.teams.forEach((t) => { if (t.leadId === agentId) t.leadId = null; });
    if (a.teamId) {
      const team = d.teams.find((t) => t.id === a.teamId);
      if (team?.leadId) notify(d, `agent:${team.leadId}`, { category: 'Team assignment', title: `${fullName(a)} has left ${team.name}`, body: `Status changed to Resigned. ${deals.length} deal(s) reassigned.`, link: '/team/members' });
    }
    a.teamId = null;
    const to = d.agents.find((x) => x.id === reassignTo);
    deals.forEach((x) => {
      if (to) { x.previousAgentId = agentId; x.agentId = to.id; x.flag = 'Reassigned'; }
      else x.flag = 'Needs reassignment';
    });
    if (to && deals.length) {
      to.activity.unshift({ at: now, text: `Received ${deals.length} deal(s) reassigned from ${fullName(a)}` });
      notify(d, `agent:${to.id}`, { category: 'Team assignment', title: `${deals.length} deal(s) reassigned to you`, body: `From ${fullName(a)} (resigned).`, link: '/dashboard' });
    }
  }
  if (target === 'Active') {
    deals.forEach((x) => { if (x.flag !== 'Reassigned') x.flag = null; });
    if (from === 'Expired') { const e = new Date(); e.setFullYear(e.getFullYear() + 1); a.membershipStart = now; a.membershipExpiry = e.toISOString(); }
    if (teamId && !a.teamId) {
      a.teamId = teamId;
      a.teamHistory.push({ teamId, from: now, to: null, reason: 'Reassigned on reactivation' });
      const team = d.teams.find((t) => t.id === teamId);
      if (team?.leadId) notify(d, `agent:${team.leadId}`, { category: 'Team assignment', title: `New team member: ${fullName(a)}`, body: `${a.id} rejoined ${team.name} after reactivation.`, link: `/team/members?highlight=${a.id}` });
    }
  }

  a.activity.unshift({ at: now, text: `Status changed from ${from} to ${target === 'Active' && from !== 'Active' ? 'Active (reactivated)' : target} — ${reason}${notes ? ` · note: ${notes}` : ''} (by ${user.name})` });
  notify(d, `agent:${agentId}`, { category: 'Team assignment', title: `Your agent status is now ${target}`, body: reason, link: '/profile' });
  logAction(d, user, 'Changed agent status', `${fullName(a)} (${agentId}): ${from} → ${target}`);
}

export function transferAgent(d, user, agentId, toTeamId, reason) {
  const a = d.agents.find((x) => x.id === agentId);
  const from = d.teams.find((t) => t.id === a.teamId);
  const to = d.teams.find((t) => t.id === toTeamId);
  const now = new Date().toISOString();
  const cur = a.teamHistory.find((h) => !h.to);
  if (cur) cur.to = now;
  a.teamHistory.push({ teamId: toTeamId, from: now, to: null, reason: `Transfer: ${reason}` });
  if (from?.leadId === agentId) from.leadId = null;
  a.teamId = toTeamId;
  a.activity.unshift({ at: now, text: `Transferred from ${from?.name || 'no team'} to ${to.name} — ${reason}` });
  notify(d, `agent:${agentId}`, { category: 'Team assignment', title: `You've been transferred to ${to.name}`, body: reason, link: '/profile' });
  if (from?.leadId) notify(d, `agent:${from.leadId}`, { category: 'Team assignment', title: `${fullName(a)} transferred out of ${from.name}`, body: `Now in ${to.name}.`, link: '/team/members' });
  if (to.leadId) notify(d, `agent:${to.leadId}`, { category: 'Team assignment', title: `New team member: ${fullName(a)}`, body: `${a.id} transferred from ${from?.name || 'no team'}.`, link: `/team/members?highlight=${a.id}` });
  logAction(d, user, 'Transferred agent', `${fullName(a)}: ${from?.name || '—'} → ${to.name}`);
}

export function changeTeamLead(d, user, teamId, newLeadId) {
  const team = d.teams.find((t) => t.id === teamId);
  const oldLead = d.agents.find((a) => a.id === team.leadId);
  const lead = d.agents.find((a) => a.id === newLeadId);
  const now = new Date().toISOString();
  // A person can lead only one team.
  d.teams.forEach((t) => { if (t.leadId === newLeadId && t.id !== teamId) t.leadId = null; });
  if (lead.teamId !== teamId) {
    const cur = lead.teamHistory.find((h) => !h.to);
    if (cur) cur.to = now;
    lead.teamHistory.push({ teamId, from: now, to: null, reason: 'Appointed team lead' });
    lead.teamId = teamId;
  }
  team.leadId = newLeadId;
  lead.activity.unshift({ at: now, text: `Appointed team lead of ${team.name}` });
  if (oldLead) oldLead.activity.unshift({ at: now, text: `No longer team lead of ${team.name} (replaced by ${fullName(lead)})` });
  notify(d, `agent:${newLeadId}`, { category: 'Team assignment', title: `You are now the team lead of ${team.name}`, body: 'Team management tools are now available in your portal.', link: '/team/members' });
  if (oldLead) notify(d, `agent:${oldLead.id}`, { category: 'Team assignment', title: `Team lead change for ${team.name}`, body: `${fullName(lead)} is the new team lead.`, link: '/profile' });
  d.agents.filter((a) => a.teamId === teamId && a.id !== newLeadId && a.id !== oldLead?.id).forEach((m) => {
    notify(d, `agent:${m.id}`, { category: 'Team assignment', title: `New team lead: ${fullName(lead)}`, body: `${team.name} has a new team lead.`, link: '/profile' });
  });
  logAction(d, user, 'Changed team lead', `${team.name}: ${oldLead ? fullName(oldLead) : 'none'} → ${fullName(lead)}`);
}

export function onboardAgent(d, user, agentId, { teamId, onboardDate, notes, reportsTo }) {
  const a = d.agents.find((x) => x.id === agentId);
  const team = d.teams.find((t) => t.id === teamId);
  const at = onboardDate ? new Date(onboardDate).toISOString() : new Date().toISOString();
  a.teamId = teamId; a.onboardedAt = at; a.onboardNotes = notes; a.reportsTo = reportsTo || team.leadId;
  a.teamHistory.push({ teamId, from: at, to: null, reason: 'Initial onboarding' });
  a.activity.unshift({ at: new Date().toISOString(), text: `Onboarded to ${team.name} by ${user.name}${notes ? ` — ${notes}` : ''}` });
  const inv = d.invitations.find((i) => i.email.toLowerCase() === a.email.toLowerCase() && i.status === 'Approved');
  notify(d, `agent:${agentId}`, { category: 'Team assignment', title: `Welcome to ${team.name}!`, body: `You've been assigned to ${team.name}${team.leadId ? ` led by ${fullName(d.agents.find((x) => x.id === team.leadId))}` : ''}.`, link: '/profile' });
  if (team.leadId) notify(d, `agent:${team.leadId}`, { category: 'Team assignment', title: `New team member: ${fullName(a)}`, body: `${a.id} joined ${team.name} · onboarding date ${new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${inv ? ' (your invitation)' : ''}.`, link: `/team/members?highlight=${a.id}` });
  if (reportsTo && reportsTo !== team.leadId) notify(d, `agent:${reportsTo}`, { category: 'Team assignment', title: `${fullName(a)} will report to you`, body: `New ${team.name} member onboarded by ${user.name}.`, link: `/team/members?highlight=${a.id}` });
  logAction(d, user, 'Onboarded agent to team', `${fullName(a)} (${a.id}) → ${team.name}`);
}
