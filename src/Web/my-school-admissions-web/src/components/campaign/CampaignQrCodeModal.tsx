import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Plus, 
  Download, 
  Check, 
  Copy, 
  MapPin,
  ExternalLink
} from 'lucide-react';
import type { CampaignQrCode, Campaign } from '../../types/campaign';
import api from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCampaign?: Campaign;
  institutionId?: string | null;
  institutionName?: string | null;
}

export const CampaignQrCodeModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  selectedCampaign,
  institutionId,
  institutionName 
}) => {
  const [qrList, setQrList] = useState<CampaignQrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // New QR Form State
  const [title, setTitle] = useState(selectedCampaign ? `${selectedCampaign.name} QR` : '');
  const [codeKey, setCodeKey] = useState(selectedCampaign ? `QR-${selectedCampaign.primaryChannel.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}` : '');
  const [targetLocation, setTargetLocation] = useState(selectedCampaign?.targetGeography || '');
  const [channelType, setChannelType] = useState(selectedCampaign?.primaryChannel || 'Society Event');
  const [destinationUrl, setDestinationUrl] = useState('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const resolveLiveUrl = (url?: string, code?: string) => {
    const base = window.location.origin;
    const targetInst = institutionId || selectedCampaign?.institutionId || '';
    const instParam = targetInst ? `&instId=${targetInst}` : '';
    if (!url || url.includes('admissions.myschool.edu')) {
      return `${base}/apply?src=qr&code=${code || ''}${instParam}`;
    }
    if (!url.includes('instId=') && targetInst) {
      return `${url}${url.includes('?') ? '&' : '?'}instId=${targetInst}`;
    }
    return url;
  };

  useEffect(() => {
    if (isOpen) {
      fetchQrCodes();
    }
  }, [isOpen, institutionId]);

  const fetchQrCodes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/campaigns/intelligence/qrcodes', {
        params: { institutionId: institutionId || undefined }
      });
      setQrList(res.data);
    } catch (err) {
      console.error('Failed to load QR codes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const generatedCode = codeKey || `QR-${channelType.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const targetInst = institutionId || selectedCampaign?.institutionId || '';
      const instParam = targetInst ? `&instId=${targetInst}` : '';
      const payload: Partial<CampaignQrCode> = {
        title,
        codeKey: generatedCode,
        targetLocation,
        channelType,
        destinationUrl: destinationUrl || `${window.location.origin}/apply?src=qr&code=${generatedCode}${instParam}`,
        campaignId: selectedCampaign?.id
      };

      const res = await api.post('/api/campaigns/intelligence/qrcodes', payload, {
        params: { institutionId: targetInst || undefined }
      });
      setQrList(prev => [res.data, ...prev]);
      setIsCreating(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save QR code', err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCodeKey('');
    setTargetLocation('');
    setDestinationUrl('');
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-amber-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Offline Campaign QR Code Generator & Tracker</h2>
                {institutionName && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {institutionName}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200">Generate high-resolution trackable QR codes for apartment booths, flyers, kiosks & hoardings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900">Tracked Offline QR Codes</h3>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              <Plus className="w-4 h-4" /> {isCreating ? 'Close Form' : 'Generate New QR Code'}
            </button>
          </div>

          {/* Creation Form */}
          {isCreating && (
            <form onSubmit={handleCreateQr} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h4 className="font-bold text-gray-800">New Trackable QR Placement</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Title / Label</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Palm Meadows Club House Standee"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Unique Code Key</label>
                  <input
                    type="text"
                    required
                    value={codeKey}
                    onChange={(e) => setCodeKey(e.target.value)}
                    placeholder="e.g. QR-SOC-PALM-26"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Channel Type</label>
                  <select
                    value={channelType}
                    onChange={(e) => setChannelType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Society Event">Society Event / Club House</option>
                    <option value="Mall Kiosk">Mall Kiosk</option>
                    <option value="Flyer">Flyer Drop</option>
                    <option value="Hoarding">Billboard / Hoarding</option>
                    <option value="School Gate">Campus Gate Standee</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Physical Location / Venue</label>
                  <input
                    type="text"
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    placeholder="e.g. Palm Meadows Main Clubhouse Lobby"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Destination URL (optional override)</label>
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder={`${window.location.origin}/apply?src=qr&code=...`}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  Generate & Save QR Code
                </button>
              </div>
            </form>
          )}

          {/* QR Code Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading QR codes...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qrList.map((qr) => {
                const liveDest = resolveLiveUrl(qr.destinationUrl, qr.codeKey);
                const liveImg = qr.qrImageUrl && !qr.qrImageUrl.includes('admissions.myschool.edu')
                  ? qr.qrImageUrl
                  : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(liveDest)}`;

                return (
                  <div key={qr.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex gap-4 items-start">
                    {/* QR Image preview */}
                    <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0 flex items-center justify-center p-1">
                      <img 
                        src={liveImg} 
                        alt={qr.title}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* QR Details */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-sm line-clamp-1">{qr.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          qr.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {qr.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                        <span>{qr.codeKey}</span>
                        <span>•</span>
                        <span className="text-gray-700 font-sans">{qr.channelType}</span>
                      </div>

                      <div className="text-[11px] text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{qr.targetLocation}</span>
                      </div>

                      {/* Scan Performance */}
                      <div className="flex items-center gap-3 pt-1 text-[11px]">
                        <span className="text-gray-500">Scans: <strong className="text-gray-800">{qr.totalScans}</strong></span>
                        <span className="text-gray-500">Leads: <strong className="text-blue-700">{qr.leadsGenerated}</strong></span>
                        <span className="text-gray-500">Admits: <strong className="text-emerald-700">{qr.enrollmentsGenerated}</strong></span>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={liveDest}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold"
                          title="Open public applicant landing page in new tab"
                        >
                          <ExternalLink className="w-3 h-3" /> Test Link
                        </a>
                        <a
                          href={liveImg}
                          target="_blank"
                          rel="noreferrer"
                          download={`${qr.codeKey}.png`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-[11px] font-semibold"
                        >
                          <Download className="w-3 h-3" /> Download High-Res
                        </a>
                        <button
                          onClick={() => copyUrl(liveDest, qr.codeKey)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-[11px]"
                        >
                          {copiedKey === qr.codeKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === qr.codeKey ? 'Copied' : 'Copy URL'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
