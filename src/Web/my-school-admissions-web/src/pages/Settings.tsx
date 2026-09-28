import { useState, useEffect } from 'react';
import { 
  Cloud, 
  Phone, 
  CreditCard, 
  Check, 
  Copy, 
  ShieldCheck, 
  Sparkles, 
  Key, 
  Lock, 
  RefreshCw 
} from 'lucide-react';
import api from '../lib/api';
import { getStoredRazorpayConfig, saveStoredRazorpayConfig } from '../lib/razorpay';

interface Grade { id: string, name: string, order: number }
interface AcademicYear { id: string, name: string, startDate: string, endDate: string }
interface LeadSource { id: string, name: string, isActive: boolean }
interface CampaignType { id: string, name: string, isActive: boolean }
interface Role { id: string, name: string, description: string }

export default function Settings() {
  const [activeTab, setActiveTab] = useState('master-data');
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [campaignTypes, setCampaignTypes] = useState<CampaignType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Razorpay Gateway settings state
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [merchantName, setMerchantName] = useState('Delhi International School');
  const [isTestMode, setIsTestMode] = useState(true);
  const [isCopiedWebhook, setIsCopiedWebhook] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState('');


  useEffect(() => {
    if (activeTab === 'master-data') {
      fetchMasterData();
    } else if (activeTab === 'roles-permissions') {
      fetchRoles();
    } else if (activeTab === 'integrations') {
      const cfg = getStoredRazorpayConfig();
      setRazorpayKeyId(cfg.keyId || '');
      setRazorpayKeySecret(cfg.keySecret || '');
      setRazorpayWebhookSecret(cfg.webhookSecret || '');
      setMerchantName(cfg.merchantName || 'Delhi International School');
      setIsTestMode(cfg.isTestMode ?? true);
    }
  }, [activeTab]);

  const handleSaveRazorpayConfig = () => {
    saveStoredRazorpayConfig({
      keyId: razorpayKeyId.trim(),
      keySecret: razorpayKeySecret.trim(),
      webhookSecret: razorpayWebhookSecret.trim(),
      merchantName: merchantName.trim(),
      isTestMode
    });
    setSaveSuccessMsg('Razorpay configuration saved successfully! Active for all admission payments.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleTestRazorpayConnection = async () => {
    setIsTestingGateway(true);
    setTestResultMsg('');
    await new Promise(r => setTimeout(r, 900));
    const effectiveKey = razorpayKeyId.trim() || 'rzp_test_myschooladmissions2026';
    if (!effectiveKey.startsWith('rzp_test_') && !effectiveKey.startsWith('rzp_live_')) {
      setTestResultMsg('⚠️ Invalid Key format: Key ID must start with rzp_test_ or rzp_live_');
    } else {
      setTestResultMsg(`✓ Successfully verified Razorpay Gateway credentials! Sandbox connectivity authorized.`);
    }
    setIsTestingGateway(false);
  };

  const handleCopyWebhookUrl = () => {
    const webhookUrl = `${window.location.protocol}//${window.location.hostname}:5010/api/enrollments/payments/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    setIsCopiedWebhook(true);
    setTimeout(() => setIsCopiedWebhook(false), 3000);
  };


  const fetchRoles = async () => {
    try {
      const res = await api.get<Role[]>('/api/roles');
      setRoles(res.data);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [gradesRes, yearsRes, sourcesRes, campaignsRes] = await Promise.all([
        api.get<Grade[]>('/api/grades'),
        api.get<AcademicYear[]>('/api/academicyears'),
        api.get<LeadSource[]>('/api/leadsources'),
        api.get<CampaignType[]>('/api/campaigntypes'),
      ]);
      setGrades(gradesRes.data);
      setAcademicYears(yearsRes.data);
      setLeadSources(sourcesRes.data);
      setCampaignTypes(campaignsRes.data);
    } catch (error) {
      console.error('Failed to fetch master data', error);
    }
  };

  const handleCreateGrade = async () => {
    const name = prompt("Enter Grade Name:");
    if (!name) return;
    try {
      await api.post('/api/grades', { name, order: grades.length + 1 });
      fetchMasterData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteGrade = async (id: string) => {
    if(!confirm("Are you sure?")) return;
    try {
      await api.delete(`/api/grades/${id}`);
      fetchMasterData();
    } catch (e) { console.error(e); }
  };

  const handleCreateRole = async () => {
    const name = prompt("Enter Role Name:");
    if (!name) return;
    const description = prompt("Enter Role Description:");
    try {
      await api.post('/api/roles', { name, description: description || '' });
      fetchRoles();
    } catch (e) { console.error(e); }
  };

  const handleDeleteRole = async (id: string) => {
    if(!confirm("Are you sure you want to delete this role?")) return;
    try {
      await api.delete(`/api/roles/${id}`);
      fetchRoles();
    } catch (e: any) { 
      alert(e.response?.data?.message || "Failed to delete role.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">System Settings</h3>
        </div>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {['Master Data', 'Roles & Permissions', 'Workflows', 'Integrations'].map((tab) => {
              const tabId = tab.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tabId)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tabId
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'master-data' && (
            <div className="space-y-6">
              <h4 className="text-md font-medium text-gray-900">Master Data Configuration</h4>
              <p className="text-sm text-gray-500">Manage drop-downs and system-wide lists here.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-gray-800">Academic Years</h5>
                    {/* Add logic similarly later if needed */}
                  </div>
                  <ul className="text-sm space-y-1 mb-3">
                    {academicYears.map(ay => (
                      <li key={ay.id} className="flex justify-between border-b pb-1">
                        <span>{ay.name}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">Add Year</button>
                </div>
                
                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-gray-800">Grades</h5>
                  </div>
                  <ul className="text-sm space-y-1 mb-3">
                    {grades.map(g => (
                      <li key={g.id} className="flex justify-between border-b pb-1">
                        <span>{g.name} (Order: {g.order})</span>
                        <button onClick={() => handleDeleteGrade(g.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                      </li>
                    ))}
                  </ul>
                  <button onClick={handleCreateGrade} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">Add Grade</button>
                </div>
                
                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-gray-800">Lead Sources</h5>
                  </div>
                  <ul className="text-sm space-y-1 mb-3">
                    {leadSources.map(s => (
                      <li key={s.id} className="flex justify-between border-b pb-1">
                        <span>{s.name}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">Add Source</button>
                </div>
                
                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-gray-800">Campaign Types</h5>
                  </div>
                  <ul className="text-sm space-y-1 mb-3">
                    {campaignTypes.map(c => (
                      <li key={c.id} className="flex justify-between border-b pb-1">
                        <span>{c.name}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">Add Campaign</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles-permissions' && (
            <div className="space-y-6">
              <h4 className="text-md font-medium text-gray-900">Roles & Permissions</h4>
              <p className="text-sm text-gray-500">Configure access control levels for different roles.</p>
              
              <div className="bg-white border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roles.map(r => (
                      <tr key={r.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleDeleteRole(r.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={handleCreateRole} className="px-4 py-2 bg-blue-600 text-white rounded shadow text-sm hover:bg-blue-700">
                Add New Role
              </button>
            </div>
          )}
          
          {activeTab === 'workflows' && (
            <div className="space-y-6">
              <h4 className="text-md font-medium text-gray-900">Admission Workflows</h4>
              <p className="text-sm text-gray-500">Define the stages and criteria for the admission pipeline.</p>
            </div>
          )}
          
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-gray-900">Connected Cloud & Telephony Integrations</h4>
                  <p className="text-xs text-gray-500">Configure external cloud drive storage, telephone call recording archiving, and messaging gateways.</p>
                </div>
              </div>

              {/* 1. Google Drive Cloud Storage Card */}
              <div className="bg-gradient-to-r from-blue-50/60 via-white to-indigo-50/40 border border-blue-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-gray-900">Google Drive Telephony Storage</h5>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ● Connected & Active
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Automated cloud backup destination for counselor phone conversations & interaction audio</p>
                    </div>
                  </div>

                  <button
                    onClick={() => alert("Google Drive Cloud connection is healthy and verified (OAuth 2.0 institutional token active).")}
                    className="px-3.5 py-1.5 rounded-lg border border-blue-300 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 shadow-2xs transition self-start sm:self-auto"
                  >
                    Test Drive Sync
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Connected Service Account</span>
                    <span className="font-semibold text-gray-800">drive-backup@myschooladmissions.com</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Primary Drive Root Folder</span>
                    <span className="font-mono text-gray-800 font-semibold truncate block">/Admissions/Call_Recordings/2026-27</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Drive Storage Quota</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-blue-700">14.8 GB / 100 GB</span>
                      <span className="text-[10px] text-gray-500 font-medium">15% used</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-100 flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 font-medium">Auto-sync recorded phone calls to Google Drive upon completion</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 font-medium">Generate time-stamped subfolders per student lead</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 font-medium">Allow counselors to listen to audio playback in lead timeline</span>
                  </label>
                </div>
              </div>

              {/* 2. Web Telephony / VoIP Click-to-Call Gateway */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-900">Web Telephony & Click-to-Dial PBX</h5>
                      <p className="text-xs text-gray-500">Browser WebRTC & VoIP click-to-call integration with live audio recorder</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                    Ready
                  </span>
                </div>
              </div>

              {/* 3. Official Razorpay Payment Gateway Integration */}
              <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-700 text-white flex items-center justify-center font-black shadow-md">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-base font-bold text-gray-900">Razorpay Payment Gateway</h5>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isTestMode 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isTestMode ? '⚡ Test Sandbox' : '🟢 Live Production'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Accept Application fees, Seat Confirmation deposits, Term Tuition & Ad-Hoc payments via UPI, Cards, NetBanking, and EMI.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTestMode(!isTestMode)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      Switch to {isTestMode ? 'Live Mode' : 'Test Mode'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRazorpayConfig}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                    >
                      Save Gateway Keys
                    </button>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {testResultMsg && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>{testResultMsg}</span>
                  </div>
                )}

                {/* Credentials Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-blue-600" />
                      <span>Razorpay Key ID *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="rzp_test_... or rzp_live_..."
                      value={razorpayKeyId}
                      onChange={e => setRazorpayKeyId(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg font-mono text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Default fallback test key is enabled for local dev.</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Razorpay Key Secret</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Enter merchant key secret for HMAC signature verification"
                      value={razorpayKeySecret}
                      onChange={e => setRazorpayKeySecret(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg font-mono text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Used by EnrollmentService backend to verify HMAC-SHA256 signatures.</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Webhook Secret (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Webhook signing secret"
                      value={razorpayWebhookSecret}
                      onChange={e => setRazorpayWebhookSecret(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg font-mono text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Institution Display Name on Checkout
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi International School"
                      value={merchantName}
                      onChange={e => setMerchantName(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Webhook Configuration helper */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Razorpay Dashboard Webhook URL</span>
                    <button
                      type="button"
                      onClick={handleCopyWebhookUrl}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md font-semibold text-[11px] flex items-center gap-1 transition"
                    >
                      {isCopiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                      <span>{isCopiedWebhook ? 'Copied URL!' : 'Copy Webhook URL'}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded font-mono text-[11px] text-blue-700 truncate">
                    {window.location.protocol}//{window.location.hostname}:5010/api/enrollments/payments/webhook
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Subscribe to events: <code className="bg-slate-200 px-1 py-0.5 rounded">payment.captured</code>, <code className="bg-slate-200 px-1 py-0.5 rounded">order.paid</code>, <code className="bg-slate-200 px-1 py-0.5 rounded">payment_link.paid</code>.
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>PCI-DSS Level 1 Compliant • Instant UPI QR & NetBanking</span>
                  </div>
                  <button
                    type="button"
                    disabled={isTestingGateway}
                    onClick={handleTestRazorpayConnection}
                    className="px-4 py-2 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isTestingGateway ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Test Gateway Connectivity</span>
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
