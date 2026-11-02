import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logAction, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, PageHeader, SearchInput, Select, StatusBadge, StatCard, TONES } from '../../components/common';
import DataTable from '../../components/tables/DataTable';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { ACTIONS, BACKOFFICE_ROLES, MODULES, ROLES } from '../../utils/permissions';
import { fmtDate, fmtDateTime, isEmail, isPhone } from '../../utils/format';

const DEPTS = ['Compliance & Licensing', 'Agent Network Management', 'Customer & Agent Support', 'Information Technology'];
const COLORS = ['#1f4e52', '#6a4c93', '#8a5a2b', '#2f6f9f', '#4d7c0f', '#a0522d'];

export default function AdminAccounts() {
  const { state, mutate, user, can } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('All');
  const [status, setStatus] = useState('All');
  const [edit, setEdit] = useState(null);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState(null);
  const [toggle, setToggle] = useState(null);
  const [roleConfirm, setRoleConfirm] = useState(false);

  const rows = state.admins.filter((a) => (role === 'All' || a.role === role) && (status === 'All' || a.status === status) && (!q || `${a.name} ${a.email} ${a.id} ${a.department}`.toLowerCase().includes(q.toLowerCase())));
  const viewing = state.admins.find((a) => a.id === view);

  const validate = () => {
    const e = {};
    if (edit.name.trim().split(' ').length < 2) e.name = 'Enter first and last name.';
    if (!isEmail(edit.email)) e.email = 'Enter a valid email.';
    else if (!edit.email.toLowerCase().endsWith('@vbeyond.co.th')) e.email = 'Back-office accounts must use a @vbeyond.co.th email.';
    else if (state.admins.some((a) => a.email.toLowerCase() === edit.email.toLowerCase() && a.id !== edit.id)) e.email = 'This email is already used by another account.';
    if (edit.phone && !isPhone(edit.phone)) e.phone = 'Enter a valid phone number.';
    if (edit.id === user.id && edit.role !== 'itAdmin') e.role = 'You cannot remove your own System IT Admin role.';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const trySave = () => {
    if (!validate()) return;
    const original = state.admins.find((a) => a.id === edit.id);
    if (original && original.role !== edit.role) { setRoleConfirm(true); return; }
    save();
  };
  const save = () => {
    const id = edit.id || `ADM-${String(state.counters.adm).padStart(2, '0')}`;
    mutate((d) => {
      let a = d.admins.find((x) => x.id === edit.id);
      if (!a) { d.counters.adm++; a = { id, createdAt: new Date().toISOString(), lastLogin: null, avatarColor: COLORS[d.admins.length % COLORS.length] }; d.admins.push(a); }
      const prevRole = a.role;
      Object.assign(a, { name: edit.name.trim(), email: edit.email.trim().toLowerCase(), phone: edit.phone.trim(), department: edit.department, role: edit.role, status: edit.status });
      logAction(d, user, edit.id ? (prevRole !== edit.role ? `Changed role ${ROLES[prevRole].label} → ${ROLES[edit.role].label}` : 'Edited admin account') : 'Created admin account', `${a.name} (${a.id})`);
    });
    toast(edit.id ? 'Account updated. Navigation and access for this user now follow the new role.' : `Account ${id} created. A welcome email was sent (simulated).`);
    setEdit(null); setRoleConfirm(false);
  };
  const doToggle = () => {
    const next = toggle.status === 'Active' ? 'Inactive' : 'Active';
    mutate((d) => { d.admins.find((a) => a.id === toggle.id).status = next; logAction(d, user, next === 'Active' ? 'Activated admin account' : 'Deactivated admin account', `${toggle.name} (${toggle.id})`); });
    toast(`${toggle.name} is now ${next.toLowerCase()}.`);
    setToggle(null);
  };

  const canCreate = can('adminAccounts', 'create');
  const canEdit = can('adminAccounts', 'edit');
  const canManage = can('adminAccounts', 'manage') || canEdit;

  return (
    <>
      <PageHeader title="Admin Accounts" subtitle="Manage back-office accounts, roles and account access." crumbs={[{ label: 'Administration' }, { label: 'Admin Accounts' }]}
        actions={<>
          <Link to="/admin/roles" className="btn btn-outline-primary"><i className="bi bi-shield-lock me-1" />Roles & permissions</Link>
          {canCreate && <button className="btn btn-primary" onClick={() => { setErrors({}); setEdit({ name: '', email: '', phone: '', department: DEPTS[0], role: 'compliance', status: 'Active' }); }}><i className="bi bi-person-plus me-1" />Create account</button>}
        </>} />
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard icon="bi-people" label="Total admin accounts" value={state.admins.length} /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-person-check" label="Active" value={state.admins.filter((a) => a.status === 'Active').length} tone={TONES.green} /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-person-slash" label="Inactive" value={state.admins.filter((a) => a.status !== 'Active').length} tone={TONES.gray} /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-shield" label="Roles" value={BACKOFFICE_ROLES.length} tone={TONES.purple} /></div>
      </div>
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-2 border-bottom">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, department" className="flex-grow-1" />
          <Select value={role} onChange={setRole} label="Role" options={[{ value: 'All', label: 'All roles' }, ...BACKOFFICE_ROLES.map((r) => ({ value: r, label: ROLES[r].label }))]} />
          <Select value={status} onChange={setStatus} label="Status" options={[{ value: 'All', label: 'All statuses' }, 'Active', 'Inactive']} />
        </div>
        <DataTable rows={rows} onRowClick={(a) => setView(a.id)} initialSort={{ key: 'id', dir: 'asc' }}
          columns={[
            { key: 'name', label: 'Administrator', render: (a) => <div className="d-flex gap-2 align-items-center"><Avatar name={a.name} color={a.avatarColor} size={32} /><div className="lh-sm"><div className="fw-medium">{a.name}{a.id === user.id && <span className="badge text-bg-light border ms-2">You</span>}</div><small className="text-muted">{a.email}</small></div></div> },
            { key: 'role', label: 'Role', sortValue: (a) => ROLES[a.role].label, render: (a) => <span className="status-badge sb-teal">{ROLES[a.role].label}</span> },
            { key: 'department', label: 'Department' },
            { key: 'lastLogin', label: 'Last sign-in', render: (a) => (a.lastLogin ? fmtDateTime(a.lastLogin) : 'Never') },
            { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
            { key: 'actions', label: '', render: (a) => <div className="d-flex gap-1 justify-content-end">
              {canEdit && <button className="btn btn-sm btn-light" onClick={() => { setErrors({}); setEdit({ ...a }); }} aria-label={`Edit ${a.name}`}><i className="bi bi-pencil" /></button>}
              {canManage && a.id !== user.id && <button className={`btn btn-sm ${a.status === 'Active' ? 'btn-light text-danger' : 'btn-outline-primary'}`} onClick={() => setToggle(a)}>{a.status === 'Active' ? 'Deactivate' : 'Activate'}</button>}
            </div> },
          ]} />
      </div>

      <Modal open={!!edit && !roleConfirm} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${edit.id}` : 'Create administrator account'} size="lg"
        footer={<><button className="btn btn-light" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={trySave}>{edit?.id ? 'Save changes' : 'Create account'}</button></>}>
        {edit && <div className="row g-3">
          <div className="col-md-6"><label className="form-label required" htmlFor="ad-n">Full name</label><input id="ad-n" className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />{errors.name && <div className="invalid-feedback">{errors.name}</div>}</div>
          <div className="col-md-6"><label className="form-label required" htmlFor="ad-e">Work email</label><input id="ad-e" className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} placeholder="name@vbeyond.co.th" />{errors.email && <div className="invalid-feedback">{errors.email}</div>}</div>
          <div className="col-md-6"><label className="form-label" htmlFor="ad-p">Phone</label><input id="ad-p" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />{errors.phone && <div className="invalid-feedback">{errors.phone}</div>}</div>
          <div className="col-md-6"><label className="form-label" htmlFor="ad-d">Department</label><select id="ad-d" className="form-select" value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div className="col-12">
            <label className="form-label required">Back-office role</label>
            <div className="row g-2">
              {BACKOFFICE_ROLES.map((r) => (
                <div className="col-sm-6" key={r}>
                  <label className={`border rounded p-2 d-flex gap-2 h-100 ${edit.role === r ? 'border-primary bg-brand-soft' : ''}`} style={{ cursor: 'pointer' }}>
                    <input type="radio" className="form-check-input mt-1" name="role" checked={edit.role === r} onChange={() => setEdit({ ...edit, role: r })} />
                    <span><span className="fw-semibold d-block">{ROLES[r].label}</span><small className="text-muted">{MODULES.filter((m) => state.permissions[r][m.key].view).length} modules</small></span>
                  </label>
                </div>
              ))}
            </div>
            {errors.role && <div className="text-danger small mt-1">{errors.role}</div>}
          </div>
          <div className="col-12"><div className="form-check form-switch"><input id="ad-s" className="form-check-input" type="checkbox" role="switch" checked={edit.status === 'Active'} disabled={edit.id === user.id} onChange={(e) => setEdit({ ...edit, status: e.target.checked ? 'Active' : 'Inactive' })} /><label className="form-check-label" htmlFor="ad-s">Account active</label></div></div>
        </div>}
      </Modal>

      <ConfirmModal open={roleConfirm} onClose={() => setRoleConfirm(false)} onConfirm={save} title="Change role?" confirmLabel="Change role">
        {edit && <>{edit.name}'s role will change from <strong>{ROLES[state.admins.find((a) => a.id === edit.id)?.role]?.label}</strong> to <strong>{ROLES[edit.role].label}</strong>. Their navigation and access update immediately.</>}
      </ConfirmModal>
      <ConfirmModal open={!!toggle} onClose={() => setToggle(null)} onConfirm={doToggle} title={toggle?.status === 'Active' ? 'Deactivate account?' : 'Activate account?'} confirmLabel={toggle?.status === 'Active' ? 'Deactivate' : 'Activate'} variant={toggle?.status === 'Active' ? 'danger' : 'primary'}>
        {toggle?.status === 'Active' ? `${toggle?.name} will no longer be able to sign in to the back office.` : `${toggle?.name} will be able to sign in again.`}
      </ConfirmModal>

      <Modal open={!!viewing} onClose={() => setView(null)} title="Account details" size="lg" footer={<button className="btn btn-primary" onClick={() => setView(null)}>Close</button>}>
        {viewing && <>
          <div className="d-flex gap-3 align-items-center mb-3"><Avatar name={viewing.name} color={viewing.avatarColor} size={56} /><div><h3 className="h5 mb-0">{viewing.name}</h3><small className="text-muted">{viewing.id} · {viewing.email}</small><div className="mt-1 d-flex gap-2"><StatusBadge status={viewing.status} /><span className="status-badge sb-teal">{ROLES[viewing.role].label}</span></div></div></div>
          <dl className="dl-grid mb-3">
            <div><dt>Department</dt><dd>{viewing.department}</dd></div><div><dt>Phone</dt><dd>{viewing.phone || '—'}</dd></div>
            <div><dt>Created</dt><dd>{fmtDate(viewing.createdAt)}</dd></div><div><dt>Last sign-in</dt><dd>{viewing.lastLogin ? fmtDateTime(viewing.lastLogin) : 'Never'}</dd></div>
          </dl>
          <h4 className="small-caps">Effective permissions ({ROLES[viewing.role].label})</h4>
          <div className="table-responsive"><table className="table table-sm perm-table small">
            <thead><tr><th>Module</th>{ACTIONS.map((a) => <th key={a.key}>{a.label}</th>)}</tr></thead>
            <tbody>{MODULES.filter((m) => state.permissions[viewing.role][m.key].view).map((m) => <tr key={m.key}><td>{m.label}</td>{ACTIONS.map((a) => <td key={a.key}>{state.permissions[viewing.role][m.key][a.key] ? <i className="bi bi-check-lg text-green" aria-label="Allowed" /> : <span className="text-muted">—</span>}</td>)}</tr>)}</tbody>
          </table></div>
        </>}
      </Modal>
    </>
  );
}
