import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SearchInput, Select, StatusBadge } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { ConfirmModal } from '../../components/modals/Modal';
import { effectiveInviteStatus } from '../../components/dashboard/AgentShared';
import { INVITE_STATUSES } from '../team-lead/TeamInvitations';
import { fmtDate, fullName } from '../../utils/format';

export default function InvitationsAdmin() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [team, setTeam] = useState('All');
  const [cancel, setCancel] = useState(null);
  const rows = state.invitations.map((i) => ({ ...i, eff: effectiveInviteStatus(i) }))
    .filter((i) => (status === 'All' || i.eff === status) && (team === 'All' || i.teamId === team) && (!q || `${i.name} ${i.email} ${i.id}`.toLowerCase().includes(q.toLowerCase())));
  const doCancel = () => {
    mutate((d) => { d.invitations.find((i) => i.id === cancel.id).status = 'Cancelled'; logAction(d, user, 'Cancelled invitation', cancel.id); });
    toast('Invitation cancelled.'); setCancel(null);
  };
  return (
    <>
      <PageHeader title="Invitations" subtitle="All team invitations sent by team leads, with their pre-assigned teams." crumbs={[{ label: 'Agent Team Management' }, { label: 'Invitations' }]} />
      <div className="row g-3 mb-3">
        {INVITE_STATUSES.map((s) => <div className="col-6 col-md-2" key={s}><div className="card h-100"><div className="card-body py-2"><div className="font-brand fs-5">{state.invitations.filter((i) => effectiveInviteStatus(i) === s).length}</div><small className="text-muted">{s}</small></div></div></div>)}
      </div>
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search invitee or code" className="flex-grow-1" />
          <Select value={status} onChange={setStatus} label="Status" options={['All', ...INVITE_STATUSES].map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} />
          <Select value={team} onChange={setTeam} label="Team" options={[{ value: 'All', label: 'All teams' }, ...state.teams.map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
        <DataTable rows={rows} initialSort={{ key: 'sentAt', dir: 'desc' }}
          columns={[
            { key: 'id', label: 'Code' },
            { key: 'name', label: 'Invitee', render: (i) => <div className="lh-sm"><div>{i.name}</div><small className="text-muted">{i.email}</small></div> },
            { key: 'teamId', label: 'Pre-assigned team', render: (i) => state.teams.find((t) => t.id === i.teamId)?.name },
            { key: 'invitedBy', label: 'Invited by', render: (i) => fullName(state.agents.find((a) => a.id === i.invitedBy)) },
            { key: 'sentAt', label: 'Sent', render: (i) => fmtDate(i.sentAt) },
            { key: 'eff', label: 'Status', render: (i) => <StatusBadge status={i.eff} /> },
            { key: 'actions', label: '', render: (i) => {
              const app = state.applications.find((a) => a.id === i.applicationId);
              const ag = app?.agentId && state.agents.find((a) => a.id === app.agentId);
              return <div className="d-flex gap-1 justify-content-end">
                {ag && !ag.teamId && can('onboarding', 'view') && <Link className="btn btn-sm btn-primary" to={`/onboarding?agent=${ag.id}`}>Onboard</Link>}
                {app && can('applications', 'view') && <Link className="btn btn-sm btn-light" to={`/applications/${app.id}`}>Application</Link>}
                {can('invitations', 'edit') && ['Pending', 'Accepted'].includes(i.eff) && <button className="btn btn-sm btn-light text-danger" onClick={() => setCancel(i)}>Cancel</button>}
              </div>;
            } },
          ]} />
      </div>
      <ConfirmModal open={!!cancel} onClose={() => setCancel(null)} onConfirm={doCancel} title="Cancel invitation?" confirmLabel="Cancel invitation" variant="danger">The invitation link for {cancel?.email} will stop working.</ConfirmModal>
    </>
  );
}
