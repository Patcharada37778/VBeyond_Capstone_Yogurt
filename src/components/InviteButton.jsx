import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

export const inviteLink = (teamId, agentId) => `${window.location.origin}/join?team=${encodeURIComponent(teamId)}&ref=${encodeURIComponent(agentId)}`;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers that block the clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Copies a registration link that pre-assigns the agent's team and records who referred the applicant. */
export default function InviteButton({ className = 'btn btn-light' }) {
  const { user } = useStore();
  const toast = useToast();
  const agent = user.agent;
  if (!agent?.teamId) return null;

  const onClick = async () => {
    if (['Suspended', 'Resigned', 'Expired'].includes(agent.status)) {
      toast(`Invitations are unavailable while your status is ${agent.status}.`, 'warning');
      return;
    }
    const ok = await copyText(inviteLink(agent.teamId, agent.id));
    toast(ok ? 'Invitation link copied' : 'Could not copy the link. Please try again.', ok ? 'success' : 'warning');
  };

  return <button type="button" className={className} onClick={onClick}><i className="bi bi-person-plus me-1" aria-hidden="true" />Invite someone</button>;
}
