import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, Select, StatusBadge } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { effectiveInviteStatus } from '../../components/dashboard/AgentShared';
import { fmtDate, isEmail, isPhone } from '../../utils/format';

export const INVITE_STATUSES = ['Pending', 'Accepted', 'Registration In Progress', 'Approved', 'Expired', 'Cancelled'];

export function InvitationEmailPreview({ inv, team, inviter }) {
  return (
    <div className="border rounded overflow-hidden">
      <div className="p-3 border-bottom bg-light small">
        <div><strong>To:</strong> {inv.name} &lt;{inv.email}&gt;</div>
        <div><strong>Subject:</strong> {inviter} invited you to join {team?.name} at VBEYOND</div>
      </div>
      <div className="p-4">
        <img src="/vbeyond-logo-color.png" alt="VBEYOND" style={{ height: 34 }} className="mb-3" />
        <p>Hi {inv.name.split(' ')[0]},</p>
        <p>{inviter} has invited you to become a VBEYOND agent and join <strong>{team?.name}</strong> ({team?.region}).</p>
        {inv.message && <blockquote className="border-start border-3 ps-3 text-muted fst-italic">"{inv.message}"</blockquote>}
        <p className="mb-3">Your team is already reserved — just complete the online registration.</p>
        <Link to={`/join?invite=${inv.id}`} className="btn btn-primary">Open registration as {inv.name.split(' ')[0]}</Link>
        <p className="small text-muted mt-3 mb-0">This invitation expires on {fmtDate(inv.expiresAt)}. Invitation code {inv.id}.</p>
      </div>
    </div>
  );
}

