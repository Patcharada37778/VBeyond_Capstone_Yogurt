import { useState } from 'react';
import { logAction, nextId, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SearchInput, Select } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { FAQ_CATEGORIES } from '../agent/Help';
import { fmtDate } from '../../utils/format';

export default function FaqManage() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [edit, setEdit] = useState(null);
  const [errors, setErrors] = useState({});
  const [del, setDel] = useState(null);
  const rows = state.faqs.filter((f) => (cat === 'All' || f.category === cat) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q.toLowerCase())));

  const save = () => {
    const e = {};
    if (edit.q.trim().length < 8) e.q = 'Enter the question (at least 8 characters).';
    if (edit.a.trim().length < 15) e.a = 'Enter the answer (at least 15 characters).';
    setErrors(e);
    if (Object.keys(e).length) return;
    mutate((d) => {
      let f = d.faqs.find((x) => x.id === edit.id);
      if (!f) { f = { id: nextId(d, 'faq', 'FAQ-', 2) }; d.faqs.unshift(f); }
      Object.assign(f, { q: edit.q.trim(), a: edit.a.trim(), category: edit.category, published: true, updatedAt: new Date().toISOString() });
      logAction(d, user, edit.id ? 'Edited FAQ' : 'Added FAQ', f.q);
    });
    toast(edit.id ? 'FAQ updated.' : 'FAQ added.');
    setEdit(null);
  };
  const remove = () => {
    mutate((d) => { d.faqs = d.faqs.filter((x) => x.id !== del.id); logAction(d, user, 'Deleted FAQ', del.q); });
    toast('FAQ deleted.'); setDel(null);
  };

  return (
    <>
      <PageHeader title="FAQ Management" subtitle="Questions and answers shown to prospective agents on their dashboard." crumbs={[{ label: 'Agent Team Management' }, { label: 'FAQ' }]}
        actions={can('faq', 'create') && <button className="btn btn-primary" onClick={() => { setErrors({}); setEdit({ q: '', a: '', category: 'Registration' }); }}><i className="bi bi-plus-lg me-1" />Add FAQ</button>} />
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search questions and answers" className="flex-grow-1" />
          <Select value={cat} onChange={setCat} label="Category" options={['All', ...FAQ_CATEGORIES].map((c) => ({ value: c, label: c === 'All' ? 'All categories' : c }))} />
        </div>
        <DataTable rows={rows} initialSort={{ key: 'updatedAt', dir: 'desc' }}
          columns={[
            { key: 'q', label: 'Question', render: (f) => <div style={{ maxWidth: 460 }}><div className="fw-medium">{f.q}</div><small className="text-muted d-block text-truncate">{f.a}</small></div> },
            { key: 'category', label: 'Category', render: (f) => <span className="status-badge sb-teal">{f.category}</span> },
            { key: 'updatedAt', label: 'Updated', render: (f) => fmtDate(f.updatedAt) },
            { key: 'actions', label: '', render: (f) => <div className="d-flex gap-1 justify-content-end">
              {can('faq', 'edit') && <button className="btn btn-sm btn-light" onClick={() => { setErrors({}); setEdit({ ...f }); }} aria-label="Edit"><i className="bi bi-pencil" /></button>}
              {can('faq', 'delete') && <button className="btn btn-sm btn-light text-danger" onClick={() => setDel(f)} aria-label="Delete"><i className="bi bi-trash" /></button>}
            </div> },
          ]} />
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit FAQ' : 'Add FAQ'} size="lg" footer={<><button className="btn btn-light" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save FAQ</button></>}>
        {edit && <div className="d-grid gap-3">
          <div><label className="form-label required" htmlFor="fq">Question</label><input id="fq" className={`form-control ${errors.q ? 'is-invalid' : ''}`} value={edit.q} onChange={(e) => setEdit({ ...edit, q: e.target.value })} />{errors.q && <div className="invalid-feedback">{errors.q}</div>}</div>
          <div><label className="form-label required" htmlFor="fa">Answer</label><textarea id="fa" rows={5} className={`form-control ${errors.a ? 'is-invalid' : ''}`} value={edit.a} onChange={(e) => setEdit({ ...edit, a: e.target.value })} />{errors.a && <div className="invalid-feedback">{errors.a}</div>}</div>
          <div className="row g-2">
            <div className="col-md-6"><label className="form-label" htmlFor="fc">Category</label><select id="fc" className="form-select" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{FAQ_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
        </div>}
      </Modal>
      <ConfirmModal open={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete FAQ?" confirmLabel="Delete" variant="danger">"{del?.q}" will be permanently removed.</ConfirmModal>
    </>
  );
}
