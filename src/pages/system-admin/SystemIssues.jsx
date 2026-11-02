import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SearchInput, Select, StatusBadge, StatCard, TONES } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { Modal } from '../../components/modals/Modal';
import { PRIORITIES, TicketThread } from '../common/ReportProblem';
import { fmtDate, fmtDateTime } from '../../utils/format';

export const ISSUE_STATUSES = ['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed'];

export default function SystemIssues() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('Active');
  const [priority, setPriority] = useState('All');
  const [assignee, setAssignee] = useState('All');
  const [tab, setTab] = useState('response');
  const [text, setText] = useState('');
  const canResolve = can('issues', 'approve');
  const canEdit = can('issues', 'edit');
  const itAdmins = state.admins.filter((a) => a.role === 'itAdmin' && a.status === 'Active');
  const t = state.issues.find((x) => x.id === params.get('open'));

  const rows = state.issues.filter((x) => (status === 'All' || (status === 'Active' ? !['Resolved', 'Closed'].includes(x.status) : x.status === status))
    && (priority === 'All' || x.priority === priority)
    && (assignee === 'All' || (assignee === 'none' ? !x.assignedTo : assignee === 'escalated' ? x.escalated : x.assignedTo === assignee))
    && (!q || `${x.id} ${x.title} ${x.reporterName} ${x.category}`.toLowerCase().includes(q.toLowerCase())));

  const update = (fn, historyText, toastMsg, notifyReporter) => {
    mutate((d) => {
      const x = d.issues.find((y) => y.id === t.id);
      fn(x, d);
      if (historyText) x.history.push({ at: new Date().toISOString(), text: historyText, by: user.name });
      if (notifyReporter) notify(d, x.reporterKey, { category: 'System issue updates', title: `${x.id}: ${notifyReporter}`, body: x.title, link: '/report-problem' });
      logAction(d, user, historyText || 'Updated ticket', x.id);
    });
    if (toastMsg) toast(toastMsg);
  };

  const changeStatus = (s) => update((x) => { x.status = s; if (s === 'In Progress' && !x.assignedTo) x.assignedTo = user.id; }, `Status changed to ${s}`, `Status updated to ${s}. Reporter notified.`, `status changed to ${s}`);
  const assign = (id) => update((x, d) => { x.assignedTo = id || null; if (id) notify(d, `admin:${id}`, { category: 'System issue updates', title: `Ticket ${x.id} assigned to you`, body: x.title, link: `/system-issues?open=${x.id}` }); },
    `Assigned to ${state.admins.find((a) => a.id === id)?.name || 'nobody'}`, 'Assignment updated.');
  const setPri = (p) => update((x) => { x.priority = p; }, `Priority changed to ${p}`, `Priority set to ${p}.`);
  const escalate = () => update((x) => { x.escalated = true; x.notes.push({ at: new Date().toISOString(), by: user.name, text: 'Escalated to System IT Admin for technical investigation.' }); }, 'Escalated to System IT Admin', 'Escalated to IT.', null);
  const addText = () => {
    if (!text.trim()) return;
    if (tab === 'note') update((x) => { x.notes.push({ at: new Date().toISOString(), by: user.name, text: text.trim() }); }, 'Internal note added', 'Internal note added.');
    else update((x) => { x.responses.push({ at: new Date().toISOString(), by: user.name, text: text.trim() }); }, 'Response sent to reporter', 'Response sent to the reporter.', 'new response from support');
    setText('');
  };

  const open = state.issues.filter((x) => !['Resolved', 'Closed'].includes(x.status));

  return (
    <>
      <PageHeader title="Resolving Reported Issues" subtitle="Assign, update and resolve problems reported by users." crumbs={[{ label: 'Common Services' }, { label: 'System Issues' }]} />
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard icon="bi-exclamation-circle" label="Open issues" value={open.length} tone={TONES.blue} /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-person-dash" label="Unassigned" value={open.filter((x) => !x.assignedTo).length} tone={TONES.amber} /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-lightning" label="High / critical" value={open.filter((x) => ['High', 'Critical'].includes(x.priority)).length} tone={TONES.red} /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-check2-circle" label="Resolved (all time)" value={state.issues.filter((x) => ['Resolved', 'Closed'].includes(x.status)).length} tone={TONES.green} /></div>
      </div>
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search tickets" className="flex-grow-1" />
          <Select value={status} onChange={setStatus} label="Status" options={[{ value: 'Active', label: 'Active (not resolved)' }, { value: 'All', label: 'All statuses' }, ...ISSUE_STATUSES]} />
          <Select value={priority} onChange={setPriority} label="Priority" options={[{ value: 'All', label: 'All priorities' }, ...PRIORITIES]} />
          <Select value={assignee} onChange={setAssignee} label="Assignee" options={[{ value: 'All', label: 'Anyone' }, { value: 'none', label: 'Unassigned' }, { value: 'escalated', label: 'Escalated by support' }, ...itAdmins.map((a) => ({ value: a.id, label: a.name }))]} />
        </div>
        <DataTable rows={rows} onRowClick={(x) => setParams({ open: x.id })} initialSort={{ key: 'createdAt', dir: 'desc' }} empty="No tickets match"
          columns={[
            { key: 'id', label: 'Ticket ID', render: (x) => <span className="fw-semibold">{x.id}</span> },
            { key: 'reporterName', label: 'Reporter' },
            { key: 'category', label: 'Category' },
            { key: 'title', label: 'Description', render: (x) => <div style={{ maxWidth: 280 }}><div className="text-truncate">{x.title}</div><small className="text-muted d-block text-truncate">{x.description}</small></div> },
            { key: 'priority', label: 'Priority', sortValue: (x) => PRIORITIES.indexOf(x.priority), render: (x) => <StatusBadge status={x.priority} /> },
            { key: 'createdAt', label: 'Submitted', render: (x) => fmtDate(x.createdAt) },
            { key: 'assignedTo', label: 'Assigned', render: (x) => state.admins.find((a) => a.id === x.assignedTo)?.name || <span className="text-muted">—</span> },
            { key: 'status', label: 'Status', render: (x) => <div className="d-flex gap-1 align-items-center"><StatusBadge status={x.status} />{x.escalated && <i className="bi bi-arrow-up-right-circle text-warning" title="Escalated by support" />}</div> },
          ]} />
      </div>

      <Modal open={!!t} onClose={() => setParams({})} title={t ? `${t.id} · ${t.title}` : ''} size="xl">
        {t && <div className="row g-3">
          <div className="col-lg-7">
            <div className="d-flex flex-wrap gap-2 mb-2"><StatusBadge status={t.status} /><StatusBadge status={t.priority} /><span className="status-badge sb-gray">{t.category}</span>{t.escalated && <span className="status-badge sb-amber">Escalated</span>}</div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{t.description}</p>
            <div className="small text-muted mb-3">Reported by <strong>{t.reporterName}</strong> · {t.contact || 'no contact given'} · {fmtDateTime(t.createdAt)}{t.attachment && <> · <i className="bi bi-paperclip" />{t.attachment}</>}</div>
            <h3 className="h6">Conversation with reporter</h3>
            <TicketThread ticket={t} />
            {t.notes.length > 0 && <>
              <h3 className="h6 mt-3">Internal notes</h3>
              <div className="d-grid gap-2">{t.notes.map((n, i) => <div key={i} className="border rounded p-2 small bg-warning-subtle"><strong>{n.by}</strong> · {fmtDateTime(n.at)}<div>{n.text}</div></div>)}</div>
            </>}
            {canEdit && t.status !== 'Closed' && <div className="mt-3">
              <ul className="nav nav-pills nav-sm mb-2">
                <li className="nav-item"><button className={`nav-link py-1 ${tab === 'response' ? 'active' : ''}`} onClick={() => setTab('response')}>Response to reporter</button></li>
                <li className="nav-item"><button className={`nav-link py-1 ${tab === 'note' ? 'active' : ''}`} onClick={() => setTab('note')}>Internal note</button></li>
              </ul>
              <textarea className="form-control" rows={3} aria-label={tab === 'note' ? 'Internal note' : 'Response'} value={text} onChange={(e) => setText(e.target.value)} placeholder={tab === 'note' ? 'Only visible to back-office staff' : 'The reporter will see this in their portal'} />
              <button className="btn btn-primary btn-sm mt-2" disabled={!text.trim()} onClick={addText}>{tab === 'note' ? 'Add note' : 'Send response'}</button>
            </div>}
          </div>
          <div className="col-lg-5">
            <div className="border rounded p-3 mb-3 d-grid gap-3">
              <div>
                <label className="form-label" htmlFor="is-s">Status</label>
                <select id="is-s" className="form-select" value={t.status} disabled={!canResolve} onChange={(e) => changeStatus(e.target.value)}>{ISSUE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div>
                <label className="form-label" htmlFor="is-a">Assigned administrator</label>
                <select id="is-a" className="form-select" value={t.assignedTo || ''} disabled={!canResolve} onChange={(e) => assign(e.target.value)}>
                  <option value="">Unassigned</option>{itAdmins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="is-p">Priority</label>
                <select id="is-p" className="form-select" value={t.priority} disabled={!canEdit} onChange={(e) => setPri(e.target.value)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
              </div>
              {canResolve && !['Resolved', 'Closed'].includes(t.status) && <button className="btn btn-success" onClick={() => changeStatus('Resolved')}><i className="bi bi-check2-circle me-1" />Mark as resolved</button>}
              {!canResolve && canEdit && !t.escalated && <button className="btn btn-outline-primary" onClick={escalate}><i className="bi bi-arrow-up-right-circle me-1" />Escalate to System IT Admin</button>}
              {!canResolve && <small className="text-muted">Only System IT Admins can assign tickets and change status.</small>}
            </div>
            <h3 className="h6">Issue history</h3>
            <ul className="timeline small mb-0">{[...t.history].reverse().map((h, i) => <li key={i} className="done"><div>{h.text}</div><small className="text-muted">{fmtDateTime(h.at)} · {h.by}</small></li>)}</ul>
          </div>
        </div>}
      </Modal>
    </>
  );
}
