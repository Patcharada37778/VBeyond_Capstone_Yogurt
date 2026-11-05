import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { EmptyState, PageHeader, SearchInput } from '../../components/common';

export const FAQ_CATEGORIES = ['Registration', 'Documents', 'Membership', 'Account', 'Commission', 'Teams'];

/** Published FAQ list. Shown on the prospective agent's dashboard (embedded) and at /help. */
export default function Help({ embedded = false }) {
  const { state } = useStore();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [cat, setCat] = useState('All');
  const [openFaq, setOpenFaq] = useState(null);
  const faqs = state.faqs.filter((f) => (cat === 'All' || f.category === cat) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      {embedded ? (
        <div className="mb-3">
          <h2 className="h5 mb-0">Frequently asked questions</h2>
          <small className="text-muted">Answers about registration, documents and membership.</small>
        </div>
      ) : (
        <PageHeader title="Frequently Asked Questions" subtitle="Answers about registration, documents and membership." crumbs={[{ label: 'FAQ' }]} />
      )}
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
              <button className="btn faq-question w-100 text-start d-flex justify-content-between align-items-center px-0 fw-semibold" aria-expanded={openFaq === f.id} onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}>
                <span className="flex-grow-1">{f.q}</span>
                <span className="status-badge sb-teal ms-2 me-2">{f.category}</span>
                <i className={`bi ${openFaq === f.id ? 'bi-dash' : 'bi-plus'} fs-5 text-brand`} />
              </button>
              {openFaq === f.id && <div className="pb-2 text-muted">{f.a}</div>}
            </div>
          ))}
        </div>
        {!faqs.length && <EmptyState icon="bi-search" title="No matching questions">Try another keyword, or email <a href="mailto:info@vbeyond.co.th">info@vbeyond.co.th</a>.</EmptyState>}
      </div>
    </>
  );
}