export default function TeamInvitations() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const team = user.ledTeam;
  const restricted = ['Suspended', 'Resigned', 'Expired'].includes(user.agent.status);
  const blank = { name: '', email: '', phone: '', message: '', teamId: team?.id || '' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('All');
  const [preview, setPreview] = useState(null);
  const [cancel, setCancel] = useState(null);

  if (!team) return <><PageHeader title="Invitations" crumbs={[{ label: 'My Team' }]} /><div className="card"><EmptyState icon="bi-envelope" title="You don't currently lead a team" /></div></>;

  const mine = state.invitations.filter((i) => i.invitedBy === user.agent.id).map((i) => ({ ...i, eff: effectiveInviteStatus(i) }));
  const rows = mine.filter((i) => filter === 'All' || i.eff === filter);

  const send = (e) => {
    e.preventDefault();
    const er = {};
    if (form.name.trim().split(' ').length < 2) er.name = 'Enter first and last name.';
    if (!isEmail(form.email)) er.email = 'Enter a valid email.';
    else if (state.agents.some((a) => a.email.toLowerCase() === form.email.toLowerCase())) er.email = 'This person is already a VBEYOND agent.';
    else if (state.invitations.some((i) => i.email.toLowerCase() === form.email.toLowerCase() && ['Pending', 'Accepted', 'Registration In Progress'].includes(effectiveInviteStatus(i)))) er.email = 'An active invitation already exists for this email.';
    if (!isPhone(form.phone)) er.phone = 'Enter a valid phone number.';
    if (!form.teamId) er.teamId = 'Select the team to pre-assign.';
    setErrors(er);
    if (Object.keys(er).length) return;
    const id = `INV-${String(state.counters.inv).padStart(4, '0')}`;
    const t = state.teams.find((x) => x.id === form.teamId);
    mutate((d) => {
      d.counters.inv++;
      const exp = new Date(); exp.setDate(exp.getDate() + 14);
      d.invitations.unshift({ id, name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), message: form.message.trim(), teamId: form.teamId, invitedBy: user.agent.id, sentAt: new Date().toISOString(), expiresAt: exp.toISOString(), status: 'Pending', applicationId: null });
      notify(d, [`email:${form.email.trim().toLowerCase()}`], { category: 'Team invitations', title: `${user.name} invited you to join ${t.name}`, body: 'Open the link to start your agent registration. Your team is pre-assigned.', link: `/register?invite=${id}` });
      notify(d, 'role:agentManager', { category: 'Team invitations', title: `${user.name} invited ${form.name.trim()}`, body: `Pre-assigned to ${t.name}`, link: '/invitations' });
      logAction(d, user, 'Sent team invitation', `${id} → ${form.email.trim()} (${t.name})`);
    });
    toast(`Invitation sent to ${form.email.trim()} (simulated email).`, 'success', 'Invitation sent');
    setPreview(id);
    setForm(blank);
  };

  const resend = (inv) => {
    mutate((d) => {
      const x = d.invitations.find((i) => i.id === inv.id);
      const exp = new Date(); exp.setDate(exp.getDate() + 14);
      x.status = 'Pending'; x.sentAt = new Date().toISOString(); x.expiresAt = exp.toISOString();
      logAction(d, user, 'Resent team invitation', x.id);
    });
    toast(`Invitation resent to ${inv.email}.`);
  };
  const doCancel = () => {
    mutate((d) => { d.invitations.find((i) => i.id === cancel.id).status = 'Cancelled'; logAction(d, user, 'Cancelled team invitation', cancel.id); });
    toast('Invitation cancelled.'); setCancel(null);
  };

  const pv = state.invitations.find((i) => i.id === preview);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Invite a Non-Agent to Join" subtitle="Invite people to register as VBEYOND agents with their team already assigned." crumbs={[{ label: 'My Team' }, { label: 'Invitations' }]} />
      <div className="row g-3">
        <div className="col-lg-4">
          <form className="card" onSubmit={send} noValidate>
            <div className="card-header">New invitation</div>
            <div className="card-body d-grid gap-3">
              {restricted && <div className="alert alert-warning small mb-0">Invitations are unavailable while your status is {user.agent.status}.</div>}
              <div><label className="form-label required" htmlFor="iv-n">Invitee name</label><input id="iv-n" className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={set('name')} placeholder="First and last name" />{errors.name && <div className="invalid-feedback">{errors.name}</div>}</div>
              <div><label className="form-label required" htmlFor="iv-e">Email</label><input id="iv-e" className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={form.email} onChange={set('email')} />{errors.email && <div className="invalid-feedback">{errors.email}</div>}
                <div className="form-text">Tip: invite <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setForm({ ...form, name: 'Nutnicha Rungroj', email: 'nutnicha.rungroj@gmail.com', phone: '089-456-7123' })}>Nutnicha</button> to see it in her portal.</div></div>
              <div><label className="form-label required" htmlFor="iv-p">Phone number</label><input id="iv-p" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} value={form.phone} onChange={set('phone')} />{errors.phone && <div className="invalid-feedback">{errors.phone}</div>}</div>
              <div><label className="form-label required" htmlFor="iv-t">Pre-assigned team</label>
                <select id="iv-t" className={`form-select ${errors.teamId ? 'is-invalid' : ''}`} value={form.teamId} onChange={set('teamId')}>
                  {state.teams.map((t) => <option key={t.id} value={t.id}>{t.name}{t.id === team.id ? ' (my team)' : ''}</option>)}
                </select>
                <div className="form-text">The invitee will be onboarded to this team after approval.</div></div>
              <div><label className="form-label" htmlFor="iv-m">Message (optional)</label><textarea id="iv-m" rows={3} className="form-control" value={form.message} onChange={set('message')} /></div>
            </div>
            <div className="card-footer bg-white text-end"><button className="btn btn-primary" disabled={restricted}><i className="bi bi-send me-1" />Send invitation</button></div>
          </form>
        </div>
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span>My invitations</span>
              <Select value={filter} onChange={setFilter} label="Filter invitations" className="form-select-sm" options={['All', ...INVITE_STATUSES].map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} />
            </div>
            <DataTable rows={rows} initialSort={{ key: 'sentAt', dir: 'desc' }} empty="No invitations yet"
              columns={[
                { key: 'name', label: 'Invitee', render: (i) => <div className="lh-sm"><div className="fw-medium">{i.name}</div><small className="text-muted">{i.email}</small></div> },
                { key: 'teamId', label: 'Team', render: (i) => state.teams.find((t) => t.id === i.teamId)?.name },
                { key: 'sentAt', label: 'Sent', render: (i) => fmtDate(i.sentAt) },
                { key: 'expiresAt', label: 'Expires', render: (i) => fmtDate(i.expiresAt) },
                { key: 'eff', label: 'Status', render: (i) => <StatusBadge status={i.eff} /> },
                { key: 'actions', label: '', render: (i) => (
                  <div className="d-flex gap-1 justify-content-end">
                    <button className="btn btn-sm btn-light" onClick={() => setPreview(i.id)} title="Preview invitation email"><i className="bi bi-envelope-open" /></button>
                    {['Pending', 'Accepted'].includes(i.eff) && <button className="btn btn-sm btn-light text-danger" onClick={() => setCancel(i)}>Cancel</button>}
                    {['Expired', 'Cancelled'].includes(i.eff) && <button className="btn btn-sm btn-outline-primary" onClick={() => resend(i)}>Resend</button>}
                  </div>) },
              ]} />
          </div>
        </div>
      </div>

      <Modal open={!!pv} onClose={() => setPreview(null)} title="Invitation email (simulated)" size="lg" footer={<button className="btn btn-primary" onClick={() => setPreview(null)}>Done</button>}>
        {pv && <InvitationEmailPreview inv={pv} team={state.teams.find((t) => t.id === pv.teamId)} inviter={user.name} />}
      </Modal>
      <ConfirmModal open={!!cancel} onClose={() => setCancel(null)} onConfirm={doCancel} title="Cancel invitation?" confirmLabel="Cancel invitation" variant="danger">
        The invitation link sent to {cancel?.email} will stop working.
      </ConfirmModal>
    </>
  );
}
