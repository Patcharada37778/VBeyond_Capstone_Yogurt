import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PropertyImage, roomsLabel, sizeLabel } from '../../components/PropertyShared';
import { copyText } from '../../components/InviteButton';
import { fmtMoney, fullName } from '../../utils/format';

/** Co-branded property sheet (AG-PM-04): VBEYOND brand + the agent's contact details, saved as PDF via print. */
export default function PropertyBrochure() {
  const { id } = useParams();
  const location = useLocation();
  const { state, user } = useStore();
  const toast = useToast();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.agent) return <Navigate to="/dashboard" replace />;
  const p = state.properties.find((x) => x.id === id);
  if (!p) return <Navigate to="/properties" replace />;
  const a = user.agent;

  const share = async () => {
    const text = `${p.name} — ${p.project}\n${p.district}, ${p.province} · ${fmtMoney(p.price)}\n${roomsLabel(p)} · ${p.bathrooms} bath · ${sizeLabel(p)}\n\nContact ${fullName(a)} (VBEYOND agent ${a.id})\n${a.phone} · ${a.email}`;
    if (navigator.share) {
      try { await navigator.share({ title: p.name, text }); } catch { /* share cancelled */ }
      return;
    }
    const ok = await copyText(text);
    toast(ok ? 'Property details copied — paste them to your customer.' : 'Could not copy. Please try again.', ok ? 'success' : 'warning');
  };

  return (
    <div className="brochure-page">
      <div className="brochure-toolbar no-print">
        <Link to={`/properties/${p.id}`} className="btn btn-light"><i className="bi bi-arrow-left me-1" aria-hidden="true" />Back to property</Link>
        <div className="d-flex gap-2">
          <button className="btn btn-light" onClick={share}><i className="bi bi-share me-1" aria-hidden="true" />Share</button>
          <button className="btn btn-primary" onClick={() => window.print()}><i className="bi bi-download me-1" aria-hidden="true" />Download PDF</button>
        </div>
      </div>
      <div className="brochure-hint no-print small text-muted">Choose “Save as PDF” in the print dialog to download.</div>

      <article className="brochure-sheet">
        <header className="brochure-head">
          <img src="/vbeyond-logo-color.png" alt="VBEYOND" />
          <div className="text-end small">
            <div className="fw-semibold">Presented by {fullName(a)}</div>
            <div className="text-muted">Authorised VBEYOND Agent · {a.id}</div>
          </div>
        </header>
        <PropertyImage src={p.images[0]} alt={p.name} height={300} />
        {p.images.length > 1 && <div className="brochure-thumbs">{p.images.slice(1, 3).map((src) => <img key={src} src={src} alt="" />)}</div>}
        <div className="small text-muted mt-3">{p.project}</div>
        <h1 className="h3 mb-1">{p.name}</h1>
        <div className="text-muted mb-2"><i className="bi bi-geo-alt me-1" aria-hidden="true" />{p.district}, {p.province}</div>
        <div className="font-brand fs-3 mb-3">{fmtMoney(p.price)}</div>
        <div className="brochure-facts">
          <div><small>Type</small><strong>{p.type}</strong></div>
          <div><small>Bedrooms</small><strong>{roomsLabel(p)}</strong></div>
          <div><small>Bathrooms</small><strong>{p.bathrooms}</strong></div>
          <div><small>Size</small><strong>{sizeLabel(p)}</strong></div>
        </div>
        <p className="mt-3">{p.description}</p>
        <footer className="brochure-agent">
          <div>
            <div className="small-caps">Your agent</div>
            <div className="fw-semibold fs-5">{fullName(a)}</div>
          </div>
          <div className="small">
            <div><i className="bi bi-telephone me-2" aria-hidden="true" />{a.phone}</div>
            <div><i className="bi bi-envelope me-2" aria-hidden="true" />{a.email}</div>
            {a.lineId && <div><i className="bi bi-line me-2" aria-hidden="true" />{a.lineId}</div>}
          </div>
        </footer>
        <div className="brochure-legal">Prices and availability are subject to change. VBEYOND Development · info@vbeyond.co.th</div>
      </article>
    </div>
  );
}
