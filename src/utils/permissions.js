// Roles, RBAC modules and the role-aware navigation map.
// This is a simulated frontend permission system for the prototype only.

export const ROLES = {
  prospect: { label: 'Prospective Agent', portal: 'agent' },
  agent: { label: 'Active Agent', portal: 'agent' },
  teamLead: { label: 'Team Lead', portal: 'agent' },
  agentManager: { label: 'Back-office Agent Manager', portal: 'backoffice' },
  executive: { label: 'Executive', portal: 'backoffice' },
};

export const BACKOFFICE_ROLES = ['agentManager', 'executive'];
export const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'approve', label: 'Approve' },
  { key: 'delete', label: 'Delete' },
  { key: 'manage', label: 'Manage Access' },
];

export const MODULES = [
  { key: 'announcements', label: 'Announcements & News' },
  { key: 'applications', label: 'Agent Applications' },
  { key: 'documents', label: 'Document Verification' },
  { key: 'faq', label: 'FAQ Management' },
  { key: 'agents', label: 'Agent List' },
  { key: 'teams', label: 'Team Management' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'renewals', label: 'Membership Renewals' },
  { key: 'agentStatus', label: 'Agent Status Management' },
  { key: 'commissionRules', label: 'Commission Rules' },
  { key: 'salesUpload', label: 'Monthly Sales Upload' },
];

const p = (s) => ({
  view: s.includes('V'), create: s.includes('C'), edit: s.includes('E'),
  approve: s.includes('A'), delete: s.includes('D'), manage: s.includes('M'),
});
const none = p('');

function build(map) {
  return Object.fromEntries(MODULES.map((m) => [m.key, map[m.key] ? p(map[m.key]) : { ...none }]));
}

export const DEFAULT_PERMISSIONS = {
  agentManager: build({ announcements: 'VCED', applications: 'VCEA', faq: 'VCED', agents: 'VCE', teams: 'VCEA', onboarding: 'VCEA', renewals: 'VEA', agentStatus: 'VEA', commissionRules: 'VE', salesUpload: 'VCA' }),
  executive: build({}),
};

// Navigation. `hideFor` = roles that can open the page but don't see it in the sidebar.
// `roles` = agent-side roles with fixed access; `module` = back-office RBAC module.
export const NAV = [
  { group: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', roles: 'all' },
  ] },
  { group: 'My Application', items: [
    { path: '/my-application', label: 'My Application', icon: 'bi-file-earmark-person', roles: ['prospect'] },
    { path: '/register', label: 'Agent Registration', icon: 'bi-pencil-square', roles: ['prospect'] },
    { path: '/help', label: 'FAQ', icon: 'bi-question-circle', roles: ['prospect'], hideFor: ['prospect'] },
  ] },
  { group: 'My Account', items: [
    { path: '/profile', label: 'My Profile', icon: 'bi-person-badge', roles: ['agent', 'teamLead'] },
    { path: '/renewal', label: 'Membership Renewal', icon: 'bi-arrow-repeat', roles: ['agent', 'teamLead'] },
    { path: '/commission', label: 'My Commission', icon: 'bi-cash-coin', roles: ['agent', 'teamLead'] },
  ] },
  { group: 'Properties', items: [
    { path: '/properties', label: 'Property Directory', icon: 'bi-buildings', roles: ['agent', 'teamLead'] },
    { path: '/properties/favorites', label: 'Favorites', icon: 'bi-heart', roles: ['agent', 'teamLead'] },
  ] },
  { group: 'My Team', items: [
    { path: '/team/members', label: 'Team Member', icon: 'bi-people', roles: ['teamLead'] },
    { path: '/team/commission', label: 'Team Commission', icon: 'bi-cash-stack', roles: ['teamLead'] },
  ] },
  { group: 'Agent Team Management', items: [
    { path: '/applications', label: 'Agent Applications', icon: 'bi-inboxes', module: 'applications' },
    { path: '/agents', label: 'Agent List', icon: 'bi-person-lines-fill', module: 'agents' },
    { path: '/teams', label: 'Team Management', icon: 'bi-diagram-3', module: 'teams' },
    { path: '/renewals', label: 'Membership Renewals', icon: 'bi-arrow-repeat', module: 'renewals' },
    { path: '/agent-status', label: 'Agent Status Management', icon: 'bi-toggles', module: 'agentStatus' },
    { path: '/faq', label: 'FAQ', icon: 'bi-journal-text', module: 'faq' },
  ] },
  { group: 'Sales & Commission', items: [
    { path: '/commission-rules', label: 'Commission Rules', icon: 'bi-sliders', module: 'commissionRules' },
    { path: '/sales-upload', label: 'Monthly Sales Upload', icon: 'bi-file-earmark-spreadsheet', module: 'salesUpload' },
  ] },
];

export function canAccessItem(item, role, permissions) {
  if (!role) return false;
  if (item.roles === 'all') return true;
  if (Array.isArray(item.roles) && item.roles.includes(role)) return true;
  if (item.module && BACKOFFICE_ROLES.includes(role)) return !!permissions?.[role]?.[item.module]?.view;
  return false;
}

export function navForRole(role, permissions) {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => canAccessItem(i, role, permissions) && !i.hideFor?.includes(role)) })).filter((g) => g.items.length);
}

// Find the nav item that owns a path (longest prefix match) — used by route guards.
export function itemForPath(pathname) {
  let best = null;
  NAV.forEach((g) => g.items.forEach((i) => {
    if ((pathname === i.path || pathname.startsWith(i.path + '/')) && (!best || i.path.length > best.path.length)) best = { ...i, group: g.group };
  }));
  return best;
}
