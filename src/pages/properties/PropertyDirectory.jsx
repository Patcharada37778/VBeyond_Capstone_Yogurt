import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { EmptyState, PageHeader, SearchInput, Select } from '../../components/common';
import { PropertyCard, useFavorites } from '../../components/PropertyShared';

const PRICES = [
  { value: '', label: 'Any price' },
  { value: '0-3000000', label: 'Under ฿3M' },
  { value: '3000000-5000000', label: '฿3M – ฿5M' },
  { value: '5000000-8000000', label: '฿5M – ฿8M' },
  { value: '8000000-', label: 'Over ฿8M' },
];
const SORTS = [
  { value: 'newest', label: 'Newest listed' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'size', label: 'Size: largest first' },
];
const EMPTY = { q: '', project: '', type: '', province: '', bedrooms: '', price: '' };
const uniq = (arr) => [...new Set(arr)].sort();

/** Read-only property directory (AG-PM-01). With `favoritesOnly`, shows the agent's saved properties (AG-PM-03). */
export default function PropertyDirectory({ favoritesOnly = false }) {
  const { state } = useStore();
  const fav = useFavorites();
  const [f, setF] = useState(EMPTY);
  const [sort, setSort] = useState('newest');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const all = favoritesOnly ? state.properties.filter((p) => fav.has(p.id)) : state.properties;

  const [min, max] = f.price ? f.price.split('-').map((n) => (n ? Number(n) : null)) : [null, null];
  const rows = all
    .filter((p) => !f.q || `${p.name} ${p.project} ${p.district} ${p.province}`.toLowerCase().includes(f.q.toLowerCase()))
    .filter((p) => !f.project || p.project === f.project)
    .filter((p) => !f.type || p.type === f.type)
    .filter((p) => !f.province || p.province === f.province)
    .filter((p) => !f.bedrooms || (f.bedrooms === '3' ? p.bedrooms >= 3 : p.bedrooms === Number(f.bedrooms)))
    .filter((p) => (min == null || p.price >= min) && (max == null || p.price < max))
    .sort((a, b) => (sort === 'priceAsc' ? a.price - b.price : sort === 'priceDesc' ? b.price - a.price : sort === 'size' ? (b.size || 0) - (a.size || 0) : new Date(b.listedAt) - new Date(a.listedAt)));
  const filtered = JSON.stringify(f) !== JSON.stringify(EMPTY);

  return (
    <>
      <PageHeader title={favoritesOnly ? 'Favorites' : 'Property Directory'}
        subtitle={favoritesOnly ? 'Properties you saved for quick access.' : 'Browse VBEYOND projects and units available for sale.'}
        crumbs={[{ label: 'Properties' }, { label: favoritesOnly ? 'Favorites' : 'Property Directory' }]} />

      {favoritesOnly && !all.length ? (
        <div className="card"><EmptyState icon="bi-heart" title="No favorites yet">
          Tap the heart on any property to save it here.
          <div className="mt-3"><Link to="/properties" className="btn btn-primary">Browse properties</Link></div>
        </EmptyState></div>
      ) : <>
        <div className="card mb-3">
          <div className="card-body d-flex flex-wrap gap-2">
            <SearchInput value={f.q} onChange={set('q')} placeholder="Search by name, project or location" className="flex-grow-1" />
            <Select value={f.project} onChange={set('project')} label="Project" options={[{ value: '', label: 'All projects' }, ...uniq(all.map((p) => p.project))]} />
            <Select value={f.type} onChange={set('type')} label="Property type" options={[{ value: '', label: 'All types' }, ...uniq(all.map((p) => p.type))]} />
            <Select value={f.province} onChange={set('province')} label="Location" options={[{ value: '', label: 'All locations' }, ...uniq(all.map((p) => p.province))]} />
            <Select value={f.bedrooms} onChange={set('bedrooms')} label="Bedrooms" options={[{ value: '', label: 'Any bedrooms' }, { value: '0', label: 'Studio' }, { value: '1', label: '1 bedroom' }, { value: '2', label: '2 bedrooms' }, { value: '3', label: '3+ bedrooms' }]} />
            <Select value={f.price} onChange={set('price')} label="Price range" options={PRICES} />
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <span className="small text-muted" aria-live="polite">{rows.length} {rows.length === 1 ? 'property' : 'properties'} found</span>
          <div className="d-flex gap-2 align-items-center">
            {filtered && <button className="btn btn-sm btn-light" onClick={() => setF(EMPTY)}>Clear filters</button>}
            <Select value={sort} onChange={setSort} label="Sort by" options={SORTS} className="form-select-sm" />
          </div>
        </div>

        {rows.length ? (
          <div className="row g-3">
            {rows.map((p) => <div key={p.id} className="col-sm-6 col-xl-4"><PropertyCard p={p} fav={fav} /></div>)}
          </div>
        ) : (
          <div className="card"><EmptyState icon="bi-search" title="No properties match your filters">
            Try a different search or <button className="btn btn-link p-0 align-baseline" onClick={() => setF(EMPTY)}>clear all filters</button>.
          </EmptyState></div>
        )}
      </>}
    </>
  );
}
