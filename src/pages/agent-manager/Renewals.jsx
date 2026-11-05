import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, PageHeader, SearchInput, StatusBadge, Tabs } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { Modal } from '../../components/modals/Modal';
import { addYears, fmtDate, fmtDateTime, fullName } from '../../utils/format';

const INFO_REASONS = [
  'Please upload a clearer copy of the document.',
  'The document appears to be expired. Please upload a valid copy.',
  'Some required information is missing. Please resubmit the document.',
];

export default function Renewals() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');
  const [action, setAction] = useState(null); // 'approve' | 'reject' | 'info'
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [infoReason, setInfoReason] = useState('');
  const canApprove = can('renewals', 'approve');
  const canEdit = can('renewals', 'edit');

  const rows = state.renewals.map((r) => ({ ...r, agent: state.agents.find((a) => a.id === r.agentId) }))
    .filter((r) => (tab === 'open' ? !['Approved', 'Rejected'].includes(r.status) : tab === 'all' ? true : r.status === tab))
    .filter((r) => !q || `${r.id} ${fullName(r.agent)} ${r.agentId}`.toLowerCase().includes(q.toLowerCase()));
  const r = state.renewals.find((x) => x.id === params.get('open'));
  const agent = state.agents.find((a) => a.id === r?.agentId);
  const newExpiry = r && agent ? addYears(new Date(agent.membershipExpiry) > new Date() ? agent.membershipExpiry : new Date().toISOString(), r.period === '2 years' ? 2 : 1) : null;

  const update = (fn, text, toastMsg, notice) => {
    mutate((d) => {
      const x = d.renewals.find((y) => y.id === r.id);
      fn(x, d);
      x.history.push({ at: new Date().toISOString(), text: `${text} (${user.name})` });
      if (notice) notify(d, `agent:${x.agentId}`, { category: 'Renewal approval or rejection', link: '/renewal', ...notice });
      logAction(d, user, text, x.id);
    });
    toast(toastMsg);
  };

  const verifyDoc = (docId, status) => update((x) => { x.documents.find((d) => d.id === docId).status = status; }, `Document marked ${status}`, `Document marked ${status}.`);
  const verifyDocs = () => update((x) => { x.documents.forEach((d) => { d.status = 'Verified'; }); if (x.infoRequest && !x.infoRequest.response) x.infoRequest = null; },
    'All documents verified', 'All documents marked as verified. You can now approve the renewal.');

  const submitAction = () => {
    if (action === 'reject' && msg.trim().length < 10) return setErr('A rejection reason is required (at least 10 characters).');
    const infoMessage = infoReason === 'Other' ? msg.trim() : infoReason;
    if (action === 'info' && !infoReason) return setErr('Select a reason for the information request.');
    if (action === 'info' && infoReason === 'Other' && infoMessage.length < 10) return setErr('Describe the information you need (at least 10 characters).');
    if (action === 'approve') {
      update((x, d) => {
        x.status = 'Approved';
        const a = d.agents.find((y) => y.id === x.agentId);
        const prev = a.membershipExpiry;
        a.membershipStart = new Date(a.membershipExpiry) > new Date() ? a.membershipStart : new Date().toISOString();
        a.membershipExpiry = newExpiry;
        if (a.status === 'Expired') a.status = 'Active';
        d.deals.filter((dl) => dl.agentId === a.id && dl.flag === 'Follow-up required').forEach((dl) => { dl.flag = null; });
        a.activity.unshift({ at: new Date().toISOString(), text: `Membership renewed (${x.id}) — expiry extended from ${fmtDate(prev)} to ${fmtDate(newExpiry)}` });
      }, 'Renewal approved — membership extended', `Renewal approved. New expiry ${fmtDate(newExpiry)}.`,
      { title: 'Your membership renewal was approved', body: `Your membership is now valid until ${fmtDate(newExpiry)}.` });
    } else if (action === 'reject') {
      update((x) => { x.status = 'Rejected'; x.rejectionReason = msg.trim(); }, 'Renewal rejected', 'Renewal rejected and the agent was notified.',
        { title: 'Your membership renewal was rejected', body: msg.trim() });
    } else if (action === 'info') {
      update((x) => { x.infoRequest = { message: infoMessage, by: user.name, at: new Date().toISOString(), response: '' }; x.status = 'Pending Review'; }, 'Additional information requested', 'Request sent to the agent.',
        { title: `More information needed for renewal ${r.id}`, body: infoMessage });
    }
    setAction(null); setMsg(''); setErr(''); setInfoReason('');
  };

  const counts = (s) => state.renewals.filter((x) => x.status === s).length;

  return (
    <>
      <PageHeader title="Approving Membership Renewal" subtitle="Review renewal requests, verify documents, then approve or reject. Renewal is free." crumbs={[{ label: 'Agent Team Management' }, { label: 'Membership Renewals' }]} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'open', label: 'Open', count: state.renewals.filter((x) => !['Approved', 'Rejected'].includes(x.status)).length },
        { key: 'Pending Review', label: 'Pending review', count: counts('Pending Review') },
        { key: 'Approved', label: 'Approved' }, { key: 'Rejected', label: 'Rejected' }, { key: 'all', label: 'All' },
      ]} />
      <div className="card">
        <div className="card-body border-bottom"><SearchInput value={q} onChange={setQ} placeholder="Search by agent name, agent ID or request ID" /></div>
        <DataTable rows={rows} onRowClick={(x) => setParams({ open: x.id })} initialSort={{ key: 'requestedAt', dir: 'desc' }} empty="No renewal requests"
          columns={[
            { key: 'agentId', label: 'Agent ID' },
            { key: 'name', label: 'Agent name', sortValue: (x) => fullName(x.agent), render: (x) => <div className="d-flex align-items-center gap-2"><Avatar name={fullName(x.agent)} color={x.agent?.avatarColor} size={28} />{fullName(x.agent)}</div> },
            { key: 'expiry', label: 'Current expiry', sortValue: (x) => x.agent?.membershipExpiry, render: (x) => fmtDate(x.agent?.membershipExpiry) },
            { key: 'requestedAt', label: 'Request date', render: (x) => fmtDate(x.requestedAt) },
            { key: 'docs', label: 'Documents', sortValue: (x) => x.documents.length, render: (x) => <small>{x.documents.filter((d) => d.status === 'Verified').length}/{x.documents.length} verified</small> },
            { key: 'status', label: 'Renewal status', render: (x) => <StatusBadge status={x.status} /> },
            { key: 'actions', label: '', render: (x) => <button className="btn btn-sm btn-outline-primary" onClick={() => setParams({ open: x.id })}>Review</button> },
          ]} />
      </div>

      <Modal open={!!r && !action} onClose={() => setParams({})} title={r ? `Renewal ${r.id}` : ''} size="lg"
        footer={r && !['Approved', 'Rejected'].includes(r.status) ? <>
          {canEdit && <button className="btn btn-light" onClick={() => { setAction('info'); setMsg(''); setErr(''); setInfoReason(''); }}>Request info</button>}
          {canApprove && <button className="btn btn-outline-danger" onClick={() => { setAction('reject'); setMsg(''); setErr(''); }}>Reject</button>}
          {canApprove && <button className="btn btn-success" onClick={() => { setAction('approve'); setMsg(''); }}>Approve renewal</button>}
        </> : <button className="btn btn-primary" onClick={() => setParams({})}>Close</button>}>
        {r && agent && <>
          <div className="d-flex gap-3 align-items-center mb-3">
            <Avatar name={fullName(agent)} color={agent.avatarColor} photo={agent.photo} size={48} />
            <div className="flex-grow-1"><div className="fw-semibold">{fullName(agent)} <small className="text-muted">· {agent.id}</small></div><small className="text-muted">{state.teams.find((t) => t.id === agent.teamId)?.name || 'No team'} · agent status <StatusBadge status={agent.status} /></small></div>
            <StatusBadge status={r.status} />
          </div>
          <dl className="dl-grid mb-3">
            <div><dt>Current expiry</dt><dd>{fmtDate(agent.membershipExpiry)}</dd></div>
            <div><dt>Requested</dt><dd>{fmtDateTime(r.requestedAt)}</dd></div>
            <div><dt>Period</dt><dd>{r.period} · free</dd></div>
            <div><dt>New expiry if approved</dt><dd className="text-green">{fmtDate(newExpiry)}</dd></div>
          </dl>
          {r.note && <div className="alert alert-light border small"><strong>Agent note:</strong> {r.note}</div>}
          {r.rejectionReason && <div className="alert alert-danger small"><strong>Rejection reason:</strong> {r.rejectionReason}</div>}
          {r.infoRequest && <div className="alert alert-warning small"><strong>Info requested:</strong> {r.infoRequest.message}{r.infoRequest.response ? <div className="mt-1"><strong>Agent response:</strong> {r.infoRequest.response}</div> : <div className="mt-1 fst-italic">Waiting for agent response.</div>}</div>}
          <div className="renewal-documents-heading">
            <div><h3 className="h6 mb-1">Supporting documents</h3><small className="text-muted">{r.documents.length} document{r.documents.length === 1 ? '' : 's'} submitted</small></div>
          </div>
          <div className="d-grid gap-2 mb-3">
            {r.documents.map((d) => (
              <div key={d.id} className="doc-tile">
                <div className="doc-icon"><i className="bi bi-file-earmark-text" /></div>
                <div className="renewal-document-content">
                  <div className="renewal-document-heading"><div className="renewal-document-topic">{d.type}<StatusBadge status={d.status} className="renewal-document-status" /></div></div>
                  <div className="fw-medium">{d.fileName}</div><small className="text-muted">{fmtDateTime(d.uploadedAt)}</small>
                </div>
                {canEdit && !['Approved', 'Rejected'].includes(r.status) && <div className="renewal-document-actions">
                  {d.status !== 'Verified' && <button className="btn btn-sm btn-light" onClick={() => verifyDoc(d.id, 'Verified')}>Verify</button>}
                  {d.status !== 'Rejected' && <button className="btn btn-sm btn-light text-danger" onClick={() => verifyDoc(d.id, 'Rejected')}>Reject</button>}
                </div>}
              </div>
            ))}
            {!r.documents.length && <div className="renewal-document-empty small text-muted">No documents submitted.</div>}
          </div>
          {canEdit && r.status === 'Pending Review' && r.documents.some((d) => d.status !== 'Verified') && <div className="d-flex justify-content-end mb-3"><button className="btn btn-primary" onClick={verifyDocs}>Verify all documents</button></div>}
          <h3 className="small-caps">History</h3>
          <ul className="timeline small mb-0">{r.history.map((h, i) => <li key={i} className="done"><div>{h.text}</div><small className="text-muted">{fmtDateTime(h.at)}</small></li>)}</ul>
          <div className="mt-2"><Link to={`/agents/${agent.id}`} className="small">Open agent record</Link></div>
        </>}
      </Modal>

      <Modal open={!!action} onClose={() => setAction(null)} title={action === 'approve' ? 'Approve renewal?' : action === 'reject' ? 'Reject renewal' : 'Request additional information'}
        footer={<><button className="btn btn-light" onClick={() => setAction(null)}>Back</button><button className={`btn ${action === 'reject' ? 'btn-danger' : action === 'approve' ? 'btn-success' : 'btn-primary'}`} onClick={submitAction}>{action === 'approve' ? 'Approve & extend membership' : action === 'reject' ? 'Reject renewal' : 'Send request'}</button></>}>
        {action === 'approve' && agent && <ul className="small mb-0"><li>Membership expiry: {fmtDate(agent.membershipExpiry)} → <strong>{fmtDate(newExpiry)}</strong></li><li>Membership status will be Active{agent.status === 'Expired' ? ' (currently Expired)' : ''}.</li><li>The agent will be notified.</li></ul>}
        {action === 'info' && <>
          <label className="form-label required" htmlFor="rn-info-reason">Reason for request</label>
          <select id="rn-info-reason" className={`form-select ${err ? 'is-invalid' : ''}`} value={infoReason} onChange={(event) => { setInfoReason(event.target.value); setMsg(''); setErr(''); }}>
            <option value="">Select a reason…</option>
            {INFO_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            <option value="Other">Other</option>
          </select>
          {infoReason === 'Other' && <div className="mt-3">
            <label className="form-label required" htmlFor="rn-msg">Additional information requested</label>
            <textarea id="rn-msg" rows={4} className={`form-control ${err ? 'is-invalid' : ''}`} value={msg} onChange={(e) => { setMsg(e.target.value); setErr(''); }} placeholder="Describe what the agent needs to provide" />
          </div>}
          {err && <div className="text-danger small mt-1">{err}</div>}
        </>}
        {action === 'reject' && <>
          <label className="form-label required" htmlFor="rn-msg">{action === 'reject' ? 'Rejection reason' : 'What information is needed?'}</label>
          <textarea id="rn-msg" rows={4} className={`form-control ${err ? 'is-invalid' : ''}`} value={msg} onChange={(e) => { setMsg(e.target.value); setErr(''); }} />
          {err && <div className="invalid-feedback">{err}</div>}
        </>}
      </Modal>
    </>
  );
}
