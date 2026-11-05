import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { useStore } from './context/StoreContext';

import Login from './pages/common/Login';
import ForgotPassword from './pages/common/ForgotPassword';
import MigratedLogin from './pages/common/MigratedLogin';
import Dashboard from './pages/dashboards/Dashboard';
import Announcements from './pages/common/Announcements';
import Notifications from './pages/common/Notifications';

import Register from './pages/agent/Register';
import MyApplication from './pages/agent/MyApplication';
import Help from './pages/agent/Help';
import Profile from './pages/agent/Profile';
import Renewal from './pages/agent/Renewal';
import Commission from './pages/agent/Commission';

import TeamMembers from './pages/team-lead/TeamMembers';
import TeamCommission from './pages/team-lead/TeamCommission';

import Applications from './pages/applications/Applications';
import ApplicationDetail from './pages/applications/ApplicationDetail';

import AgentDirectory from './pages/agent-manager/AgentDirectory';
import AgentDetail from './pages/agent-manager/AgentDetail';
import Teams from './pages/agent-manager/Teams';
import Renewals from './pages/agent-manager/Renewals';
import AgentStatus from './pages/agent-manager/AgentStatus';

import FaqManage from './pages/support/FaqManage';
import Landing from './pages/common/Landing';
import PropertyDirectory from './pages/properties/PropertyDirectory';
import PropertyDetail from './pages/properties/PropertyDetail';
import PropertyBrochure from './pages/properties/PropertyBrochure';
import CommissionRules from './pages/sales/CommissionRules';
import SalesUpload from './pages/sales/SalesUpload';


// Old onboarding links now open the onboarding tab in Team Management.
function OnboardingRedirect() {
  const [params] = useSearchParams();
  const agent = params.get('agent');
  return <Navigate to={`/teams?tab=onboarding${agent ? `&agent=${agent}` : ''}`} replace />;
}

export default function App() {
  const { user } = useStore();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/migrated-login" element={<MigratedLogin />} />
      <Route path="/join" element={<Register publicMode />} />
      <Route path="/properties/:id/brochure" element={<PropertyBrochure />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/notifications" element={<Notifications />} />

        <Route path="/register" element={<Register />} />
        <Route path="/my-application" element={<MyApplication />} />
        <Route path="/help" element={<Help />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/renewal" element={<Renewal />} />
        <Route path="/commission" element={<Commission />} />

        <Route path="/team/members" element={<TeamMembers />} />
        <Route path="/team/commission" element={<TeamCommission />} />
        <Route path="/team/hierarchy" element={<Navigate to="/team/members" replace />} />
        <Route path="/properties" element={<PropertyDirectory />} />
        <Route path="/properties/favorites" element={<PropertyDirectory favoritesOnly />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />

        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/agents" element={<AgentDirectory />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/onboarding" element={<OnboardingRedirect />} />
        <Route path="/renewals" element={<Renewals />} />
        <Route path="/agent-status" element={<AgentStatus />} />
        <Route path="/faq" element={<FaqManage />} />
        <Route path="/commission-rules" element={<CommissionRules />} />
        <Route path="/sales-upload" element={<SalesUpload />} />

      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}
