import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, StatusBadge } from '../../components/common';
import { FavoriteButton, PropertyImage, roomsLabel, sizeLabel, useFavorites } from '../../components/PropertyShared';
import { copyText } from '../../components/InviteButton';
import { fmtDate, fmtMoney, fullName } from '../../utils/format';

/** Property detail (AG-PM-02) with favorites, team share link (AG-PM-05) and co-branded PDF (AG-PM-04). */
export default function PropertyDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { state, user } = useStore();
  const toast = useToast();
  const fav = useFavorites();
  const [img, setImg] = useState(0);
  const p = state.properties.find((x) => x.id === id);
  const sharedBy = state.agents.find((a) => a.id === params.get('ref') && a.id !== user.agent.id);

  if (!p) return <><PageHeader title="Property not found" crumbs={[{ label: 'Properties', to: '/properties' }]} /><div className="card"><EmptyState icon="bi-buildings" title="This property is no longer listed"><Link to="/properties">Back to the directory</Link></EmptyState></div></>;

  const shareWithTeam = async () => {
    const ok = await copyText(`${window.location.origin}/properties/${p.id}?ref=${user.agent.id}`);
    toast(ok ? 'Team link copied. Agents must sign in to open it.' : 'Could not copy the link. Please try again.', ok ? 'success' : 'warning');
  };
  const na = <span className="text-muted">Not specified</span>;

  return (
    <>
      <PageHeader title={p.name} subtitle={`${p.project} · ${p.district}, ${p.province}`}
        crumbs={[{ label: 'Properties' }, { label: 'Property Directory', to: '/properties' }, { label: p.name }]}
        actions={<>
          <FavoriteButton property={p} fav={fav} className="btn-light border" />
          <button className="btn btn-light" onClick={shareWithTeam}><i className="bi bi-link-45deg me-1" aria-hidden="true" />Share with team</button>
          <Link to={`/properties/${p.id}/brochure`} className="btn btn-primary"><i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />Co-branded PDF</Link>
        </>} />

      {sharedBy && <div className="alert alert-brand small"><i className="bi bi-people me-1" aria-hidden="true" />Shared with you by <strong>{fullName(sharedBy)}</strong>.</div>}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card overflow-hidden">
            <PropertyImage src={p.images[img]} alt={`${p.name} — image ${img + 1}`} height={360} />
            {p.images.length > 1 && (
              <div className="d-flex gap-2 p-2">
                {p.images.map((src, i) => (
                  <button key={src + i} className={`property-thumb ${i === img ? 'active' : ''}`} onClick={() => setImg(i)} aria-label={`Show image ${i + 1}`} aria-current={i === img}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="font-brand fs-3">{fmtMoney(p.price)}</div>
                <StatusBadge status={p.status} />
              </div>
              <dl className="dl-grid mt-3 mb-3">
                <div><dt>Project</dt><dd>{p.project}</dd></div>
                <div><dt>Property type</dt><dd>{p.type}</dd></div>
                <div><dt>Location</dt><dd>{p.district}, {p.province}</dd></div>
                <div><dt>Bedrooms</dt><dd>{roomsLabel(p)}</dd></div>
                <div><dt>Bathrooms</dt><dd>{p.bathrooms ?? na}</dd></div>
                <div><dt>Size</dt><dd>{p.size ? sizeLabel(p) : na}</dd></div>
                <div><dt>Listed</dt><dd>{fmtDate(p.listedAt)}</dd></div>
                <div><dt>Property ID</dt><dd>{p.id}</dd></div>
              </dl>
              <h2 className="small-caps">Description</h2>
              <p className="mb-0">{p.description || na}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
