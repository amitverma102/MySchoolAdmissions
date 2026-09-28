import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Users, ShieldCheck, Lock, UserPlus, ArrowRight } from 'lucide-react';
import api from '../lib/api';

function deriveNameFromEmail(userEmail: string): string {
  const local = (userEmail || '').split('@')[0] || 'User';
  return local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const response = await api.post('/api/auth/login', {
        email: email.trim().toLowerCase(), 
        password: password
      });
      
      const roles: string[] = response.data.roles || [];
      const userEmail = response.data.email || email.trim().toLowerCase();
      const rawFullName = response.data.fullName || 
        `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim();
      const resolvedName = rawFullName || deriveNameFromEmail(userEmail);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('userName', resolvedName);
      localStorage.setItem('userRoles', JSON.stringify(roles));
      if (response.data.firstName) localStorage.setItem('userFirstName', response.data.firstName);
      if (response.data.lastName) localStorage.setItem('userLastName', response.data.lastName);
      
      if (response.data.institutionId) {
        const instId = String(response.data.institutionId).toLowerCase();
        localStorage.setItem('userInstitutionId', response.data.institutionId);
        localStorage.setItem('selectedInstitutionId', response.data.institutionId);
        
        let initialName = 'Assigned Institution';
        if (instId.includes('a48d7782') || userEmail.includes('svis')) {
          initialName = 'Swami Vivekananda International School';
        } else if (instId.includes('fc49d553') || userEmail.includes('dis')) {
          initialName = 'Delhi International School';
        }
        localStorage.setItem('selectedInstitutionName', initialName);
      } else {
        localStorage.removeItem('userInstitutionId');
        if (roles.includes('SuperAdmin')) {
          localStorage.setItem('selectedInstitutionId', 'all');
          localStorage.setItem('selectedInstitutionName', 'All Institutions (Global)');
        }
      }

      // Dynamic routing strictly based on user's assigned role
      const isStaffOrAdmin = roles.some(r => 
        ['SuperAdmin', 'SchoolAdmin', 'Counsellor', 'Staff'].includes(r)
      );

      if (isStaffOrAdmin) {
        navigate('/dashboard');
      } else {
        // Parent or Student
        navigate('/portal');
      }
    } catch (err: any) {
      setError(err?.response?.data?.Message || err?.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoSuperAdmin = () => {
    setEmail('admin@myschooladmissions.com');
    setPassword('Admin@123');
    setError('');
  };

  const handleFillDemoTenantA = () => {
    setEmail('admin@dis.com');
    setPassword('Admin@123');
    setError('');
  };

  const handleFillDemoTenantB = () => {
    setEmail('admin@svis.org');
    setPassword('Admin@123');
    setError('');
  };

  const handleFillDemoParent = () => {
    setEmail('parent@example.com');
    setPassword('Parent@123');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-9 rounded-3xl shadow-xl border border-slate-100">
        <div>
          <Link 
            to="/" 
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Public Homepage
          </Link>
        </div>

        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-9 w-9" />
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to MySchoolAdmissions
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Unified login for parents, students, counselors, and school administration
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-xl">
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Common Single-Form Login */}
        <form className="mt-4 space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              placeholder="e.g. parent@example.com or admin@myschooladmissions.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Password
              </label>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Registration Callout for Parents & Students */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-purple-600" />
              <span>New Parent or Student?</span>
            </p>
            <p className="text-[11px] text-purple-700 mt-0.5">
              Create an account to submit & track admissions
            </p>
          </div>
          <Link
            to="/register"
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shrink-0 shadow-xs"
          >
            Register
          </Link>
        </div>

        {/* Quick Credentials Helpers for Evaluation */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-2">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Quick One-Click Demo Credentials:
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleFillDemoSuperAdmin}
              className="text-left p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/70 transition flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Super Admin</span>
              </div>
              <div className="text-[10px] text-blue-700 mt-0.5 font-mono truncate">admin@myschooladmissions.com</div>
              <div className="text-[9px] text-blue-500 mt-0.5 font-medium">Global: Sees All Institutions</div>
            </button>

            <button
              type="button"
              onClick={handleFillDemoTenantA}
              className="text-left p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/70 transition flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>DIS Admin (Tenant A)</span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5 font-mono truncate">admin@dis.com</div>
              <div className="text-[9px] text-emerald-600 mt-0.5 font-medium">Locked: Only DIS leads/records</div>
            </button>

            <button
              type="button"
              onClick={handleFillDemoTenantB}
              className="text-left p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 transition flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>SVIS Admin (Tenant B)</span>
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5 font-mono truncate">admin@svis.org</div>
              <div className="text-[9px] text-amber-600 mt-0.5 font-medium">Locked: Only SVIS leads/records</div>
            </button>

            <button
              type="button"
              onClick={handleFillDemoParent}
              className="text-left p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/70 transition flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Parent Account</span>
              </div>
              <div className="text-[10px] text-purple-700 mt-0.5 font-mono truncate">parent@example.com</div>
              <div className="text-[9px] text-purple-500 mt-0.5 font-medium">Parent & Ward Hub</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
