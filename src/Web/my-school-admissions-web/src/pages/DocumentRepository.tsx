import { useState, useEffect } from 'react';
import { 
  FolderLock, 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  Plus, 
  RefreshCw, 
  HardDrive 
} from 'lucide-react';
import api from '../lib/api';

interface TenantDoc {
  id: string;
  institutionId: string;
  title: string;
  category: string;
  fileName: string;
  fileExtension: string;
  fileSizeBytes: number;
  fileUrl: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  description: string;
  isVerified: boolean;
}

const CATEGORIES = [
  'All',
  'Prospectus & Brochures',
  'Fee Structure & Policies',
  'Affiliation & Compliance',
  'Admission Guidelines'
];

export default function DocumentRepository() {
  const [documents, setDocuments] = useState<TenantDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Active Tenant
  const [currentInstId, setCurrentInstId] = useState<string>(() => {
    return localStorage.getItem('selectedInstitutionId') || localStorage.getItem('userInstitutionId') || 'fc49d553-b44f-4c4c-96ad-4bf599016c01';
  });
  const [currentInstName, setCurrentInstName] = useState<string>(() => {
    const id = (localStorage.getItem('selectedInstitutionId') || localStorage.getItem('userInstitutionId') || '').toLowerCase();
    const stored = localStorage.getItem('selectedInstitutionName');
    if (stored && stored !== 'Delhi International School (DIS)' && stored !== 'Delhi International School') {
      if (id.includes('a48d7782') && stored.toLowerCase().includes('delhi')) {
        return 'Swami Vivekananda International School';
      }
      return stored;
    }
    if (id.includes('a48d7782')) return 'Swami Vivekananda International School';
    if (id.includes('fc49d553')) return 'Delhi International School';
    return stored || 'Assigned Institution';
  });

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Prospectus & Brochures');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchDocuments = async (instId = currentInstId) => {
    setLoading(true);
    try {
      const res = await api.get<TenantDoc[]>(`/api/applications/documents?institutionId=${instId}`);
      setDocuments(res.data || []);
    } catch (err) {
      console.error('Failed to load tenant documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(currentInstId);

    const handleTenantChanged = (e: any) => {
      const newId = e.detail?.id || localStorage.getItem('selectedInstitutionId');
      const newName = e.detail?.name || localStorage.getItem('selectedInstitutionName');
      if (newId) {
        setCurrentInstId(newId);
        if (newName) setCurrentInstName(newName);
        fetchDocuments(newId);
      }
    };

    window.addEventListener('tenantChanged', handleTenantChanged);
    return () => window.removeEventListener('tenantChanged', handleTenantChanged);
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!uploadTitle.trim()) {
      setUploadError('Please provide a document title.');
      return;
    }

    setIsUploading(true);

    try {
      let base64Content: string | undefined = undefined;
      let finalFileName = `${uploadTitle.trim().replace(/\s+/g, '_')}.pdf`;

      if (selectedFile) {
        finalFileName = selectedFile.name;
        base64Content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || result);
          };
          reader.readAsDataURL(selectedFile);
        });
      }

      await api.post('/api/applications/documents/upload', {
        title: uploadTitle.trim(),
        category: uploadCategory,
        description: uploadDescription.trim(),
        fileName: finalFileName,
        contentBase64: base64Content,
        institutionId: currentInstId
      });

      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadDescription('');
      setSelectedFile(null);
      setActionSuccess('Document successfully added to the tenant repository!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchDocuments(currentInstId);
    } catch (err: any) {
      setUploadError(err?.response?.data?.Message || err?.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!window.confirm(`Are you sure you want to remove "${docTitle}" from this tenant repository?`)) {
      return;
    }

    try {
      await api.delete(`/api/applications/documents/${docId}`);
      setActionSuccess(`Document "${docTitle}" removed from tenant repository.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchDocuments(currentInstId);
    } catch (err: any) {
      alert('Failed to delete document: ' + (err?.response?.data?.Message || err.message));
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalBytes = documents.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0);
  const totalFormattedSize = totalBytes > 1024 * 1024 
    ? (totalBytes / (1024 * 1024)).toFixed(1) + ' MB'
    : (totalBytes / 1024).toFixed(0) + ' KB';

  return (
    <div className="space-y-6">
      {/* Top Banner / Isolation Notice */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Independent Azure Storage Blobs • Tenant: {currentInstName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tenant Document Repository
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              All documents, official circulars, fee schedules, and compliance records are strictly isolated into dedicated Azure Blob Storage containers (tenant-{currentInstId}). No other institution has access to this storage.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>Azure Blob Container: tenant-{currentInstId}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchDocuments(currentInstId)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Refresh Repository"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Upload to Tenant Vault</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-400">Repository Files</div>
            <div className="text-xl font-bold text-white mt-0.5">{documents.length} Files</div>
          </div>
          <div>
            <div className="text-slate-400">Storage Volume</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalFormattedSize}</div>
          </div>
          <div>
            <div className="text-slate-400">Tenant Isolation</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">Enforced ✓</div>
          </div>
          <div>
            <div className="text-slate-400">Active Tenant ID</div>
            <div className="text-xs font-mono text-slate-300 mt-1 truncate" title={currentInstId}>
              {currentInstId.slice(0, 14)}...
            </div>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search repository files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Document Grid / Table */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          Loading isolated documents repository for {currentInstName}...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-gray-300">
          <FolderLock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-800">No documents found in this repository</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            {searchQuery || selectedCategory !== 'All' 
              ? 'Try changing your search keywords or category filters.'
              : `Upload official prospectuses, fee circulars, or affiliation certificates for ${currentInstName}.`}
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition"
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => {
            const sizeStr = doc.fileSizeBytes > 1024 * 1024
              ? (doc.fileSizeBytes / (1024 * 1024)).toFixed(1) + ' MB'
              : (doc.fileSizeBytes / 1024).toFixed(0) + ' KB';

            return (
              <div 
                key={doc.id}
                className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 truncate max-w-[160px]">
                      {doc.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 mt-3 line-clamp-2">
                    {doc.title}
                  </h3>
                  {doc.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-mono truncate max-w-[150px]">{doc.fileName}</span>
                    <span>{sizeStr}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(doc.uploadedAt || new Date().toISOString()).toLocaleDateString()} • {doc.uploadedBy}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.get<{ SasUrl?: string }>(`/api/applications/documents/${doc.id}/sas-url`);
                            if (res.data?.SasUrl) {
                              window.open(res.data.SasUrl, '_blank');
                              return;
                            }
                          } catch {
                            // Fallback to direct stream download
                          }
                          window.open(`/api/applications/documents/${doc.id}/download`, '_blank');
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Download / View in Azure Storage"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete from Repository"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={() => setIsUploadOpen(false)} />

            <div className="relative inline-block w-full max-w-lg p-6 sm:p-8 my-8 text-left bg-white rounded-3xl shadow-2xl transform transition-all border border-gray-100">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <FolderLock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Upload to Tenant Vault</h3>
                    <p className="text-xs text-gray-500">Destination: {currentInstName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsUploadOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {uploadError && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="e.g. CBSE Affiliation Certificate 2026-27"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Document Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="Provide details about the document and issuance details..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Select File (PDF, DOCX, or Image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Saved directly to: <code>/storage/tenants/{currentInstId}/documents/</code>
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
                  >
                    {isUploading ? (
                      <span>Saving to Vault...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Document</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
