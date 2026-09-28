import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Applications from './pages/Applications';
import Settings from './pages/Settings';
import Enrollments from './pages/Enrollments';
import Campaigns from './pages/Campaigns';
import Institutions from './pages/Institutions';
import DashboardLayout from './components/layout/DashboardLayout';
import VideoTutorial from './pages/VideoTutorial';
import FormBuilder from './pages/FormBuilder';
import KnowledgeBase from './pages/KnowledgeBase';
import Calendar from './pages/Calendar';

import CounselorSkills from './pages/CounselorSkills';
import ParentPortal from './pages/ParentPortal';
import Register from './pages/Register';
import DocumentRepository from './pages/DocumentRepository';
import PublicPaymentCheckout from './pages/PublicPaymentCheckout';
import PublicApply from './pages/PublicApply';
import Reports from './pages/Reports';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const InstitutionAdminReportRoute = () => {
  const token = localStorage.getItem('token');
  const reportRoles = ['superadmin', 'schooladmin', 'instituteadmin', 'institutionadmin'];
  if (!token) return <Navigate to="/login" replace />;
  try {
    const claims = jwtDecode<Record<string, unknown>>(token);
    const claimRoles = claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || claims.role;
    const roles = Array.isArray(claimRoles) ? claimRoles : [claimRoles];
    if (roles.some(role => typeof role === 'string' && reportRoles.includes(role.toLowerCase()))) {
      return <Reports />;
    }
  } catch {
    // An invalid token is redirected back to the dashboard for normal auth handling.
  }
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/apply" element={<PublicApply />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pay/:linkId" element={<PublicPaymentCheckout />} />
        <Route path="/pay" element={<PublicPaymentCheckout />} />
        <Route path="/checkout" element={<PublicPaymentCheckout />} />

        {/* Student & Parent Portal (Protected) */}
        <Route path="/portal" element={<ProtectedRoute><ParentPortal /></ProtectedRoute>} />
        <Route path="/parent-portal" element={<ProtectedRoute><ParentPortal /></ProtectedRoute>} />
        
        {/* Protected Staff & Admin Dashboard Routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<InstitutionAdminReportRoute />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/counselor-skills" element={<CounselorSkills />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/document-repository" element={<DocumentRepository />} />
          <Route path="/form-builder" element={<FormBuilder />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/enrollments" element={<Enrollments />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/institutions" element={<Institutions />} />
          <Route path="/tutorial" element={<VideoTutorial />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Catch-all route redirecting to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
