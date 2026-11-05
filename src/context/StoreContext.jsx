import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ADMINS, createSeed } from '../data/seed';
import { DEFAULT_PERMISSIONS, ROLES, BACKOFFICE_ROLES } from '../utils/permissions';
import { fullName } from '../utils/format';

const STORAGE_KEY = 'vbeyond-arms-demo-v10';
export const RENEWAL_REMINDER_DAYS = 30;
const StoreContext = createContext(null);

// The demo personas shown in the role switcher.
export const PERSONAS = [
  { key: 'prospect', label: 'Prospective Agent', name: 'Nutnicha Rungroj', session: { applicantKey: 'nutnicha.rungroj@gmail.com', name: 'Nutnicha Rungroj' }, color: '#3aa845' },
  { key: 'agent', label: 'Active Agent', name: 'Somchai Prasertsuk', session: { agentId: 'AG-1001' } },
  { key: 'teamLead', label: 'Team Lead', name: 'Kanokwan Thongdee', session: { agentId: 'AG-1002' } },
  { key: 'agentManager', label: 'Agent Manager', name: 'Suchada Panyakul', session: { adminId: 'ADM-02' } },
  { key: 'financeAdmin', label: 'Finance Admin', name: 'Kanyarak Rattanasri', session: { adminId: 'ADM-07' }, color: '#2f6f9f' },
  { key: 'operationsAdmin', label: 'Operations / Compliance Admin', name: 'Nattaporn Jingjai', session: { adminId: 'ADM-08' }, color: '#6a4c93' },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      state.agents.forEach((agent) => {
        if (!('reportsTo' in agent)) {
          const team = state.teams.find((item) => item.id === agent.teamId);
          agent.reportsTo = !team || team.leadId === agent.id
            ? null
            : ['AG-1004', 'AG-1005', 'AG-1006'].includes(agent.id) && agent.teamId === 'T-ALP'
              ? 'AG-1003'
              : team.leadId;
        }
        if (!('teamRole' in agent)) agent.teamRole = agent.id === 'AG-1003' ? 'Senior Agent' : 'Agent';
      });
      state.admins ||= [];
      ADMINS.forEach((seedAdmin) => {
        const admin = state.admins.find((item) => item.id === seedAdmin.id);
        if (admin) {
          if (seedAdmin.id === 'ADM-02') {
            admin.name = seedAdmin.name;
            admin.email = seedAdmin.email;
          }
          admin.role = seedAdmin.role;
        } else {
          state.admins.push({ ...seedAdmin });
        }
      });
      state.permissions ||= {};
      BACKOFFICE_ROLES.forEach((role) => {
        state.permissions[role] = {
          ...DEFAULT_PERMISSIONS[role],
          ...state.permissions[role],
        };
        Object.keys(DEFAULT_PERMISSIONS[role]).forEach((module) => {
          state.permissions[role][module] = {
            ...DEFAULT_PERMISSIONS[role][module],
            ...state.permissions[role][module],
          };
        });
      });
      ['applications', 'documents', 'faq', 'commissionRules'].forEach((module) => {
        state.permissions.agentManager[module] = { view: false, create: false, edit: false, approve: false, delete: false, manage: false };
      });
      state.permissions.operationsAdmin.renewals = { view: false, create: false, edit: false, approve: false, delete: false, manage: false };
      state.notifications.forEach((notification) => {
        const applicationReview = notification.title?.startsWith('New application:')
          || notification.title?.startsWith('Application resubmitted:');
        if (applicationReview && notification.to.includes('role:agentManager')) {
          notification.to = notification.to.filter((key) => key !== 'role:agentManager');
          notification.to.push('role:operationsAdmin');
        }
      });
      return state;
    }
  } catch { /* storage unavailable — fall back to fresh seed */ }
  return createSeed();
}

