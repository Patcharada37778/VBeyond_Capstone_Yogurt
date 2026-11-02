import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyNotifications, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PageHeader, Select, Tabs } from '../../components/common';
import { NOTIF_CATEGORIES, NOTIF_ICON } from '../../components/notifications/notifMeta';
import { fmtDateTime, timeAgo } from '../../utils/format';

export default function Notifications() {
  const { user, mutate } = useStore();
  const { list, unread } = useMyNotifications();
  const navigate = useNavigate();
  const toast = useToast();
  const [cat, setCat] = useState('All');
  const [tab, setTab] = useState('all');
  const me = user.keys[0];

  const shown = list.filter((n) => (cat === 'All' || n.category === cat) && (tab === 'all' || !n.readBy.includes(me)));
  const markRead = (ids) => mutate((d) => d.notifications.forEach((n) => { if (ids.includes(n.id) && !n.readBy.includes(me)) n.readBy.push(me); }));
  const markUnread = (id) => mutate((d) => { const n = d.notifications.find((x) => x.id === id); n.readBy = n.readBy.filter((k) => k !== me); });

  return (
    <>
      <PageHeader title="Notifications" subtitle={`${unread} unread notification${unread === 1 ? '' : 's'}`} crumbs={[{ label: 'Common Services' }, { label: 'Notifications' }]}
        actions={<button className="btn btn-outline-primary" disabled={!unread} onClick={() => { markRead(list.map((n) => n.id)); toast('All notifications marked as read.'); }}><i className="bi bi-check2-all me-1" />Mark all as read</button>} />
      <div className="card">
        <div className="card-body pb-0">
          <div className="d-flex flex-wrap justify-content-between gap-2">
            <Tabs active={tab} onChange={setTab} tabs={[{ key: 'all', label: 'All', count: list.length }, { key: 'unread', label: 'Unread', count: unread }]} />
            <Select value={cat} onChange={setCat} label="Filter by category" options={['All', ...NOTIF_CATEGORIES].map((c) => ({ value: c, label: c === 'All' ? 'All categories' : c }))} style={{ height: 38 }} />
          </div>
        </div>
        <div>
          {shown.map((n) => {
            const isUnread = !n.readBy.includes(me);
            return (
              <div key={n.id} className={`notif-item ${isUnread ? 'unread' : ''}`} role="button" tabIndex={0}
                onClick={() => { markRead([n.id]); navigate(n.link); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { markRead([n.id]); navigate(n.link); } }}>
                <span className="notif-icon"><i className={`bi ${NOTIF_ICON[n.category] || 'bi-bell'}`} aria-hidden="true" /></span>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="notif-title">{n.title}</div>
                  {n.body && <div className="small text-muted">{n.body}</div>}
                  <div className="small text-muted mt-1"><span className="status-badge sb-gray me-2" style={{ fontSize: '0.68rem' }}>{n.category}</span><span title={fmtDateTime(n.at)}>{timeAgo(n.at)}</span></div>
                </div>
                <div className="d-flex align-items-start gap-2">
                  {isUnread && <span className="unread-dot" aria-label="Unread" />}
                  <button className="btn btn-sm btn-light" onClick={(e) => { e.stopPropagation(); if (isUnread) markRead([n.id]); else markUnread(n.id); }}>
                    {isUnread ? 'Mark as read' : 'Mark unread'}
                  </button>
                </div>
              </div>
            );
          })}
          {!shown.length && <EmptyState icon="bi-bell-slash" title="No notifications here">Notifications about your applications, team and membership will appear here.</EmptyState>}
        </div>
      </div>
    </>
  );
}
