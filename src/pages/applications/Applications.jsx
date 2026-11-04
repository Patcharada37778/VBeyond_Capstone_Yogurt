import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { PageHeader, SearchInput, Select, StatusBadge, Tabs } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { fmtDate } from '../../utils/format';

export const APP_STATUSES = ['Pending Review', 'Clarification Required', 'Resubmitted', 'Approved', 'Rejected'];

export default function Applications() {
  const { state, user } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('queue');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [reviewer, setReviewer] = useState('All');
  const admins = state.admins;

  const inTab = (a) => (tab === 'queue' ? ['Pending Review', 'Resubmitted', 'Clarification Required'].includes(a.status) : tab === 'mine' ? a.reviewer === user.id : true);
  const rows = state.applications.filter((a) => inTab(a)
    && (status === 'All' || a.status === status)
    && (reviewer === 'All' || (reviewer === 'none' ? !a.reviewer : a.reviewer === reviewer))
    && (!q || `${a.id} ${a.personal.firstName} ${a.personal.lastName} ${a.personal.email}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title="Agent Applications" subtitle="Review new agent registrations, request clarification, and approve or reject." crumbs={[{ label: 'Agent Team Management' }, { label: 'Applications' }]} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'queue', label: 'Review queue', count: state.applications.filter((a) => ['Pending Review', 'Resubmitted', 'Clarification Required'].includes(a.status)).length },
        { key: 'mine', label: 'Assigned to me', count: state.applications.filter((a) => a.reviewer === user.id).length },
        { key: 'all', label: 'All applications', count: state.applications.length },
      ]} />
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search by ID, name or email" className="flex-grow-1" />
          <Select value={status} onChange={setStatus} label="Status" options={['All', ...APP_STATUSES].map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} />
          <Select value={reviewer} onChange={setReviewer} label="Reviewer" options={[{ value: 'All', label: 'Any reviewer' }, { value: 'none', label: 'Unassigned' }, ...admins.filter((a) => a.role === 'agentManager').map((a) => ({ value: a.id, label: a.name }))]} />
        </div>
        <DataTable rows={rows} onRowClick={(r) => navigate(`/applications/${r.id}`)} initialSort={{ key: 'submittedAt', dir: 'desc' }} empty="No applications match these filters"
          columns={[
            { key: 'id', label: 'Application ID', render: (a) => <span className="fw-semibold">{a.id}</span> },
            { key: 'name', label: 'Applicant name', sortValue: (a) => a.personal.firstName, render: (a) => <div className="lh-sm"><div>{a.personal.firstName} {a.personal.lastName}</div><small className="text-muted">{a.personal.email}</small></div> },
            { key: 'submittedAt', label: 'Submission date', render: (a) => fmtDate(a.submittedAt) },
            { key: 'documents', label: 'Documents', sortValue: (a) => a.documents.length, render: (a) => {
              const v = a.documents.filter((d) => d.status === 'Verified').length;
              const bad = a.documents.filter((d) => ['Rejected', 'Requires Replacement'].includes(d.status)).length;
              return <span className="small">{v}/{a.documents.length} verified{bad ? <span className="text-danger"> · {bad} issue{bad > 1 ? 's' : ''}</span> : ''}</span>;
            } },
            { key: 'status', label: 'Application status', render: (a) => <StatusBadge status={a.status} /> },
            { key: 'reviewer', label: 'Assigned reviewer', sortValue: (a) => admins.find((x) => x.id === a.reviewer)?.name || '', render: (a) => admins.find((x) => x.id === a.reviewer)?.name || <span className="text-muted">Unassigned</span> },
            { key: 'actions', label: 'Actions', render: (a) => <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/applications/${a.id}`)}>{['Approved', 'Rejected'].includes(a.status) ? 'View' : 'Review'}</button> },
          ]} />
      </div>
    </>
  );
}
