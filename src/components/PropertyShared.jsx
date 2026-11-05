import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from './common';
import { fmtMoney } from '../utils/format';

/** Property image, or a placeholder when the listing has no image. */
export function PropertyImage({ src, alt, height = 180 }) {
  if (src) return <img src={src} alt={alt} className="property-img" style={{ height }} />;
  return (
    <div className="property-img property-img-empty" style={{ height }} role="img" aria-label="No image available">
      <i className="bi bi-image" aria-hidden="true" /><small>No image available</small>
    </div>
  );
}

export const roomsLabel = (p) => (p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} bed`);
export const sizeLabel = (p) => (p.size ? `${p.size} sq.m.` : 'Size not specified');

export function useFavorites() {
  const { state, user, mutate } = useStore();
  const toast = useToast();
  const id = user.agent.id;
  const list = state.favorites?.[id] || [];
  const toggle = (p) => {
    const on = list.includes(p.id);
    mutate((d) => {
      d.favorites ||= {};
      const cur = d.favorites[id] || [];
      d.favorites[id] = on ? cur.filter((x) => x !== p.id) : [...cur, p.id];
    });
    toast(on ? `${p.name} removed from favorites` : `${p.name} saved to favorites`, on ? 'info' : 'success');
  };
  return { list, toggle, has: (pid) => list.includes(pid) };
}

export function FavoriteButton({ property, fav, className = '' }) {
  const on = fav.has(property.id);
  return (
    <button type="button" className={`btn fav-btn ${on ? 'on' : ''} ${className}`} onClick={() => fav.toggle(property)}
      aria-pressed={on} aria-label={on ? `Remove ${property.name} from favorites` : `Save ${property.name} to favorites`} title={on ? 'Remove from favorites' : 'Save to favorites'}>
      <i className={`bi ${on ? 'bi-heart-fill' : 'bi-heart'}`} aria-hidden="true" />
    </button>
  );
}

export function PropertyCard({ p, fav }) {
  return (
    <div className="card property-card h-100">
      <div className="position-relative">
        <Link to={`/properties/${p.id}`} tabIndex={-1} aria-hidden="true"><PropertyImage src={p.images[0]} alt={p.name} /></Link>
        <FavoriteButton property={p} fav={fav} className="position-absolute top-0 end-0 m-2" />
        {p.status !== 'Available' && <span className="position-absolute top-0 start-0 m-2"><StatusBadge status={p.status} /></span>}
      </div>
      <div className="card-body d-flex flex-column">
        <small className="text-muted">{p.project}</small>
        <Link to={`/properties/${p.id}`} className="fw-semibold text-body text-decoration-none">{p.name}</Link>
        <small className="text-muted"><i className="bi bi-geo-alt me-1" aria-hidden="true" />{p.district}, {p.province}</small>
        <div className="d-flex flex-wrap gap-3 small mt-2 text-muted">
          <span><i className="bi bi-door-closed me-1" aria-hidden="true" />{roomsLabel(p)}</span>
          <span><i className="bi bi-droplet me-1" aria-hidden="true" />{p.bathrooms} bath</span>
          <span><i className="bi bi-arrows-angle-expand me-1" aria-hidden="true" />{sizeLabel(p)}</span>
        </div>
        <div className="mt-auto pt-2 font-brand fs-5">{fmtMoney(p.price)}</div>
      </div>
    </div>
  );
}
