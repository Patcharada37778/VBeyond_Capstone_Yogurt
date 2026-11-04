import { useEffect, useState } from 'react';
import { Modal } from '../modals/Modal';
import { fmtDate } from '../../utils/format';

const TOPIC_BG = {
  Policy: 'linear-gradient(120deg, #163f43, #2c6166)',
  'Project Launch': 'linear-gradient(120deg, #0f3236, #007d46)',
  Training: 'linear-gradient(120deg, #2c3e66, #2f6f9f)',
  System: 'linear-gradient(120deg, #1a2028, #3b6f74)',
  Event: 'linear-gradient(120deg, #5b3b9a, #2c6166)',
  General: 'linear-gradient(120deg, #3b6f74, #6a8f72)',
};

/** Image if the announcement has one, otherwise the topic on a brand-coloured panel. */
export function AnnouncementVisual({ a, height = 180, large = false }) {
  if (a.image) {
    return <img src={a.image} alt={a.title} className="announce-visual" style={{ height, objectFit: 'cover', width: '100%', display: 'block' }} />;
  }
  return (
    <div className="announce-visual announce-topic" style={{ height, background: TOPIC_BG[a.category] || TOPIC_BG.General }}>
      <span className="announce-topic-cat">{a.category}</span>
      <span className={large ? 'announce-topic-title lg' : 'announce-topic-title'}>{a.title}</span>
    </div>
  );
}

export function AnnouncementDetailModal({ a, onClose }) {
  return (
    <Modal open={!!a} onClose={onClose} title={a?.title} size="lg" footer={<button className="btn btn-primary" onClick={onClose}>Close</button>}>
      {a && <>
        <div className="rounded-3 overflow-hidden mb-3"><AnnouncementVisual a={a} height={a.image ? 320 : 200} large /></div>
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <span className="status-badge sb-teal">{a.category}</span>
          <small className="text-muted"><i className="bi bi-calendar3 me-1" />Posted {fmtDate(a.date)} by {a.author}</small>
        </div>
        {a.summary && <p className="fw-medium">{a.summary}</p>}
        {a.body.split('\n').map((p, i) => <p key={i} className="mb-2">{p}</p>)}
      </>}
    </Modal>
  );
}

/** Rotating banner of published announcements for agent dashboards. */
export function AnnouncementBanner({ items, onOpen }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  useEffect(() => {
    if (n < 2 || paused) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, paused]);
  if (!n) return null;
  const idx = i % n;
  const a = items[idx];
  return (
    <section className="announce-banner mb-3" aria-label="Company announcements" aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <button className="announce-slide" onClick={() => onOpen(a)} aria-label={`Open announcement: ${a.title}`}>
        <AnnouncementVisual a={a} height={220} large />
        <span className="announce-caption">
          <span className="small opacity-75">{a.image ? `${a.category} · ` : ''}Posted {fmtDate(a.date)}</span>
          {a.image && <span className="d-block fw-semibold">{a.title}</span>}
          <span className="small d-block mt-1">Tap to read more <i className="bi bi-arrow-right" /></span>
        </span>
      </button>
      {n > 1 && <>
        <button className="announce-nav prev" aria-label="Previous announcement" onClick={() => setI((idx - 1 + n) % n)}><i className="bi bi-chevron-left" /></button>
        <button className="announce-nav next" aria-label="Next announcement" onClick={() => setI((idx + 1) % n)}><i className="bi bi-chevron-right" /></button>
        <div className="announce-dots">
          {items.map((x, k) => <button key={x.id} className={k === idx ? 'active' : ''} aria-label={`Show announcement ${k + 1}`} aria-current={k === idx} onClick={() => setI(k)} />)}
        </div>
      </>}
    </section>
  );
}