// Build the signed-in user from the session ids. Roles for agents and admins are
// derived from live data, so changing a team lead or an admin's role takes effect at once.
export function deriveUser(state) {
  const s = state.session;
  if (!s) return null;
  if (s.applicantKey) {
    const app = state.applications.find((a) => a.userKey === s.applicantKey);
    // Once approved, the applicant's own account becomes an agent account automatically.
    if (app?.agentId && state.agents.some((a) => a.id === app.agentId)) return deriveUser({ ...state, session: { agentId: app.agentId } });
    const name = app ? `${app.personal.firstName} ${app.personal.lastName}` : s.name;
    return { role: 'prospect', name, email: s.applicantKey, avatarColor: '#3aa845', keys: [`applicant:${s.applicantKey}`, `email:${s.applicantKey}`, "allApplicants"], application: app || null, id: s.applicantKey };
  }
  if (s.agentId) {
    const agent = state.agents.find((a) => a.id === s.agentId);
    if (!agent) return null;
    const ledTeam = state.teams.find((t) => t.leadId === agent.id) || null;
    return { role: ledTeam ? 'teamLead' : 'agent', name: fullName(agent), email: agent.email, avatarColor: agent.avatarColor, photo: agent.photo, agent, ledTeam, keys: [`agent:${agent.id}`, 'allAgents'], id: agent.id };
  }
  if (s.adminId) {
    const admin = state.admins.find((a) => a.id === s.adminId);
    if (!admin) return null;
    return { role: admin.role, name: admin.name, email: admin.email, avatarColor: admin.avatarColor, admin, blocked: admin.status !== 'Active', keys: [`admin:${admin.id}`, `role:${admin.role}`], id: admin.id };
  }
  return null;
}

// ---- Helpers used inside mutate(draft => ...) ----
export function nextId(d, key, prefix, pad = 4) {
  const n = d.counters[key]++;
  return `${prefix}${String(n).padStart(pad, '0')}`;
}
export function notify(d, to, { category, title, body = '', link = '/notifications' }) {
  d.notifications.unshift({ id: `N-${d.counters.notif++}`, to: [...new Set(Array.isArray(to) ? to : [to])], category, title, body, link, at: new Date().toISOString(), readBy: [] });
}
export function logAction(d, user, action, target) {
  d.logs.unshift({ id: `LOG-${d.counters.log++}`, at: new Date().toISOString(), actor: user?.name || 'System', role: ROLES[user?.role]?.label || 'System', action, target });
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore quota errors */ }
  }, [state]);

  const mutate = useCallback((fn) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  // Send each active agent one renewal reminder when their membership is within 30 days of expiry.
  useEffect(() => {
    const due = (a) => {
      const days = Math.ceil((new Date(a.membershipExpiry) - new Date()) / 86400000);
      return a.status === 'Active' && a.activated && days > 0 && days <= RENEWAL_REMINDER_DAYS && a.reminderSentFor !== a.membershipExpiry
        && !state.renewals.some((r) => r.agentId === a.id && !['Approved', 'Rejected'].includes(r.status));
    };
    if (!state.agents.some(due)) return;
    mutate((d) => {
      d.agents.filter(due).forEach((a) => {
        const days = Math.ceil((new Date(a.membershipExpiry) - new Date()) / 86400000);
        a.reminderSentFor = a.membershipExpiry;
        notify(d, `agent:${a.id}`, { category: 'Membership renewal reminders', title: `Your membership expires in ${days} day${days === 1 ? '' : 's'}`, body: 'Submit your renewal request now to avoid interruption to your agent access.', link: '/renewal' });
      });
    });
  }, [state.agents, state.renewals, mutate]);

  const user = useMemo(() => deriveUser(state), [state]);

  const can = useCallback((module, action = 'view') => {
    if (!user || !BACKOFFICE_ROLES.includes(user.role)) return false;
    return !!state.permissions[user.role]?.[module]?.[action];
  }, [user, state.permissions]);

  const signIn = useCallback((session) => mutate((d) => { d.session = session; }), [mutate]);
  const signOut = useCallback(() => mutate((d) => { d.session = null; }), [mutate]);
  const resetDemo = useCallback(() => {
    const fresh = createSeed();
    setState((prev) => ({ ...fresh, session: prev.session && PERSONAS.some((p) => JSON.stringify(p.session) === JSON.stringify(prev.session)) ? prev.session : null }));
  }, []);

  const value = useMemo(() => ({ state, mutate, user, can, signIn, signOut, resetDemo }), [state, mutate, user, can, signIn, signOut, resetDemo]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);

// Notifications addressed to the current user.
export function useMyNotifications() {
  const { state, user } = useStore();
  return useMemo(() => {
    if (!user) return { list: [], unread: 0 };
    const list = state.notifications.filter((n) => n.to.some((k) => user.keys.includes(k)));
    return { list, unread: list.filter((n) => !n.readBy.includes(user.keys[0])).length };
  }, [state.notifications, user]);
}
