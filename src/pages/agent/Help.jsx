import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, SearchInput, StatusBadge } from '../../components/common';
import { Modal } from '../../components/modals/Modal';
import { ChatThread } from '../common/ContactSupport';
import { timeAgo } from '../../utils/format';

export const FAQ_CATEGORIES = ['Registration', 'Documents', 'Membership', 'Account', 'Commission', 'Teams'];

export default function Help() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [cat, setCat] = useState('All');
  const [openFaq, setOpenFaq] = useState(null);
  const [ask, setAsk] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'Registration', message: '' });
  const [errors, setErrors] = useState({});
  const [viewId, setViewId] = useState(null);
  const [reply, setReply] = useState('');
  const isProspect = user.role === 'prospect';

  const faqs = state.faqs.filter((f) => f.published && (cat === 'All' || f.category === cat) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q.toLowerCase())));
  const myInq = state.inquiries.filter((i) => i.userKey === user.email).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const viewing = state.inquiries.find((i) => i.id === viewId);

  const submit = () => {
    const e = {};
    if (form.subject.trim().length < 5) e.subject = 'Enter a subject.';
    if (form.message.trim().length < 10) e.message = 'Enter your question (at least 10 characters).';
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = `INQ-${String(state.counters.inq).padStart(4, '0')}`;
    mutate((d) => {
      d.counters.inq++;
      const now = new Date().toISOString();
      d.inquiries.unshift({ id, name: user.name, email: user.email, userKey: user.email, subject: form.subject.trim(), category: form.category, status: 'Open', assignedTo: null, createdAt: now, applicationId: user.application?.id || null,
        messages: [{ by: user.name, staff: false, at: now, text: form.message.trim() }] });
      notify(d, ['role:support', 'role:compliance'], { category: 'Registration updates', title: `New applicant inquiry from ${user.name}`, body: form.subject.trim(), link: `/inquiries?open=${id}` });
      logAction(d, user, 'Submitted applicant inquiry', id);
    });
    setAsk(false); setForm({ subject: '', category: 'Registration', message: '' });
    toast(`Your question was sent (${id}). We'll reply in your notifications.`);
  };

  const sendReply = () => {
    if (!reply.trim()) return;
    mutate((d) => {
      const i = d.inquiries.find((x) => x.id === viewId);
      i.messages.push({ by: user.name, staff: false, at: new Date().toISOString(), text: reply.trim() });
      i.status = 'Open';
      notify(d, i.assignedTo ? [`admin:${i.assignedTo}`] : ['role:support'], { category: 'Registration updates', title: `${user.name} replied to ${i.id}`, body: i.subject, link: `/inquiries?open=${i.id}` });
    });
    setReply('');
  };

  return (
    <>
      <PageHeader title={isProspect ? 'Help & Inquiries' : 'Frequently Asked Questions'} subtitle="Find answers about registration, documents and membership." crumbs={[{ label: isProspect ? 'Help & Inquiries' : 'FAQ' }]}
        actions={isProspect ? <button className="btn btn-primary" onClick={() => { setErrors({}); setAsk(true); }}><i className="bi bi-chat-square-text me-1" />Ask a question</button>
          : <Link to="/contact-support" className="btn btn-outline-primary"><i className="bi bi-headset me-1" />Contact support</Link>} />
      <div className="row g-3">
        <div className={isProspect ? 'col-lg-8' : 'col-12'}>
          <div className="card">
            <div className="card-body">
              <SearchInput value={q} onChange={setQ} placeholder="Search frequently asked questions" />
              <div className="d-flex flex-wrap gap-2 mt-3">
                {['All', ...FAQ_CATEGORIES].map((c) => <button key={c} className={`btn btn-sm ${cat === c ? 'btn-primary' : 'btn-light'}`} onClick={() => setCat(c)}>{c}</button>)}
              </div>
            </div>
            <div className="list-group list-group-flush">
              {faqs.map((f) => (
                <div key={f.id} className="list-group-item">
                  <button className="btn w-100 text-start d-flex justify-content-between align-items-center px-0 fw-semibold" aria-expanded={openFaq === f.id} onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}>
                    <span>{f.q}</span><i className={`bi ${openFaq === f.id ? 'bi-dash' : 'bi-plus'} fs-5 text-brand`} />
                  </button>
                  {openFaq === f.id && <div className="pb-2 text-muted"><span className="status-badge sb-teal me-2">{f.category}</span>{f.a}</div>}
                </div>
              ))}
            </div>
            {!faqs.length && <EmptyState icon="bi-search" title="No matching questions">Try another keyword{isProspect ? ' or ask our team directly' : ''}.</EmptyState>}
          </div>
        </div>
        {isProspect && (
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header">My inquiries</div>
              <div className="list-group list-group-flush">
                {myInq.map((i) => (
                  <button key={i.id} className="list-group-item list-group-item-action" onClick={() => setViewId(i.id)}>
                    <div className="d-flex justify-content-between gap-2"><span className="fw-medium text-truncate">{i.subject}</span><StatusBadge status={i.status} /></div>
                    <small className="text-muted">{i.id} · {timeAgo(i.messages[i.messages.length - 1].at)}</small>
                  </button>
                ))}
              </div>
              {!myInq.length && <EmptyState icon="bi-chat-square" title="No questions yet">Can't find an answer? Ask our team.</EmptyState>}
            </div>
          </div>
        )}
      </div>

      <Modal open={ask} onClose={() => setAsk(false)} title="Ask about agent registration" footer={<><button className="btn btn-light" onClick={() => setAsk(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Send question</button></>}>
        <div className="d-grid gap-3">
          <div><label className="form-label required" htmlFor="iq-s">Subject</label><input id="iq-s" className={`form-control ${errors.subject ? 'is-invalid' : ''}`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />{errors.subject && <div className="invalid-feedback">{errors.subject}</div>}</div>
          <div><label className="form-label" htmlFor="iq-c">Topic</label><select id="iq-c" className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{FAQ_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="form-label required" htmlFor="iq-m">Your question</label><textarea id="iq-m" rows={4} className={`form-control ${errors.message ? 'is-invalid' : ''}`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />{errors.message && <div className="invalid-feedback">{errors.message}</div>}</div>
        </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewId(null)} title={viewing?.subject} size="lg">
        {viewing && <>
          <div className="mb-3 d-flex gap-2"><StatusBadge status={viewing.status} /><span className="status-badge sb-gray">{viewing.id}</span></div>
          <ChatThread messages={viewing.messages} />
          {viewing.status !== 'Closed' && <div className="d-flex gap-2 mt-3">
            <input className="form-control" aria-label="Reply" placeholder="Add a follow-up…" value={reply} onChange={(e) => setReply(e.target.value)} />
            <button className="btn btn-primary" disabled={!reply.trim()} onClick={sendReply}>Send</button>
          </div>}
        </>}
      </Modal>
    </>
  );
}
