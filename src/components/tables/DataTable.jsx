import { useMemo, useState } from 'react';
import { EmptyState } from '../common';

/**
 * Sortable, paginated table.
 * columns: [{ key, label, render?(row), sortValue?(row), sortable?: true, className? }]
 */
export default function DataTable({ columns, rows, pageSize = 10, onRowClick, empty = 'No records found', initialSort, rowClassName, rowKey = 'id' }) {
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.sortValue || ((r) => r[col.key]);
    return [...rows].sort((a, b) => {
      const va = get(a); const vb = get(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <div>
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              {columns.map((c) => {
                const sortable = c.sortable !== false && c.key !== 'actions';
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} className={`${sortable ? 'sortable' : ''} ${c.className || ''}`}
                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    tabIndex={sortable ? 0 : undefined}
                    onKeyDown={sortable ? (e) => { if (e.key === 'Enter') toggleSort(c.key); } : undefined}>
                    {c.label}
                    {sortable && <i className={`bi ms-1 ${active ? (sort.dir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill') : 'bi-chevron-expand opacity-50'}`} aria-hidden="true" />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r[rowKey]} className={`${onRowClick ? 'row-click' : ''} ${rowClassName?.(r) || ''}`}
                onClick={onRowClick ? (e) => { if (!e.target.closest('button, a, input, select, label')) onRowClick(r); } : undefined}>
                {columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <EmptyState icon="bi-inbox" title={empty} />}
      {rows.length > pageSize && (
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-top">
          <small className="text-muted">Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, sorted.length)} of {sorted.length}</small>
          <nav aria-label="Pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${current === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(current - 1)} aria-label="Previous page"><i className="bi bi-chevron-left" /></button></li>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <li key={n} className={`page-item ${n === current ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(n)}>{n}</button></li>
              ))}
              <li className={`page-item ${current === pages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(current + 1)} aria-label="Next page"><i className="bi bi-chevron-right" /></button></li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
