# VBEYOND ARMS — Agent Relationship Management System (prototype)

A clickable, frontend-only prototype of the VBEYOND Agent Relationship Management System.
It covers the full agent lifecycle: registration, compliance review, first login, team onboarding,
membership renewal, commission overview, status changes, team transfers, and support.

- React 19 + React Router + Bootstrap 5 + Bootstrap Icons (Vite)
- No backend, database, real auth, or external APIs
- All data is mock data stored in `localStorage` (key `vbeyond-arms-demo-v1`), so changes survive a refresh

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

When hosting the `dist/` folder, configure the host to serve `index.html` for unknown paths (single-page app routing).

## Demo personas

Use the quick sign-in buttons on the login page, or the **Demo role switcher** in the profile menu (top right).

| Role | Persona |
|---|---|
| Prospective Agent | Nutnicha Rungroj |
| Active Agent | Somchai Prasertsuk (AG-1001) |
| Team Lead | Kanokwan Thongdee (AG-1002, Team Alpha) |
| Back-office Agent Manager | Suchada Chaiyaporn — the back-office role: applications, onboarding, renewals, teams, inquiries, FAQ, support messages and reported problems |

Other entry points on the login page:
- **First sign-in for migrated agents** — try `LG-20417` or `yupin.c@vbeyond-agent.co.th`
- **Approved applicant? Activate account** — first login after an application is approved
- **Forgot password** — simulated email with an on-screen verification code

**Reset demo data** (profile menu) restores the original mock data.

## Suggested demo journey

1. Prospective Agent → *Agent Registration* → submit the 4-step wizard
2. Agent Manager → *Agent Applications* → open it → *Request clarification*
3. Prospective Agent → *My Application* → respond, replace the document, resubmit
4. Agent Manager → verify documents → *Approve* (agent ID is generated)
5. Prospective Agent → *Proceed to first login* → set a password → agent dashboard
6. Agent Manager → *Onboarding* → assign to Team Alpha
7. Team Lead → notification "New team member" → *Invitations* → invite someone (team pre-assigned)
8. Active Agent → dashboard shows announcement banners, renewal reminder (30 days before expiry) and overall commission → *My Commission* for the statement
9. Active Agent → *Membership Renewal* → upload the PDPA certificate → submit (renewal is free)
10. Agent Manager → *Membership Renewals* → verify documents → approve (expiry is extended)
11. Any user → *Report a Problem* → Agent Manager → *System Issues* → assign → resolve → reporter is notified
12. Agent Manager → *Announcements* → create a banner with or without an image

## Project structure

```
src/
  components/   layout (shell, sidebar, top bar), tables, modals, notifications, dashboard helpers
  context/      StoreContext (state, persistence, current user, permissions), ToastContext
  data/         seed.js — mock agents, teams, applications, tickets, renewals, etc.
  pages/        agent, team-lead, applications, agent-manager, support, common, dashboards
  services/     agentLifecycle.js — status change, transfer, team lead change, onboarding rules
  utils/        permissions.js (roles, RBAC modules, navigation), format.js
  styles/       theme.css — VBEYOND colours and component styling
```

Permissions are simulated in the browser for demonstration only; they are not real security.
