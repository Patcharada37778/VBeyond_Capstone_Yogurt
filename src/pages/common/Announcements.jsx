import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { logAction, nextId, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, SearchInput, Select, StatusBadge, Tabs } from '../../components/common';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { fmtDate } from '../../utils/format';

const CATEGORIES = ['Policy', 'Project Launch', 'Training', 'System', 'Event', 'General'];
const blank = { title: '', category: 'General', summary: '', body: '' };

export default function Announcements() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [tab, setTab] = useState('Published');
  const [editing, setEditing] = useState(null); // {id?, ...fields}
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const me = user.keys[0];
  const manage = can('announcements', 'create') || can('announcements', 'edit');
  const openId = params.get('open');
  const opened = state.announcements.find((a) => a.id === openId);

  useEffect(() => {
    if (opened && !opened.readBy.includes(me)) mutate((d) => { d.announcements.find((a) => a.id === opened.id).readBy.push(me); });
  }, [opened, me, mutate]);

  const list = useMemo(() => state.announcements
    .filter((a) => (manage ? a.status === tab : a.status === 'Published'))
    .filter((a) => cat === 'All' || a.category === cat)
    .filter((a) => !q || `${a.title} ${a.summary}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [state.announcements, manage, tab, cat, q]);

  const save = (publish) => {
    const e = {};
    if (editing.title.trim().length < 5) e.title = 'Enter a title (at least 5 characters).';
    if (editing.summary.trim().length < 10) e.summary = 'Enter a short description.';
    if (editing.body.trim().length < 20) e.body = 'Enter the full announcement (at least 20 characters).';
    setErrors(e);
    if (Object.keys(e).length) return;
    mutate((d) => {
      let a = d.announcements.find((x) => x.id === editing.id);
      if (!a) { a = { id: nextId(d, 'ann', 'AN-', 3), readBy: [], author: user.name, status: 'Draft', date: new Date().toISOString() }; d.announcements.unshift(a); }
      Object.assign(a, { title: editing.title.trim(), category: editing.category, summary: editing.summary.trim(), body: editing.body.trim() });
      if (publish) {
        a.status = 'Published'; a.date = new Date().toISOString();
        notify(d, ['allAgents', 'allApplicants'], { category: 'Company announcements', title: `New announcement: ${a.title}`, body: a.summary, link: `/announcements?open=${a.id}` });
      }
      logAction(d, user, publish ? 'Published announcement' : 'Saved announcement draft', a.title);
    });
    toast(publish ? 'Announcement published and agents notified.' : 'Draft saved.');
    setEditing(null);
    if (publish) setTab('Published'); else setTab('Draft');
  };

  const setStatus = (a, status) => {
    mutate((d) => {
      const x = d.announcements.find((y) => y.id === a.id);
      x.status = status;
      if (status === 'Published') { x.date = new Date().toISOString(); notify(d, ['allAgents', 'allApplicants'], { category: 'Company announcements', title: `New announcement: ${x.title}`, body: x.summary, link: `/announcements?open=${x.id}` }); }
      logAction(d, user, `${status === 'Archived' ? 'Archived' : status === 'Published' ? 'Published' : 'Restored'} announcement`, x.title);
    });
    toast(`Announcement ${status.toLowerCase()}.`);
    setConfirm(null);
  };

  return (
    <>
      <PageHeader title="Company Announcements & News" subtitle="Updates, policies and project news from VBEYOND." crumbs={[{ label: 'Common Services' }, { label: 'Announcements' }]}
        actions={can('announcements', 'create') && <button className="btn btn-primary" onClick={() => { setErrors({}); setEditing({ ...blank }); }}><i className="bi bi-plus-lg me-1" />New announcement</button>} />

      {manage && <Tabs active={tab} onChange={setTab} tabs={['Published', 'Draft', 'Archived'].map((s) => ({ key: s, label: s, count: state.announcements.filter((a) => a.status === s).length }))} />}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search announcements" className="flex-grow-1" />
        <Select value={cat} onChange={setCat} label="Category" options={['All', ...CATEGORIES].map((c) => ({ value: c, label: c === 'All' ? 'All categories' : c }))} />
      </div>

      {list.length ? (
        <div className="row g-3">
          {list.map((a) => {
            const unread = a.status === 'Published' && !a.readBy.includes(me);
            return (
              <div className="col-md-6 col-xl-4" key={a.id}>
                <div className="card h-100">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <span className="status-badge sb-teal">{a.category}</span>
                      {unread ? <span className="badge bg-success">New</span> : manage ? <StatusBadge status={a.status} /> : <small className="text-muted"><i className="bi bi-check2-all" /> Read</small>}
                    </div>
                    <h3 className={`h6 mb-1 ${unread ? 'fw-bold' : ''}`}>{a.title}</h3>
                    <small className="text-muted mb-2">{fmtDate(a.date)} · {a.author}</small>
                    <p className="small text-muted flex-grow-1">{a.summary}</p>
                    <div className="d-flex flex-wrap gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setParams({ open: a.id })}>Read more</button>
                      {can('announcements', 'edit') && a.status !== 'Archived' && <button className="btn btn-sm btn-light" onClick={() => { setErrors({}); setEditing({ ...a }); }}><i className="bi bi-pencil" /> Edit</button>}
                      {can('announcements', 'edit') && a.status === 'Draft' && <button className="btn btn-sm btn-success" onClick={() => setStatus(a, 'Published')}>Publish</button>}
                      {can('announcements', 'edit') && a.status === 'Published' && <button className="btn btn-sm btn-light" onClick={() => setConfirm(a)}><i className="bi bi-archive" /> Archive</button>}
                      {can('announcements', 'edit') && a.status === 'Archived' && <button className="btn btn-sm btn-light" onClick={() => setStatus(a, 'Draft')}>Restore to draft</button>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : <div className="card"><EmptyState icon="bi-megaphone" title="No announcements match your filters" /></div>}

      <Modal open={!!opened} onClose={() => setParams({})} title={opened?.title} size="lg"
        footer={<button className="btn btn-primary" onClick={() => setParams({})}>Close</button>}>
        {opened && <>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <span className="status-badge sb-teal">{opened.category}</span>
            <small className="text-muted">Published {fmtDate(opened.date)} by {opened.author}</small>
          </div>
          <p className="fw-medium">{opened.summary}</p>
          {opened.body.split('\n').map((p, i) => <p key={i} className="mb-2">{p}</p>)}
        </>}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit announcement' : 'New announcement'} size="lg"
        footer={<>
          <button className="btn btn-light" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-outline-primary" onClick={() => save(false)}>Save as draft</button>
          <button className="btn btn-primary" onClick={() => save(true)}>Publish now</button>
        </>}>
        {editing && <div className="d-grid gap-3">
          <div>
            <label className="form-label required" htmlFor="an-t">Title</label>
            <input id="an-t" className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
          </div>
          <div>
            <label className="form-label required" htmlFor="an-c">Category</label>
            <select id="an-c" className="form-select" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="form-label required" htmlFor="an-s">Short description</label>
            <input id="an-s" className={`form-control ${errors.summary ? 'is-invalid' : ''}`} value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            {errors.summary && <div className="invalid-feedback">{errors.summary}</div>}
          </div>
          <div>
            <label className="form-label required" htmlFor="an-b">Full announcement</label>
            <textarea id="an-b" rows={7} className={`form-control ${errors.body ? 'is-invalid' : ''}`} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            {errors.body && <div className="invalid-feedback">{errors.body}</div>}
          </div>
        </div>}
      </Modal>

      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} title="Archive announcement?" confirmLabel="Archive" onConfirm={() => setStatus(confirm, 'Archived')}>
        "{confirm?.title}" will be hidden from agents. You can restore it later from the Archived tab.
      </ConfirmModal>
    </>
  );
}
