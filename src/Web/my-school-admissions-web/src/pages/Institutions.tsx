import { useState, useEffect } from 'react';
import { Plus, Building2, MapPin } from 'lucide-react';
import api from '../lib/api';
import { jwtDecode } from 'jwt-decode';

interface CustomJwtPayload {
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[];
  role?: string | string[];
}

interface Campus {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  isActive: boolean;
}

interface Institution {
  id: string;
  name: string;
  description: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  campuses: Campus[];
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  institutionId?: string;
  campusId?: string;
  roles: string[];
}

export default function Institutions() {
  const token = localStorage.getItem('token');
  let roles: string[] = [];
  if (token) {
    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;
      if (Array.isArray(roleClaim)) {
        roles = roleClaim;
      } else if (typeof roleClaim === 'string') {
        roles = [roleClaim];
      }
    } catch (e) {
      console.error("Failed to decode token", e);
    }
  }
  const isSuperAdmin = roles.includes('SuperAdmin');

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isNewInstModalOpen, setIsNewInstModalOpen] = useState(false);
  
  // Institution Form
  const [instName, setInstName] = useState('');
  const [instDesc, setInstDesc] = useState('');
  const [instWebsite, setInstWebsite] = useState('');
  const [instEmail, setInstEmail] = useState('');
  const [instPhone, setInstPhone] = useState('');

  // Campus Form
  const [activeInstIdForCampus, setActiveInstIdForCampus] = useState<string | null>(null);
  const [campusName, setCampusName] = useState('');
  const [campusAddress, setCampusAddress] = useState('');
  const [campusCity, setCampusCity] = useState('');
  const [campusState, setCampusState] = useState('');
  const [campusZip, setCampusZip] = useState('');

  // Admin Form
  const [activeInstIdForAdmin, setActiveInstIdForAdmin] = useState<string | null>(null);
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Counsellor Form
  const [activeCampusForCounsellor, setActiveCampusForCounsellor] = useState<{ instId: string, campId: string } | null>(null);
  const [counsFirstName, setCounsFirstName] = useState('');
  const [counsLastName, setCounsLastName] = useState('');
  const [counsEmail, setCounsEmail] = useState('');
  const [counsPassword, setCounsPassword] = useState('');

  // Users Modal
  const [activeInstIdForUsers, setActiveInstIdForUsers] = useState<string | null>(null);
  const [instUsers, setInstUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchInstitutions();
    const handleTenantChanged = () => {
      fetchInstitutions();
    };
    window.addEventListener('tenantChanged', handleTenantChanged);
    return () => window.removeEventListener('tenantChanged', handleTenantChanged);
  }, []);

  const fetchInstitutions = async () => {
    try {
      const response = await api.get('/api/institutions');
      const userInstitutionId = localStorage.getItem('userInstitutionId');
      const selectedInstId = localStorage.getItem('selectedInstitutionId');

      let visibleInstitutions: Institution[] = response.data || [];
      if (!isSuperAdmin && userInstitutionId) {
        visibleInstitutions = visibleInstitutions.filter((institution: Institution) => institution.id === userInstitutionId);
      } else if (isSuperAdmin && selectedInstId && selectedInstId !== 'all') {
        visibleInstitutions = visibleInstitutions.filter((institution: Institution) => institution.id.toLowerCase() === selectedInstId.toLowerCase());
      }
      setInstitutions(visibleInstitutions);
    } catch (error) {
      console.error('Failed to fetch institutions', error);
    }
  };

  const fetchUsers = async (institutionId: string) => {
    try {
      const params = institutionId ? { institutionId } : {};
      const response = await api.get('/api/users', { params });
      const users: User[] = response.data || [];
      const disId = 'fc49d553-b44f-4c4c-96ad-4bf599016c01';
      const visibleUsers = users.filter(u => {
        if (!institutionId) return true;
        if (institutionId.toLowerCase() === disId.toLowerCase()) {
          return !u.institutionId || u.institutionId.toLowerCase() === disId.toLowerCase();
        }
        return u.institutionId?.toLowerCase() === institutionId.toLowerCase();
      });
      setInstUsers(visibleUsers);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const openUsersModal = (institutionId: string) => {
    setActiveInstIdForUsers(institutionId);
    fetchUsers(institutionId);
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/institutions', {
        name: instName,
        description: instDesc,
        website: instWebsite,
        contactEmail: instEmail,
        contactPhone: instPhone,
        isActive: true
      });
      setIsNewInstModalOpen(false);
      resetInstForm();
      fetchInstitutions();
    } catch (error) {
      console.error('Failed to create institution', error);
    }
  };

  const handleCreateCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInstIdForCampus) return;
    try {
      await api.post(`/api/institutions/${activeInstIdForCampus}/campuses`, {
        name: campusName,
        address: campusAddress,
        city: campusCity,
        state: campusState,
        postalCode: campusZip
      });
      setActiveInstIdForCampus(null);
      resetCampusForm();
      fetchInstitutions();
    } catch (error) {
      console.error('Failed to create campus', error);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInstIdForAdmin) return;
    try {
      await api.post('/api/users', {
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        password: adminPassword,
        roleName: 'SchoolAdmin',
        institutionId: activeInstIdForAdmin
      });
      setActiveInstIdForAdmin(null);
      resetAdminForm();
      alert('Admin created successfully!');
    } catch (error: any) {
      console.error('Failed to create admin', error);
      alert(error.response?.data?.message || 'Failed to create admin');
    }
  };

  const handleCreateCounsellor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampusForCounsellor) return;
    try {
      await api.post('/api/users', {
        firstName: counsFirstName,
        lastName: counsLastName,
        email: counsEmail,
        password: counsPassword,
        roleName: 'Counsellor',
        institutionId: activeCampusForCounsellor.instId,
        campusId: activeCampusForCounsellor.campId
      });
      setActiveCampusForCounsellor(null);
      resetCounsForm();
      alert('Counsellor created successfully!');
    } catch (error: any) {
      console.error('Failed to create counsellor', error);
      alert(error.response?.data?.message || 'Failed to create counsellor');
    }
  };

  const toggleInstitutionStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/institutions/${id}/status`, !currentStatus);
      fetchInstitutions();
    } catch (error) {
      console.error('Failed to toggle institution status', error);
    }
  };

  const toggleCampusStatus = async (instId: string, campusId: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/institutions/${instId}/campuses/${campusId}/status`, !currentStatus);
      fetchInstitutions();
    } catch (error) {
      console.error('Failed to toggle campus status', error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/users/${userId}/status`, !currentStatus);
      if (activeInstIdForUsers) {
        fetchUsers(activeInstIdForUsers);
      }
    } catch (error) {
      console.error('Failed to toggle user status', error);
    }
  };

  const resetInstForm = () => {
    setInstName(''); setInstDesc(''); setInstWebsite(''); setInstEmail(''); setInstPhone('');
  };
  const resetCampusForm = () => {
    setCampusName(''); setCampusAddress(''); setCampusCity(''); setCampusState(''); setCampusZip('');
  };
  const resetAdminForm = () => {
    setAdminFirstName(''); setAdminLastName(''); setAdminEmail(''); setAdminPassword('');
  };
  const resetCounsForm = () => {
    setCounsFirstName(''); setCounsLastName(''); setCounsEmail(''); setCounsPassword('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Institutions & Campuses</h1>
        {isSuperAdmin && (
          <button
            onClick={() => setIsNewInstModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Institution
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="p-6">
          {institutions.length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No institutions</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new institution.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {institutions.map(inst => (
                <div key={inst.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <Building2 className="mr-2 h-5 w-5 text-gray-500"/>
                        {inst.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {inst.website} | {inst.contactEmail} | {inst.contactPhone}
                      </p>
                      <p className="text-sm text-gray-700 mt-2">{inst.description}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${inst.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {inst.isActive ? 'Active' : 'Disabled'}
                      </span>
                      {isSuperAdmin && (
                        <button
                          onClick={() => toggleInstitutionStatus(inst.id, inst.isActive)}
                          className={`px-3 py-1.5 border shadow-sm text-sm font-medium rounded ${inst.isActive ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                        >
                          {inst.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}
                      <button
                        onClick={() => openUsersModal(inst.id)}
                        className="px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Users
                      </button>
                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => setActiveInstIdForAdmin(inst.id)}
                            className="px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Plus className="inline -ml-1 mr-1 h-4 w-4" /> Admin
                          </button>
                          <button
                            onClick={() => setActiveInstIdForCampus(inst.id)}
                            className="px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Plus className="inline -ml-1 mr-1 h-4 w-4" /> Campus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white p-6">
                    <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wider mb-4">Campuses</h4>
                    {inst.campuses && inst.campuses.length > 0 ? (
                      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {inst.campuses.map(camp => (
                          <li key={camp.id} className="col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center space-x-3">
                                <MapPin className={`h-5 w-5 ${camp.isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                                <h3 className={`text-sm font-medium truncate ${camp.isActive ? 'text-gray-900' : 'text-gray-500'}`}>{camp.name}</h3>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setActiveCampusForCounsellor({ instId: inst.id, campId: camp.id })}
                                  className="text-xs font-medium px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                  + Counsellor
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => toggleCampusStatus(inst.id, camp.id, camp.isActive)}
                                    className={`text-xs font-medium px-2 py-1 rounded border ${camp.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                  >
                                    {camp.isActive ? 'Disable' : 'Enable'}
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className={`mt-2 text-sm line-clamp-2 ${camp.isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                              {camp.address}<br/>
                              {camp.city}, {camp.state} {camp.postalCode}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No campuses added yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Institution Modal */}
      {isNewInstModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsNewInstModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
              <form onSubmit={handleCreateInstitution}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add New Institution</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Institution Name</label>
                      <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={instName} onChange={e => setInstName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={instDesc} onChange={e => setInstDesc(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <input type="url" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={instWebsite} onChange={e => setInstWebsite(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                        <input type="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={instEmail} onChange={e => setInstEmail(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                        <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={instPhone} onChange={e => setInstPhone(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">Save</button>
                  <button type="button" onClick={() => setIsNewInstModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Campus Modal */}
      {activeInstIdForCampus && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setActiveInstIdForCampus(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
              <form onSubmit={handleCreateCampus}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add New Campus</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Campus Name</label>
                      <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={campusName} onChange={e => setCampusName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={campusAddress} onChange={e => setCampusAddress(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={campusCity} onChange={e => setCampusCity(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={campusState} onChange={e => setCampusState(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Zip/Postal</label>
                        <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={campusZip} onChange={e => setCampusZip(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">Save Campus</button>
                  <button type="button" onClick={() => setActiveInstIdForCampus(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Admin Modal */}
      {activeInstIdForAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setActiveInstIdForAdmin(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
              <form onSubmit={handleCreateAdmin}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add Institute Admin</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={adminFirstName} onChange={e => setAdminFirstName(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={adminLastName} onChange={e => setAdminLastName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Address</label>
                      <input type="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input type="password" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">Create Admin</button>
                  <button type="button" onClick={() => setActiveInstIdForAdmin(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Counsellor Modal */}
      {activeCampusForCounsellor && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setActiveCampusForCounsellor(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
              <form onSubmit={handleCreateCounsellor}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add Campus Counsellor</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={counsFirstName} onChange={e => setCounsFirstName(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={counsLastName} onChange={e => setCounsLastName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Address</label>
                      <input type="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={counsEmail} onChange={e => setCounsEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input type="password" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" value={counsPassword} onChange={e => setCounsPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">Create Counsellor</button>
                  <button type="button" onClick={() => setActiveCampusForCounsellor(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Users Modal */}
      {activeInstIdForUsers && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setActiveInstIdForUsers(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full relative z-10">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Manage Users</h3>
                  <button onClick={() => setActiveInstIdForUsers(null)} className="text-gray-400 hover:text-gray-500">&times;</button>
                </div>
                <div className="mt-4 border border-gray-200 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {instUsers.map(user => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.roles.join(', ')}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => toggleUserStatus(user.id, user.isActive)}
                              className={`${user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            >
                              {user.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {instUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No users found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" onClick={() => setActiveInstIdForUsers(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
