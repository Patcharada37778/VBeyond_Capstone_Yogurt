import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SearchInput, StatusBadge, Tabs } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { Modal } from '../../components/modals/Modal';
import { ChatThread } from '../common/ContactSupport';
import { fmtDate, timeAgo } from '../../utils/format';

export default function Inquiries() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('Open');
  const [q, setQ] = useState('');
  const [reply, setReply] = useState('');
  const [closeAfter, setCloseAfter] = useState(false);
  const canEdit = can('inquiries', 'edit');
  const staff = state.admins.filter((a) => ['support', 'agentManager'].includes(a.role) && a.status === 'Active');

  const unanswered = (i) => i.status === 'Open' && !i.messages[i.messages.length - 1].staff;
  const rows = state.inquiries.filter((i) => (tab === 'All' || (tab === 'Unanswered' ? unanswered(i) : tab === 'Mine' ? i.assignedTo === user.id : i.status === tab))
    && (!q || `${i.id} ${i.name} ${i.subject} ${i.email}`.toLowerCase().includes(q.toLowerCase())));
  const inq = state.inquiries.find((i) => i.id === params.get('open'));
  const app = state.applications.find((a) => a.userKey === inq?.userKey);

  const send = () => {
    if (!reply.trim()) return;
    mutate((d) => {
      const i = d.inquiries.find((x) => x.id === inq.id);
      i.messages.push({ by: user.name, staff: true, at: new Date().toISOString(), text: reply.trim() });
      i.status = closeAfter ? 'Closed' : 'Answered';
      if (!i.assignedTo) i.assignedTo = user.id;
      notify(d, [`applicant:${i.userKey}`], { category: 'Registration updates', title: `Reply to your question: ${i.subject}`, body: reply.trim().slice(0, 100), link: '/help' });
      logAction(d, user, 'Replied to applicant inquiry', i.id);
    });
    setReply(''); setCloseAfter(false);
    toast('Reply sent to the applicant.');
  };
  const assign = (adminId) => {
    mutate((d) => {
      const i = d.inquiries.find((x) => x.id === inq.id);
      i.assignedTo = adminId || null;
      if (adminId) notify(d, `admin:${adminId}`, { category: 'Registration updates', title: `Inquiry ${i.id} assigned to you`, body: i.subject, link: `/inquiries?open=${i.id}` });
      logAction(d, user, 'Assigned inquiry', `${i.id} → ${state.admins.find((a) => a.id === adminId)?.name || 'unassigned'}`);
    });
    toast('Inquiry assignment updated.');
  };
  const setStatus = (s) => {
    mutate((d) => { d.inquiries.find((x) => x.id === inq.id).status = s; logAction(d, user, `${s === 'Closed' ? 'Closed' : 'Reopened'} inquiry`, inq.id); });
    toast(`Inquiry ${s === 'Closed' ? 'closed' : 'reopened'}.`);
  };

  return (
    <>
      <PageHeader title="Applicant Inquiries" subtitle="Answer questions from prospective agents." crumbs={[{ label: 'Agent Team Management' }, { label: 'Applicant Inquiries' }]}
        actions={can('faq', 'view') && <Link to="/faq" className="btn btn-outline-primary"><i className="bi bi-journal-text me-1" />Manage FAQ</Link>} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'Open', label: 'Open', count: state.inquiries.filter((i) => i.status === 'Open').length },
        { key: 'Unanswered', label: 'Unanswered', count: state.inquiries.filter(unanswered).length },
        { key: 'Mine', label: 'Assigned to me', count: state.inquiries.filter((i) => i.assignedTo === user.id).length },
        { key: 'Answered', label: 'Answered' }, { key: 'Closed', label: 'Closed' }, { key: 'All', label: 'All' },
      ]} />
      <div className="card">
        <div className="card-body border-bottom"><SearchInput value={q} onChange={setQ} placeholder="Search inquiries" /></div>
        <DataTable rows={rows} onRowClick={(i) => setParams({ open: i.id })} initialSort={{ key: 'createdAt', dir: 'desc' }} empty="No inquiries here"
          columns={[
            { key: 'id', label: 'ID', render: (i) => <span className="fw-semibold">{i.id}</span> },
            { key: 'name', label: 'Applicant', render: (i) => <div className="lh-sm"><div>{i.name}</div><small className="text-muted">{i.email}</small></div> },
            { key: 'subject', label: 'Subject', render: (i) => <div className="lh-sm"><div>{i.subject}</div><small className="text-muted">{i.category}</small></div> },
            { key: 'assignedTo', label: 'Assigned to', render: (i) => state.admins.find((a) => a.id === i.assignedTo)?.name || <span className="text-muted">Unassigned</span> },
            { key: 'createdAt', label: 'Received', render: (i) => fmtDate(i.createdAt) },
            { key: 'last', label: 'Last activity', sortValue: (i) => i.messages[i.messages.length - 1].at, render: (i) => <small>{timeAgo(i.messages[i.messages.length - 1].at)}{unanswered(i) && <span className="status-badge sb-amber ms-2">Awaiting reply</span>}</small> },
            { key: 'status', label: 'Status', render: (i) => <StatusBadge status={i.status} /> },
          ]} />
      </div>

      <Modal open={!!inq} onClose={() => setParams({})} title={inq ? `${inq.id} · ${inq.subject}` : ''} size="lg"
        footer={inq && canEdit && (inq.status === 'Closed' ? <button className="btn btn-outline-primary" onClick={() => setStatus('Open')}>Reopen inquiry</button> : <button className="btn btn-light" onClick={() => setStatus('Closed')}>Close inquiry</button>)}>
        {inq && <>
          <div className="row g-2 mb-3 align-items-center">
            <div className="col-md-7 small">
              <div><strong>{inq.name}</strong> · {inq.email}</div>
              <div className="text-muted">{inq.category} · received {fmtDate(inq.createdAt)}{app && <> · application <Link to={`/applications/${app.id}`}>{app.id}</Link> <StatusBadge status={app.status} /></>}</div>
            </div>
            <div className="col-md-5">
              <label className="form-label small mb-1" htmlFor="as">Assigned to</label>
              <select id="as" className="form-select form-select-sm" value={inq.assignedTo || ''} disabled={!canEdit} onChange={(e) => assign(e.target.value)}>
                <option value="">Unassigned</option>
                {staff.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <ChatThread messages={inq.messages} staffView />
          {canEdit && inq.status !== 'Closed' && <div className="mt-3">
            <label className="form-label" htmlFor="iq-r">Reply to applicant</label>
            <textarea id="iq-r" rows={3} className="form-control" value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
              <div className="form-check"><input id="ca" className="form-check-input" type="checkbox" checked={closeAfter} onChange={(e) => setCloseAfter(e.target.checked)} /><label htmlFor="ca" className="form-check-label small">Close inquiry after sending</label></div>
              <button className="btn btn-primary" disabled={!reply.trim()} onClick={send}><i className="bi bi-send me-1" />Send reply</button>
            </div>
          </div>}
        </>}
      </Modal>
    </>
  );
}
