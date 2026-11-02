// Roles, RBAC modules and the role-aware navigation map.
// This is a simulated frontend permission system for the prototype only.

export const ROLES = {
  prospect: { label: 'Prospective Agent', portal: 'agent' },
  agent: { label: 'Active Agent', portal: 'agent' },
  teamLead: { label: 'Team Lead', portal: 'agent' },
  compliance: { label: 'Compliance Admin', portal: 'backoffice' },
  agentManager: { label: 'Agent Manager', portal: 'backoffice' },
  support: { label: 'Support Staff', portal: 'backoffice' },
  itAdmin: { label: 'System IT Admin', portal: 'backoffice' },
};

export const BACKOFFICE_ROLES = ['compliance', 'agentManager', 'support', 'itAdmin'];
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
  { key: 'issues', label: 'System Issues & Tickets' },
  { key: 'messages', label: 'Support Messages' },
  { key: 'applications', label: 'Agent Applications' },
  { key: 'documents', label: 'Document Verification' },
  { key: 'inquiries', label: 'Applicant Inquiries' },
  { key: 'faq', label: 'FAQ Management' },
  { key: 'agents', label: 'Agent Directory' },
  { key: 'teams', label: 'Team Management' },
  { key: 'invitations', label: 'Invitations' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'renewals', label: 'Membership Renewals' },
  { key: 'agentStatus', label: 'Agent Status Management' },
  { key: 'adminAccounts', label: 'Admin Accounts' },
  { key: 'roles', label: 'Roles & Permissions' },
  { key: 'activityLogs', label: 'Activity Logs' },
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
  compliance: build({ announcements: 'VC', issues: '', applications: 'VCEA', documents: 'VEA', inquiries: 'VCE', faq: 'VCED', agents: 'V', renewals: 'VEA', invitations: 'V' }),
  agentManager: build({ announcements: 'VCE', applications: 'V', agents: 'VCE', teams: 'VCEA', invitations: 'VE', onboarding: 'VCEA', renewals: 'VEA', agentStatus: 'VEA' }),
  support: build({ announcements: 'V', issues: 'VCE', messages: 'VCE', inquiries: 'VCE', faq: 'VCED', agents: 'V' }),
  itAdmin: build({ announcements: 'VCED', issues: 'VCEAD', messages: 'V', adminAccounts: 'VCEDM', roles: 'VEM', activityLogs: 'V' }),
};

// Navigation. `roles` = agent-side roles with fixed access; `module` = back-office RBAC module.
export const NAV = [
  { group: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', roles: 'all' },
  ] },
  { group: 'My Application', items: [
    { path: '/my-application', label: 'My Application', icon: 'bi-file-earmark-person', roles: ['prospect'] },
    { path: '/register', label: 'Agent Registration', icon: 'bi-pencil-square', roles: ['prospect'] },
    { path: '/help', label: 'Help & Inquiries', icon: 'bi-question-circle', roles: ['prospect'] },
  ] },
  { group: 'My Account', items: [
    { path: '/profile', label: 'My Profile', icon: 'bi-person-badge', roles: ['agent', 'teamLead'] },
    { path: '/renewal', label: 'Membership Renewal', icon: 'bi-arrow-repeat', roles: ['agent', 'teamLead'] },
    { path: '/help', label: 'FAQ', icon: 'bi-question-circle', roles: ['agent', 'teamLead'] },
  ] },
  { group: 'My Team', items: [
    { path: '/team/members', label: 'Team Members', icon: 'bi-people', roles: ['teamLead'] },
    { path: '/team/invitations', label: 'Invitations', icon: 'bi-envelope-paper', roles: ['teamLead'] },
    { path: '/team/hierarchy', label: 'Team Hierarchy', icon: 'bi-diagram-3', roles: ['teamLead'] },
  ] },
  { group: 'Common Services', items: [
    { path: '/announcements', label: 'Announcements', icon: 'bi-megaphone', roles: ['prospect', 'agent', 'teamLead'], module: 'announcements' },
    { path: '/notifications', label: 'Notifications', icon: 'bi-bell', roles: 'all', badge: 'notifications' },
    { path: '/report-problem', label: 'Report a Problem', icon: 'bi-bug', roles: 'all' },
    { path: '/contact-support', label: 'Contact Support', icon: 'bi-headset', roles: ['prospect', 'agent', 'teamLead', 'compliance', 'agentManager'] },
    { path: '/support-inbox', label: 'Support Messages', icon: 'bi-chat-left-text', module: 'messages' },
    { path: '/system-issues', label: 'System Issues', icon: 'bi-tools', module: 'issues' },
  ] },
  { group: 'Agent Team Management', items: [
    { path: '/applications', label: 'Agent Applications', icon: 'bi-inboxes', module: 'applications' },
    { path: '/inquiries', label: 'Applicant Inquiries', icon: 'bi-chat-square-dots', module: 'inquiries' },
    { path: '/documents', label: 'Document Verification', icon: 'bi-file-earmark-check', module: 'documents' },
    { path: '/agents', label: 'Agent Directory', icon: 'bi-person-lines-fill', module: 'agents' },
    { path: '/teams', label: 'Team Management', icon: 'bi-diagram-3', module: 'teams' },
    { path: '/invitations', label: 'Invitations', icon: 'bi-envelope-paper', module: 'invitations' },
    { path: '/onboarding', label: 'Onboarding', icon: 'bi-person-plus', module: 'onboarding' },
    { path: '/renewals', label: 'Membership Renewals', icon: 'bi-arrow-repeat', module: 'renewals' },
    { path: '/agent-status', label: 'Agent Status Management', icon: 'bi-toggles', module: 'agentStatus' },
    { path: '/faq', label: 'FAQ', icon: 'bi-journal-text', module: 'faq' },
  ] },
  { group: 'Administration', items: [
    { path: '/admin/accounts', label: 'Admin Accounts', icon: 'bi-person-gear', module: 'adminAccounts' },
    { path: '/admin/roles', label: 'Roles & Permissions', icon: 'bi-shield-lock', module: 'roles' },
    { path: '/admin/activity', label: 'Activity Logs', icon: 'bi-clock-history', module: 'activityLogs' },
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
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => canAccessItem(i, role, permissions)) })).filter((g) => g.items.length);
}

// Find the nav item that owns a path (longest prefix match) — used by route guards.
export function itemForPath(pathname) {
  let best = null;
  NAV.forEach((g) => g.items.forEach((i) => {
    if ((pathname === i.path || pathname.startsWith(i.path + '/')) && (!best || i.path.length > best.path.length)) best = { ...i, group: g.group };
  }));
  return best;
}
