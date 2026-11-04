import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, SearchInput, StatusBadge, Tabs } from '../../components/common';
import { ChatThread } from '../common/ContactSupport';
import { timeAgo } from '../../utils/format';

export default function SupportInbox() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('Open');
  const [q, setQ] = useState('');
  const [reply, setReply] = useState('');
  const canReply = can('messages', 'edit') || can('messages', 'create');
  const list = state.threads.filter((t) => (tab === 'All' || t.status === tab) && (!q || `${t.subject} ${t.fromName}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => new Date(b.messages[b.messages.length - 1].at) - new Date(a.messages[a.messages.length - 1].at));
  const active = state.threads.find((t) => t.id === params.get('open')) || list[0];

  const send = () => {
    if (!reply.trim()) return;
    mutate((d) => {
      const t = d.threads.find((x) => x.id === active.id);
      t.messages.push({ by: user.name, staff: true, at: new Date().toISOString(), text: reply.trim() });
      t.status = 'Answered';
      notify(d, t.fromKey, { category: 'System issue updates', title: `Support replied: ${t.subject}`, body: reply.trim().slice(0, 100), link: '/contact-support' });
      logAction(d, user, 'Replied to support message', t.id);
    });
    setReply('');
    toast('Reply sent.');
  };
  const setStatus = (s) => { mutate((d) => { d.threads.find((x) => x.id === active.id).status = s; }); toast(`Conversation ${s.toLowerCase()}.`); };
  const escalate = () => {
    const id = `TCK-${state.counters.ticket}`;
    mutate((d) => {
      d.counters.ticket++;
      const t = d.threads.find((x) => x.id === active.id);
      const now = new Date().toISOString();
      d.issues.unshift({ id, title: t.subject, category: 'Other', description: t.messages.map((m) => `${m.by}: ${m.text}`).join('\n'), priority: 'Medium', status: 'Open', reporterKey: t.fromKey, reporterName: t.fromName, contact: '', createdAt: now, assignedTo: null, escalated: true, attachment: null, notes: [{ at: now, by: user.name, text: `Escalated from support message ${t.id}` }], responses: [], userReplies: [], history: [{ at: now, text: `Escalated to IT from ${t.id}`, by: user.name }] });
      t.relatedIssue = id;
      t.messages.push({ by: user.name, staff: true, at: now, text: `I've logged this as support ticket ${id}. You can track it under Report a Problem.` });
      notify(d, 'role:support', { category: 'System issue updates', title: `New ticket from message: ${t.subject}`, body: `${id} from ${t.fromName}`, link: `/system-issues?open=${id}` });
      notify(d, t.fromKey, { category: 'System issue updates', title: `Your message was logged as ticket ${id}`, body: t.subject, link: '/report-problem' });
      logAction(d, user, 'Converted support message to ticket', `${t.id} → ${id}`);
    });
    toast(`Logged as ticket ${id} in System Issues.`);
  };

  return (
    <>
      <PageHeader title="Support Messages" subtitle="Communicate with agents and applicants who contacted support." crumbs={[{ label: 'Common Services' }, { label: 'Support Messages' }]} />
      <Tabs active={tab} onChange={setTab} tabs={['Open', 'Answered', 'Closed', 'All'].map((s) => ({ key: s, label: s, count: s === 'All' ? state.threads.length : state.threads.filter((t) => t.status === s).length }))} />
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card">
            <div className="p-2 border-bottom"><SearchInput value={q} onChange={setQ} placeholder="Search messages" /></div>
            <div className="list-group list-group-flush">
              {list.map((t) => (
                <button key={t.id} className={`list-group-item list-group-item-action ${active?.id === t.id ? 'active' : ''}`} onClick={() => setParams({ open: t.id })}>
                  <div className="d-flex justify-content-between gap-2"><span className="fw-semibold text-truncate">{t.fromName}</span><small className="text-nowrap">{timeAgo(t.messages[t.messages.length - 1].at)}</small></div>
                  <small className="d-block text-truncate">{t.subject}</small>
                </button>
              ))}
            </div>
            {!list.length && <EmptyState icon="bi-inbox" title="No conversations" />}
          </div>
        </div>
        <div className="col-lg-8">
          {active ? (
            <div className="card">
              <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span>{active.subject} <small className="text-muted fw-normal">· {active.fromName}{active.relatedIssue ? ` · ${active.relatedIssue}` : ''}</small></span>
                <div className="d-flex gap-2 align-items-center"><StatusBadge status={active.status} />
                  {canReply && !active.relatedIssue && active.status !== 'Closed' && <button className="btn btn-sm btn-outline-primary" onClick={escalate}><i className="bi bi-ticket-perforated me-1" />Create ticket</button>}
                  {canReply && (active.status === 'Closed' ? <button className="btn btn-sm btn-light" onClick={() => setStatus('Open')}>Reopen</button> : <button className="btn btn-sm btn-light" onClick={() => setStatus('Closed')}>Close</button>)}
                </div>
              </div>
              <div className="card-body" style={{ minHeight: 300 }}><ChatThread messages={active.messages} staffView /></div>
              {canReply && active.status !== 'Closed' && <div className="card-footer bg-white d-flex gap-2">
                <textarea className="form-control" rows={2} aria-label="Reply" placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                <button className="btn btn-primary align-self-end" disabled={!reply.trim()} onClick={send}>Send</button>
              </div>}
            </div>
          ) : <div className="card"><EmptyState icon="bi-chat-left-text" title="No conversation selected" /></div>}
        </div>
      </div>
    </>
  );
}
