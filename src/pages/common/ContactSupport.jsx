import { useState } from 'react';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, StatusBadge } from '../../components/common';
import { Modal } from '../../components/modals/Modal';
import { fmtDateTime, timeAgo } from '../../utils/format';

export function ChatThread({ messages, staffView }) {
  return (
    <div className="d-grid gap-2">
      {messages.map((m, i) => (
        <div key={i} className={`chat-bubble ${(staffView ? m.staff : !m.staff) ? 'me' : 'them'}`}>
          <div className="small fw-semibold mb-1">{m.by}{m.auto ? ' · automated' : ''}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
          <div className="small opacity-75 mt-1">{fmtDateTime(m.at)}</div>
        </div>
      ))}
    </div>
  );
}

export default function ContactSupport() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const mine = state.threads.filter((t) => t.fromKey === user.keys[0]).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const myTickets = state.issues.filter((t) => t.reporterKey === user.keys[0]);
  const [activeId, setActiveId] = useState(mine[0]?.id || null);
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '', relatedIssue: '' });
  const [errors, setErrors] = useState({});
  const [reply, setReply] = useState('');
  const active = state.threads.find((t) => t.id === activeId);

  const autoAck = (id) => {
    setTimeout(() => {
      mutate((d) => {
        const t = d.threads.find((x) => x.id === id);
        if (t) t.messages.push({ by: 'VBEYOND Support', staff: true, auto: true, at: new Date().toISOString(), text: 'Thank you for contacting VBEYOND Support. Your message has been received and a support officer will reply within one business day.' });
      });
    }, 1500);
  };

  const send = () => {
    const er = {};
    if (form.subject.trim().length < 4) er.subject = 'Enter a subject.';
    if (form.message.trim().length < 10) er.message = 'Enter your message (at least 10 characters).';
    setErrors(er);
    if (Object.keys(er).length) return;
    const id = `MSG-${state.counters.msg}`;
    mutate((d) => {
      d.counters.msg++;
      const now = new Date().toISOString();
      d.threads.unshift({ id, subject: form.subject.trim(), relatedIssue: form.relatedIssue, fromKey: user.keys[0], fromName: user.name, status: 'Open', createdAt: now,
        messages: [{ by: user.name, staff: false, at: now, text: form.message.trim() }] });
      notify(d, 'role:support', { category: 'System issue updates', title: `New message from ${user.name}`, body: form.subject.trim(), link: `/support-inbox?open=${id}` });
      logAction(d, user, 'Contacted support', id);
    });
    autoAck(id);
    setActiveId(id); setCompose(false); setForm({ subject: '', message: '', relatedIssue: '' });
    toast('Message sent to the support team.');
  };

  const sendReply = () => {
    if (!reply.trim()) return;
    mutate((d) => {
      const t = d.threads.find((x) => x.id === activeId);
      t.messages.push({ by: user.name, staff: false, at: new Date().toISOString(), text: reply.trim() });
      t.status = 'Open';
      notify(d, 'role:support', { category: 'System issue updates', title: `${user.name} replied`, body: t.subject, link: `/support-inbox?open=${t.id}` });
    });
    setReply('');
  };

  return (
    <>
      <PageHeader title="Contact the System Admin" subtitle="Send a message to the VBEYOND support and system admin team." crumbs={[{ label: 'Common Services' }, { label: 'Contact Support' }]}
        actions={<button className="btn btn-primary" onClick={() => { setErrors({}); setCompose(true); }}><i className="bi bi-pencil-square me-1" />New message</button>} />
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header">Contact history</div>
            <div className="list-group list-group-flush">
              {mine.map((t) => (
                <button key={t.id} className={`list-group-item list-group-item-action ${t.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(t.id)}>
                  <div className="d-flex justify-content-between gap-2"><span className="fw-semibold text-truncate">{t.subject}</span><small className="text-nowrap">{timeAgo(t.messages[t.messages.length - 1].at)}</small></div>
                  <small className="d-block text-truncate opacity-75">{t.messages[t.messages.length - 1].text}</small>
                </button>
              ))}
            </div>
            {!mine.length && <EmptyState icon="bi-chat-left" title="No messages yet">Start a conversation with the support team.</EmptyState>}
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card h-100">
            {active ? <>
              <div className="card-header d-flex justify-content-between align-items-center gap-2">
                <span>{active.subject} <small className="text-muted fw-normal">· {active.id}{active.relatedIssue ? ` · related to ${active.relatedIssue}` : ''}</small></span>
                <StatusBadge status={active.status} />
              </div>
              <div className="card-body" style={{ minHeight: 280 }}><ChatThread messages={active.messages} /></div>
              {active.status !== 'Closed' ? (
                <div className="card-footer bg-white d-flex gap-2">
                  <input className="form-control" aria-label="Reply" placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }} />
                  <button className="btn btn-primary" disabled={!reply.trim()} onClick={sendReply}><i className="bi bi-send" /><span className="visually-hidden">Send</span></button>
                </div>
              ) : <div className="card-footer bg-white small text-muted">This conversation was closed by support. Start a new message if you need more help.</div>}
            </> : <EmptyState icon="bi-headset" title="Select a conversation">Or start a new message to the support team.</EmptyState>}
          </div>
        </div>
      </div>

      <Modal open={compose} onClose={() => setCompose(false)} title="New message to support" footer={<><button className="btn btn-light" onClick={() => setCompose(false)}>Cancel</button><button className="btn btn-primary" onClick={send}>Send message</button></>}>
        <div className="d-grid gap-3">
          <div>
            <label className="form-label required" htmlFor="cs-s">Subject</label>
            <input id="cs-s" className={`form-control ${errors.subject ? 'is-invalid' : ''}`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            {errors.subject && <div className="invalid-feedback">{errors.subject}</div>}
          </div>
          <div>
            <label className="form-label" htmlFor="cs-r">Related issue (optional)</label>
            <select id="cs-r" className="form-select" value={form.relatedIssue} onChange={(e) => setForm({ ...form, relatedIssue: e.target.value })}>
              <option value="">None</option>
              {myTickets.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.title}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label required" htmlFor="cs-m">Message</label>
            <textarea id="cs-m" rows={5} className={`form-control ${errors.message ? 'is-invalid' : ''}`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            {errors.message && <div className="invalid-feedback">{errors.message}</div>}
          </div>
        </div>
      </Modal>
    </>
  );
}
