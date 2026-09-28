import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar,
  Settings,
  LogOut,
  GraduationCap,
  Target,
  Building,
  Film,
  Globe,
  Sliders,
  SlidersHorizontal,
  Database,
  FolderLock,
  FileBarChart
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import api from '../../lib/api';

interface CustomJwtPayload {
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[];
  role?: string | string[];
  email?: string;
  sub?: string;
}

interface InstitutionOption {
  id: string;
  name: string;
  website?: string;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/reports': 'Leads & Applications Report',
  '/calendar': 'Activity Calendar',
  '/leads': 'Leads Management',
  '/counselor-skills': 'Counselor Skills & Routing',
  '/applications': 'Student Applications',
  '/document-repository': 'Tenant Document Repository',
  '/form-builder': 'Form Builder',
  '/enrollments': 'Enrollments & Payments',
  '/campaigns': 'Marketing & Campaigns',
  '/tutorial': 'Video Tutorial',
  '/institutions': 'Institutions & Campuses',
  '/knowledge-base': 'AI Knowledge Base (RAG)',
  '/settings': 'System Settings',
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const storedUserName = localStorage.getItem('userName') || '';
  let roles: string[] = [];
  let userEmail = localStorage.getItem('userEmail') || '';

  if (token) {
    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;
      if (Array.isArray(roleClaim)) {
        roles = roleClaim;
      } else if (typeof roleClaim === 'string') {
        roles = [roleClaim];
      }
      if (!userEmail) userEmail = decoded.email || '';
    } catch (e) {
      console.error("Failed to decode token", e);
    }
  }

  const isSuperAdmin = roles.includes('SuperAdmin');
  const canViewReports = roles.some(role => ['superadmin', 'schooladmin', 'instituteadmin', 'institutionadmin'].includes(role.toLowerCase()));
  const userInstitutionId = localStorage.getItem('userInstitutionId');

  // Multi-tenant state
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>(() => {
    if (!isSuperAdmin && userInstitutionId) {
      return userInstitutionId;
    }
    return localStorage.getItem('selectedInstitutionId') || 'all';
  });

  useEffect(() => {
    api.get<InstitutionOption[]>('/api/institutions')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setInstitutions(res.data);
          if (!isSuperAdmin && userInstitutionId) {
            const myInst = res.data.find(i => i.id === userInstitutionId);
            const myName = myInst?.name || (userInstitutionId.toLowerCase().includes('a48d7782') ? 'Swami Vivekananda International School' : 'Delhi International School');
            localStorage.setItem('selectedInstitutionId', userInstitutionId);
            localStorage.setItem('selectedInstitutionName', myName);
            setSelectedInstId(userInstitutionId);
            window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { id: userInstitutionId, name: myName } }));
          } else {
            const currentId = localStorage.getItem('selectedInstitutionId') || 'all';
            setSelectedInstId(currentId);
            let currentName = 'All Institutions (Global)';
            if (currentId !== 'all') {
              const found = res.data.find(i => i.id === currentId);
              if (found) currentName = found.name;
              else if (currentId.toLowerCase().includes('a48d7782')) currentName = 'Swami Vivekananda International School';
              else if (currentId.toLowerCase().includes('fc49d553')) currentName = 'Delhi International School';
            }
            localStorage.setItem('selectedInstitutionName', currentName);
            window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { id: currentId, name: currentName } }));
          }
        }
      })
      .catch(err => console.error('Failed to load institutions:', err));
  }, [isSuperAdmin, userInstitutionId]);

  const handleTenantChange = (instId: string) => {
    if (!isSuperAdmin) return;
    setSelectedInstId(instId);
    let instName = 'All Institutions (Global)';
    if (instId !== 'all') {
      const inst = institutions.find(i => i.id === instId);
      instName = inst?.name || 'Selected Institution';
    }
    localStorage.setItem('selectedInstitutionId', instId);
    localStorage.setItem('selectedInstitutionName', instName);
    window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { id: instId, name: instName } }));
  };

  const isCounsellor = roles.includes('Counsellor');
  const roleName = roles[0] || 'Staff';
  const displayName = storedUserName || userEmail || 'Administrator';
  const userInitials = storedUserName
    ? storedUserName.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : (userEmail ? userEmail.split('@')[0].substring(0, 2).toUpperCase() : 'AD');

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRoles');
    localStorage.removeItem('userInstitutionId');
    localStorage.removeItem('selectedInstitutionId');
    localStorage.removeItem('selectedInstitutionName');
    navigate('/login');
  };

  const currentTitle = pageTitles[location.pathname] || 'Dashboard';
  const isParent = roles.includes('Parent');

  let navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/calendar', label: 'Activity Calendar', icon: Calendar, badge: 'Live', badgeColor: 'indigo' },
    { to: '/leads', label: 'Leads', icon: Users },
    { to: '/counselor-skills', label: 'Counselor Skills', icon: SlidersHorizontal, badge: 'Auto', badgeColor: 'purple' },
    { to: '/applications', label: 'Applications', icon: FileText },
    { to: '/document-repository', label: 'Document Vault', icon: FolderLock, badge: 'Vault', badgeColor: 'emerald' },
    { to: '/form-builder', label: 'Form Builder', icon: Sliders },
    { to: '/enrollments', label: 'Enrollments', icon: GraduationCap },
    { to: '/campaigns', label: 'Marketing & Campaigns', icon: Target, badge: 'AI', badgeColor: 'indigo' },
    { to: '/tutorial', label: 'Video Tutorial', icon: Film, badge: '6m', badgeColor: 'blue' },
  ];

  if (canViewReports) {
    navItems.splice(1, 0, { to: '/reports', label: 'Reports', icon: FileBarChart });
  }

  if (isParent) {
    navItems = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/calendar', label: 'Campus Tour', icon: Calendar },
      { to: '/applications', label: 'My Applications', icon: FileText },
      { to: '/enrollments', label: 'Fees & Payments', icon: GraduationCap },
    ];
  }


  const adminNavItems = [
    { to: '/institutions', label: 'Institutions', icon: Building },
    { to: '/knowledge-base', label: 'Knowledge Base (RAG)', icon: Database },
  ];

  const renderNavLink = (item: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }) => {
    const active = isActive(item.to);
    const Icon = item.icon;

    return (
      <Link
        key={item.to}
        to={item.to}
        className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all ${
          active
            ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-xs'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className="flex items-center">
          <Icon className={`mr-3 h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
          {item.label}
        </span>
        {item.badge && (
          <span
            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
              active
                ? 'bg-blue-100 text-blue-800'
                : item.badgeColor === 'purple'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : item.badgeColor === 'indigo'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : item.badgeColor === 'emerald'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <GraduationCap className="h-8 w-8 text-blue-600 mr-3" />
          <span className="text-xl font-bold text-gray-900">MySchoolAdmissions</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            <Link
              to="/"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 mb-2 border border-emerald-200 transition"
            >
              <Globe className="mr-3 h-5 w-5 text-emerald-600" />
              Public Homepage
            </Link>

            {navItems.map(renderNavLink)}
            
            {!isCounsellor && !isParent && adminNavItems.map(renderNavLink)}
          </nav>
        </div>

        <div className="p-3 border-t border-gray-200 space-y-1">
          <Link
            to="/settings"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              isActive('/settings')
                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Settings className={`mr-3 h-5 w-5 ${isActive('/settings') ? 'text-blue-600' : 'text-gray-400'}`} />
            Settings
          </Link>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700 transition"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900">{currentTitle}</h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Active Institution Tenant Switcher / Scope Badge */}
            {isSuperAdmin ? (
              <div className="flex items-center bg-purple-50/70 border border-purple-200 rounded-lg px-3 py-1.5 shadow-2xs">
                <Building className="w-4 h-4 text-purple-700 mr-2 flex-shrink-0" />
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="text-[10px] uppercase font-extrabold text-purple-800 tracking-wider mr-2 hidden md:inline">
                    Scope:
                  </span>
                  <select
                    id="tenant-institution-select"
                    value={selectedInstId}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    className="bg-transparent text-xs sm:text-sm font-bold text-purple-950 focus:outline-none cursor-pointer max-w-[210px] truncate"
                  >
                    <option value="all">🌐 All Institutions (Global View)</option>
                    {institutions.length > 0 ? (
                      institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="fc49d553-b44f-4c4c-96ad-4bf599016c01">Delhi International School (DIS)</option>
                        <option value="a48d7782-dda9-42ad-b21a-046d517f1ce5">Sri Venkateshwara International School (SVIS)</option>
                      </>
                    )}
                  </select>
                </div>
                <span className="ml-2.5 hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-700 text-white tracking-wide">
                  SUPER ADMIN
                </span>
              </div>
            ) : (
              <div className="flex items-center bg-blue-50/80 border border-blue-200 rounded-lg px-3 py-1.5 shadow-2xs">
                <Building className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="text-[10px] uppercase font-extrabold text-blue-700 tracking-wider mr-2 hidden md:inline">
                    Institute:
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-blue-950 max-w-[220px] truncate">
                    {localStorage.getItem('selectedInstitutionName') || (userInstitutionId === 'fc49d553-b44f-4c4c-96ad-4bf599016c01' ? 'Delhi International School' : 'Sri Venkateshwara Int. School')}
                  </span>
                </div>
                <span className="ml-2.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-700 text-white tracking-wide">
                  TENANT LOCKED
                </span>
              </div>
            )}

            <div className="h-6 w-px bg-gray-200"></div>

            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-gray-800">{displayName}</p>
                <p className="text-[11px] text-gray-500 capitalize">{roleName}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shadow-xs">
                {userInitials}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
