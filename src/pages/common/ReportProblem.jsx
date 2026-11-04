import { useState } from 'react';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { FilePicker, PageHeader, StatusBadge } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { Modal } from '../../components/modals/Modal';
import { fmtDate, fmtDateTime } from '../../utils/format';

export const ISSUE_CATEGORIES = ['Access / Login', 'Bug / Error', 'Payment', 'Notifications', 'Data / Reports', 'Performance', 'Other'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export function TicketThread({ ticket }) {
  const items = [
    ...ticket.responses.map((r) => ({ ...r, kind: 'response' })),
    ...(ticket.userReplies || []).map((r) => ({ ...r, kind: 'reply' })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));
  if (!items.length) return <p className="small text-muted mb-0">No responses yet.</p>;
  return (
    <div className="d-grid gap-2">
      {items.map((m, i) => (
        <div key={i} className={`chat-bubble ${m.kind === 'reply' ? 'me' : 'them'}`}>
          <div className="small fw-semibold mb-1">{m.by}</div>{m.text}
          <div className="small opacity-75 mt-1">{fmtDateTime(m.at)}</div>
        </div>
      ))}
    </div>
  );
}

export default function ReportProblem() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const blank = { title: '', category: '', description: '', priority: 'Medium', contact: user.email, attachment: null };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [openId, setOpenId] = useState(null);
  const [reply, setReply] = useState('');
  const mine = state.issues.filter((t) => t.reporterKey === user.keys[0]);
  const ticket = state.issues.find((t) => t.id === openId);

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (form.title.trim().length < 5) er.title = 'Enter a short title (at least 5 characters).';
    if (!form.category) er.category = 'Choose a category.';
    if (form.description.trim().length < 15) er.description = 'Describe the problem (at least 15 characters).';
    if (!form.contact.trim()) er.contact = 'Enter how we can contact you.';
    setErrors(er);
    if (Object.keys(er).length) return;
    const id = `TCK-${state.counters.ticket}`;
    mutate((d) => {
      d.counters.ticket++;
      d.issues.unshift({ id, title: form.title.trim(), category: form.category, description: form.description.trim(), priority: form.priority, status: 'Open',
        reporterKey: user.keys[0], reporterName: user.name, contact: form.contact.trim(), createdAt: new Date().toISOString(), assignedTo: null, escalated: false,
        attachment: form.attachment?.fileName || null, notes: [], responses: [], userReplies: [], history: [{ at: new Date().toISOString(), text: 'Ticket created', by: user.name }] });
      notify(d, 'role:agentManager', { category: 'System issue updates', title: `New ticket: ${form.title.trim()}`, body: `${id} reported by ${user.name} · ${form.priority} priority`, link: `/system-issues?open=${id}` });
      notify(d, user.keys[0], { category: 'System issue updates', title: `Your ticket ${id} was received`, body: 'The support team will review it shortly.', link: '/report-problem' });
      logAction(d, user, 'Reported system problem', id);
    });
    toast(`Ticket ${id} created. You'll be notified when its status changes.`, 'success', 'Problem reported');
    setForm(blank);
  };

  const sendReply = () => {
    if (!reply.trim()) return;
    mutate((d) => {
      const t = d.issues.find((x) => x.id === openId);
      t.userReplies = [...(t.userReplies || []), { at: new Date().toISOString(), by: user.name, text: reply.trim() }];
      if (t.status === 'Waiting for User') { t.status = 'In Progress'; t.history.push({ at: new Date().toISOString(), text: 'Reporter replied — status changed to In Progress', by: user.name }); }
      else t.history.push({ at: new Date().toISOString(), text: 'Reporter added a reply', by: user.name });
      notify(d, t.assignedTo ? [`admin:${t.assignedTo}`] : ['role:agentManager'], { category: 'System issue updates', title: `${user.name} replied on ${t.id}`, body: reply.trim().slice(0, 80), link: `/system-issues?open=${t.id}` });
    });
    setReply('');
    toast('Reply sent to the support team.');
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Report a System Problem" subtitle="Tell the support team about errors or issues with ARMS. You'll get a ticket ID to track progress." crumbs={[{ label: 'Common Services' }, { label: 'Report a Problem' }]} />
      <div className="row g-3">
        <div className="col-lg-5">
          <form className="card" onSubmit={submit} noValidate>
            <div className="card-header">New problem report</div>
            <div className="card-body d-grid gap-3">
              <div>
                <label className="form-label required" htmlFor="rp-t">Problem title</label>
                <input id="rp-t" className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} onChange={set('title')} placeholder="e.g. Cannot upload renewal document" />
                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
              </div>
              <div className="row g-2">
                <div className="col-sm-7">
                  <label className="form-label required" htmlFor="rp-c">Category</label>
                  <select id="rp-c" className={`form-select ${errors.category ? 'is-invalid' : ''}`} value={form.category} onChange={set('category')}>
                    <option value="">Select…</option>{ISSUE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {errors.category && <div className="invalid-feedback">{errors.category}</div>}
                </div>
                <div className="col-sm-5">
                  <label className="form-label required" htmlFor="rp-p">Priority</label>
                  <select id="rp-p" className="form-select" value={form.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
                </div>
              </div>
              <div>
                <label className="form-label required" htmlFor="rp-d">Description</label>
                <textarea id="rp-d" rows={5} className={`form-control ${errors.description ? 'is-invalid' : ''}`} value={form.description} onChange={set('description')} placeholder="What happened? What did you expect? Steps to reproduce." />
                {errors.description && <div className="invalid-feedback">{errors.description}</div>}
              </div>
              <FilePicker label="Attachment (optional)" current={form.attachment} onSelect={(f) => setForm({ ...form, attachment: f })} id="rp-a" buttonLabel="Attach screenshot" />
              <div>
                <label className="form-label required" htmlFor="rp-ct">Contact information</label>
                <input id="rp-ct" className={`form-control ${errors.contact ? 'is-invalid' : ''}`} value={form.contact} onChange={set('contact')} />
                {errors.contact && <div className="invalid-feedback">{errors.contact}</div>}
              </div>
            </div>
            <div className="card-footer bg-white d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light" onClick={() => { setForm(blank); setErrors({}); }}>Clear</button>
              <button className="btn btn-primary"><i className="bi bi-send me-1" />Submit report</button>
            </div>
          </form>
        </div>
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header">My report history</div>
            <DataTable rows={mine} pageSize={8} onRowClick={(r) => setOpenId(r.id)} empty="You haven't reported any problems yet" initialSort={{ key: 'createdAt', dir: 'desc' }}
              columns={[
                { key: 'id', label: 'Ticket ID', render: (r) => <span className="fw-semibold">{r.id}</span> },
                { key: 'title', label: 'Problem' },
                { key: 'priority', label: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
                { key: 'createdAt', label: 'Submitted', render: (r) => fmtDate(r.createdAt) },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              ]} />
          </div>
        </div>
      </div>

      <Modal open={!!ticket} onClose={() => setOpenId(null)} title={ticket ? `${ticket.id} · ${ticket.title}` : ''} size="lg">
        {ticket && <>
          <div className="d-flex flex-wrap gap-2 mb-3"><StatusBadge status={ticket.status} /><StatusBadge status={ticket.priority} /><span className="status-badge sb-gray">{ticket.category}</span></div>
          <p>{ticket.description}</p>
          {ticket.attachment && <p className="small"><i className="bi bi-paperclip" /> {ticket.attachment}</p>}
          <div className="row g-3">
            <div className="col-md-7">
              <h3 className="h6">Conversation with support</h3>
              <TicketThread ticket={ticket} />
              {!['Closed'].includes(ticket.status) && <div className="mt-3">
                <label className="form-label" htmlFor="tr">Reply</label>
                <textarea id="tr" className="form-control" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add more details for the support team" />
                <button className="btn btn-primary btn-sm mt-2" disabled={!reply.trim()} onClick={sendReply}>Send reply</button>
              </div>}
            </div>
            <div className="col-md-5">
              <h3 className="h6">Status history</h3>
              <ul className="timeline small">{ticket.history.map((h, i) => <li key={i} className="done"><div>{h.text}</div><small className="text-muted">{fmtDateTime(h.at)}</small></li>)}</ul>
            </div>
          </div>
        </>}
      </Modal>
    </>
  );
}
