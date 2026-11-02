import { useState } from 'react';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Tabs } from '../../components/common';
import { ConfirmModal } from '../../components/modals/Modal';
import { ACTIONS, BACKOFFICE_ROLES, DEFAULT_PERMISSIONS, MODULES, ROLES } from '../../utils/permissions';

// Permissions the IT admin role must keep, so nobody locks themselves out.
const LOCKED = { itAdmin: { roles: ['view', 'edit', 'manage'], adminAccounts: ['view', 'edit', 'manage'] } };

export default function Roles() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [role, setRole] = useState('compliance');
  const [draft, setDraft] = useState(() => structuredClone(state.permissions));
  const [confirm, setConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const canEdit = can('roles', 'edit') || can('roles', 'manage');

  const dirtyRoles = BACKOFFICE_ROLES.filter((r) => JSON.stringify(draft[r]) !== JSON.stringify(state.permissions[r]));
  const changes = dirtyRoles.flatMap((r) => MODULES.flatMap((m) => ACTIONS.filter((a) => draft[r][m.key][a.key] !== state.permissions[r][m.key][a.key]).map((a) => ({ r, m, a, on: draft[r][m.key][a.key] }))));
  const isLocked = (r, m, a) => LOCKED[r]?.[m]?.includes(a);

  const toggle = (m, a) => {
    if (!canEdit || isLocked(role, m, a)) return;
    setDraft((d) => {
      const n = structuredClone(d);
      const p = n[role][m];
      p[a] = !p[a];
      if (a !== 'view' && p[a]) p.view = true; // any action implies view
      if (a === 'view' && !p.view) ACTIONS.forEach((x) => { p[x.key] = false; });
      return n;
    });
  };
  const toggleRow = (m, on) => {
    if (!canEdit) return;
    setDraft((d) => { const n = structuredClone(d); ACTIONS.forEach((a) => { if (!isLocked(role, m, a.key)) n[role][m][a.key] = on; }); return n; });
  };
  const save = () => {
    mutate((d) => {
      d.permissions = structuredClone(draft);
      dirtyRoles.forEach((r) => logAction(d, user, 'Updated role permissions', `${ROLES[r].label} (${changes.filter((c) => c.r === r).length} change${changes.filter((c) => c.r === r).length === 1 ? '' : 's'})`));
    });
    toast('Role permissions saved. Navigation and access update immediately for affected users.', 'success', 'RBAC updated');
    setConfirm(false);
  };
  const resetDefaults = () => { setDraft((d) => ({ ...d, [role]: structuredClone(DEFAULT_PERMISSIONS[role]) })); setResetConfirm(false); };

  const perms = draft[role];
  const usersInRole = state.admins.filter((a) => a.role === role);

  return (
    <>
      <PageHeader title="Roles & Permissions (RBAC)" subtitle="Configure what each back-office role can see and do." crumbs={[{ label: 'Administration' }, { label: 'Roles & Permissions' }]}
        actions={canEdit && <>
          <button className="btn btn-light" disabled={!dirtyRoles.length} onClick={() => setDraft(structuredClone(state.permissions))}>Discard changes</button>
          <button className="btn btn-primary" disabled={!dirtyRoles.length} onClick={() => setConfirm(true)}><i className="bi bi-save me-1" />Save changes{changes.length ? ` (${changes.length})` : ''}</button>
        </>} />
      <Tabs active={role} onChange={setRole} tabs={BACKOFFICE_ROLES.map((r) => ({ key: r, label: `${ROLES[r].label}${dirtyRoles.includes(r) ? ' •' : ''}`, count: state.admins.filter((a) => a.role === r).length }))} />
      <div className="row g-3">
        <div className="col-xl-9">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span>Permission matrix — {ROLES[role].label}</span>
              {canEdit && <button className="btn btn-sm btn-light" onClick={() => setResetConfirm(true)}>Reset role to defaults</button>}
            </div>
            <div className="table-responsive">
              <table className="table perm-table align-middle">
                <thead><tr><th>Module</th>{ACTIONS.map((a) => <th key={a.key}>{a.label}</th>)}{canEdit && <th>All</th>}</tr></thead>
                <tbody>
                  {MODULES.map((m) => {
                    const p = perms[m.key];
                    const all = ACTIONS.every((a) => p[a.key]);
                    return (
                      <tr key={m.key} className={JSON.stringify(p) !== JSON.stringify(state.permissions[role][m.key]) ? 'row-highlight' : ''}>
                        <td className="fw-medium">{m.label}</td>
                        {ACTIONS.map((a) => (
                          <td key={a.key}>
                            <input type="checkbox" className="form-check-input" checked={p[a.key]} disabled={!canEdit || isLocked(role, m.key, a.key)}
                              aria-label={`${ROLES[role].label}: ${a.label} ${m.label}`} onChange={() => toggle(m.key, a.key)}
                              title={isLocked(role, m.key, a.key) ? 'Locked to prevent losing access to RBAC' : ''} />
                          </td>
                        ))}
                        {canEdit && <td><button className="btn btn-sm btn-link p-0" onClick={() => toggleRow(m.key, !all)}>{all ? 'None' : 'All'}</button></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-footer bg-white small text-muted"><i className="bi bi-info-circle me-1" />Any action automatically includes View. Removing View removes all actions. Unchecking View hides the page from that role's navigation.</div>
          </div>
        </div>
        <div className="col-xl-3">
          <div className="card mb-3"><div className="card-header">Users with this role</div>
            <ul className="list-group list-group-flush">{usersInRole.map((a) => <li key={a.id} className="list-group-item small d-flex justify-content-between"><span>{a.name}</span><span className={a.status === 'Active' ? 'text-green' : 'text-muted'}>{a.status}</span></li>)}</ul>
          </div>
          <div className="card"><div className="card-header">Pending changes</div><div className="card-body small">
            {changes.length ? <ul className="ps-3 mb-0">{changes.map((c, i) => <li key={i}><strong>{ROLES[c.r].label}</strong>: {c.on ? 'grant' : 'revoke'} {c.a.label} on {c.m.label}</li>)}</ul> : <span className="text-muted">No unsaved changes.</span>}
          </div></div>
        </div>
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={save} title="Save role permission changes?" confirmLabel="Save changes">
        <p>{changes.length} change{changes.length === 1 ? '' : 's'} across {dirtyRoles.map((r) => ROLES[r].label).join(', ')}:</p>
        <ul className="small" style={{ maxHeight: 200, overflowY: 'auto' }}>{changes.map((c, i) => <li key={i}>{c.on ? 'Grant' : 'Revoke'} <strong>{c.a.label}</strong> on {c.m.label} ({ROLES[c.r].label})</li>)}</ul>
        <p className="small text-muted mb-0">Affected users' navigation and page access change immediately.</p>
      </ConfirmModal>
      <ConfirmModal open={resetConfirm} onClose={() => setResetConfirm(false)} onConfirm={resetDefaults} title="Reset to defaults?" confirmLabel="Reset">
        The {ROLES[role].label} matrix will be reset to the default permissions. You still need to save to apply it.
      </ConfirmModal>
    </>
  );
}
