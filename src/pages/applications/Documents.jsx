import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { PageHeader, SearchInput, Select, StatusBadge } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { Modal } from '../../components/modals/Modal';
import DocumentReview, { DOC_STATUSES } from './DocumentReview';
import { fmtDateTime } from '../../utils/format';

export default function Documents() {
  const { state, can } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('Pending');
  const [type, setType] = useState('All');
  const [openApp, setOpenApp] = useState(null);

  const all = state.applications.flatMap((a) => a.documents.map((d) => ({ ...d, rowId: `${a.id}-${d.id}`, appId: a.id, applicant: `${a.personal.firstName} ${a.personal.lastName}`, appStatus: a.status })));
  const types = [...new Set(all.map((d) => d.type))];
  const rows = all.filter((d) => (status === 'All' || d.status === status) && (type === 'All' || d.type === type) && (!q || `${d.fileName} ${d.applicant} ${d.appId}`.toLowerCase().includes(q.toLowerCase())));
  const app = state.applications.find((a) => a.id === openApp);
  const editable = can('documents', 'edit') && app && !['Approved', 'Rejected'].includes(app.status);

  return (
    <>
      <PageHeader title="Document Verification" subtitle="Review applicant documents across all applications." crumbs={[{ label: 'Agent Team Management' }, { label: 'Document Verification' }]} />
      <div className="row g-3 mb-3">
        {DOC_STATUSES.map((s) => (
          <div className="col-6 col-md-3" key={s}>
            <button className={`card w-100 text-start ${status === s ? 'border-primary' : ''}`} onClick={() => setStatus(s)}>
              <div className="card-body"><div className="stat-value font-brand fs-4">{all.filter((d) => d.status === s).length}</div><div className="small text-muted">{s}</div></div>
            </button>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search file, applicant or application ID" className="flex-grow-1" />
          <Select value={status} onChange={setStatus} label="Document status" options={['All', ...DOC_STATUSES].map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} />
          <Select value={type} onChange={setType} label="Document type" options={['All', ...types].map((s) => ({ value: s, label: s === 'All' ? 'All document types' : s }))} />
        </div>
        <DataTable rows={rows} rowKey="rowId" onRowClick={(r) => setOpenApp(r.appId)} initialSort={{ key: 'uploadedAt', dir: 'desc' }} empty="No documents match these filters"
          columns={[
            { key: 'fileName', label: 'File name', render: (d) => <span><i className="bi bi-file-earmark-text me-2 text-brand" />{d.fileName}</span> },
            { key: 'type', label: 'Document type' },
            { key: 'applicant', label: 'Applicant', render: (d) => <div className="lh-sm"><div>{d.applicant}</div><small className="text-muted">{d.appId}</small></div> },
            { key: 'uploadedAt', label: 'Upload date', render: (d) => fmtDateTime(d.uploadedAt) },
            { key: 'status', label: 'Status', render: (d) => <StatusBadge status={d.status} /> },
            { key: 'actions', label: '', render: (d) => <button className="btn btn-sm btn-outline-primary" onClick={() => setOpenApp(d.appId)}>Review</button> },
          ]} />
      </div>
      <Modal open={!!app} onClose={() => setOpenApp(null)} title={app ? `${app.personal.firstName} ${app.personal.lastName} · ${app.id}` : ''} size="xl"
        footer={<>{can('applications', 'view') && app && <Link to={`/applications/${app.id}`} className="btn btn-outline-primary">Open full application</Link>}<button className="btn btn-primary" onClick={() => setOpenApp(null)}>Done</button></>}>
        {app && <><div className="mb-3"><StatusBadge status={app.status} /></div><DocumentReview key={app.id} appId={app.id} canEdit={editable} /></>}
      </Modal>
    </>
  );
}
