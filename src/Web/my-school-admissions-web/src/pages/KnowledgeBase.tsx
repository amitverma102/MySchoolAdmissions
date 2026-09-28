import { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  RefreshCw, 
  FileText, 
  Search, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  BookOpen, 
  Layers, 
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';

interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  vectorDimensions: number;
  embeddingProvider: string;
  status: string;
}

interface KnowledgeDocument {
  id: string;
  title: string;
  institutionName: string;
  documentType: string;
  fileName: string;
  fileSizeBytes: number;
  chunkCount: number;
  createdAt: string;
}

interface SearchResult {
  id: string;
  documentTitle: string;
  institutionName: string;
  documentType: string;
  chunkIndex: number;
  content: string;
  distance: number;
}

export default function KnowledgeBase() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docInstitution, setDocInstitution] = useState('Delhi International School');
  const [docType, setDocType] = useState('Prospectus');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Semantic Search Tester State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSchoolFilter, setSearchSchoolFilter] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, docsRes] = await Promise.all([
        api.get('/api/ai/knowledge/stats'),
        api.get('/api/ai/knowledge/documents')
      ]);
      setStats(statsRes.data);
      setDocuments(docsRes.data);
    } catch (err) {
      console.error('Failed to load knowledge base data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncInstitutions = async () => {
    setSyncing(true);
    setSyncSuccess(null);
    try {
      const res = await api.post('/api/ai/knowledge/sync-institutions');
      setSyncSuccess(res.data.message || 'Institutions synced to vector store successfully!');
      await loadData();
    } catch (err: any) {
      alert('Failed to sync institutions: ' + (err.response?.data?.message || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload (.pdf, .txt, .md)');
      return;
    }

    setUploading(true);
    setUploadSuccess(null);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', docTitle || uploadFile.name);
    formData.append('institutionName', docInstitution);
    formData.append('documentType', docType);

    try {
      const res = await api.post('/api/ai/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess(`Successfully ingested "${res.data.title}" into ${res.data.chunksCreated} vector chunks!`);
      setUploadFile(null);
      setDocTitle('');
      await loadData();
    } catch (err: any) {
      setUploadError(err.response?.data || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await api.post('/api/ai/knowledge/search', {
        query: searchQuery.trim(),
        schoolName: searchSchoolFilter.trim() || undefined,
        topK: 4
      });
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.error('Search test failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}" and its vector embeddings?`)) return;
    try {
      await api.delete(`/api/ai/knowledge/documents/${id}`);
      await loadData();
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Retrieval-Augmented Generation (RAG)</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Institutional Knowledge Base & Vector Index
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage school prospectus documents, fee guidelines, and vector embeddings queried by EduBot AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncInstitutions}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing Catalog...' : 'Re-sync Institution Data'}</span>
          </button>
        </div>
      </div>

      {syncSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccess}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Indexed Documents</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">
            {loading ? '...' : stats?.totalDocuments ?? 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">PDFs, Guides & Profiles</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vector Chunks (pgvector)</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            {loading ? '...' : stats?.totalChunks ?? 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">768-dim Embeddings in PostgreSQL</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Embedding Engine</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-sm font-bold text-gray-800 mt-2 truncate">
            {loading ? '...' : stats?.embeddingProvider ?? 'Ollama / OpenAI'}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">Cosine Similarity Retrieval</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">RAG Retrieval Status</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">
            Active
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Connected to EduBot Chat</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Document Card (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Ingest School Document</h2>
              <p className="text-[11px] text-gray-500">Extracts text, generates embeddings, and saves to pgvector.</p>
            </div>
          </div>

          {uploadSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select File (.pdf, .txt, .md) *</label>
              <input
                type="file"
                required
                accept=".pdf,.txt,.md"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                    if (!docTitle) {
                      setDocTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }
                }}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-lg p-1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Document Title *</label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="e.g. DIS Academic Prospectus 2026-27"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Institution Name *</label>
                <input
                  type="text"
                  required
                  value={docInstitution}
                  onChange={e => setDocInstitution(e.target.value)}
                  placeholder="e.g. Delhi International School"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Document Type *</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Prospectus">School Prospectus</option>
                  <option value="FeeStructure">Fee Structure Sheet</option>
                  <option value="Curriculum">Curriculum Guide</option>
                  <option value="AdmissionCriteria">Admission Policy</option>
                  <option value="FAQ">Parent FAQ</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50 transition flex items-center justify-center gap-1.5"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting & Generating Vector Chunks...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Embed into Vector Database</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Semantic Vector Search Tester (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Interactive Semantic Vector Search</h2>
              <p className="text-[11px] text-gray-500">Test how EduBot retrieves chunks using cosine similarity.</p>
            </div>
          </div>

          <form onSubmit={handleTestSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ask e.g. What are the tuition fees at Oakridge?"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="w-full sm:w-44">
              <input
                type="text"
                value={searchSchoolFilter}
                onChange={e => setSearchSchoolFilter(e.target.value)}
                placeholder="Filter by school (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-1.5 shrink-0"
            >
              {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Test Vector Query</span>
            </button>
          </form>

          {/* Results Display */}
          <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2.5">
            {searchResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <BookOpen className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-600">No active search results</p>
                <p className="text-[11px] text-gray-400 max-w-sm mt-0.5">
                  Type a question above to test pgvector cosine similarity retrieval against all stored institution chunks.
                </p>
              </div>
            ) : (
              searchResults.map((result, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900">{result.institutionName} • {result.documentTitle}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[10px] rounded font-bold">
                      distance: {result.distance.toFixed(4)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line bg-white p-2 rounded border border-slate-100">
                    {result.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Indexed Documents Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Stored Institutional Documents</h3>
            <p className="text-xs text-gray-500">All prospectuses and institution profiles currently indexed in PostgreSQL vector storage.</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Total: {documents.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Document Title</th>
                <th className="px-4 py-3 text-left">Institution</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Vector Chunks</th>
                <th className="px-4 py-3 text-left">Size</th>
                <th className="px-4 py-3 text-left">Indexed Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs">
                    No documents indexed yet. Click "Re-sync Institution Data" to index verified schools!
                  </td>
                </tr>
              ) : (
                documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{doc.title}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {doc.institutionName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">
                      {doc.chunkCount} chunks
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.title)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition"
                        title="Delete document and vector chunks"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
