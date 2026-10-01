import React, { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import { AlertCircle, ExternalLink, Loader2, Megaphone, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { AdPlatformConnectionsPanel } from './AdPlatformConnectionsPanel';

type Platform = 'Meta' | 'GoogleAds';
interface Publication { platform: Platform; status: string; externalIdsJson: string; error?: string; }
interface GeneralAd {
  id: string; name: string; advertiserOrTopic: string; relatedInstitutionName?: string; headline: string; primaryText: string;
  description: string; destinationUrl: string; imageUrl?: string; googleHeadlines: string[]; googleDescriptions: string[]; keywords: string[];
  budgetInr: number; startDateUtc: string; endDateUtc: string; status: string; publications: Publication[];
}
interface AdForm {
  name: string; advertiserOrTopic: string; relatedInstitutionName: string; headline: string; primaryText: string; description: string;
  destinationUrl: string; imageUrl: string; googleHeadlines: string; googleDescriptions: string; keywords: string;
  budgetInr: string; startDateUtc: string; endDateUtc: string;
}

const dateInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const emptyForm = (): AdForm => ({
  name: '', advertiserOrTopic: 'MySchoolAdmissions', relatedInstitutionName: '', headline: '', primaryText: '', description: '',
  destinationUrl: '', imageUrl: '', googleHeadlines: '', googleDescriptions: '', keywords: '', budgetInr: '35000',
  startDateUtc: dateInput(new Date(Date.now() + 60 * 60 * 1000)), endDateUtc: dateInput(new Date(Date.now() + 30 * 86400000))
});

export const GeneralAdsManager: FC = () => {
  const [ads, setAds] = useState<GeneralAd[]>([]);
  const [form, setForm] = useState<AdForm>(emptyForm);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<GeneralAd[]>('/api/general-ads');
      setAds(response.data || []);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Could not load General Ads.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadAds(); }, [loadAds]);

  const saveDraft = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const payload = {
        ...form,
        budgetInr: Number(form.budgetInr),
        startDateUtc: new Date(form.startDateUtc).toISOString(),
        endDateUtc: new Date(form.endDateUtc).toISOString(),
        imageUrl: form.imageUrl || null,
        relatedInstitutionName: form.relatedInstitutionName || null,
        googleHeadlines: form.googleHeadlines.split('\n').map(text => text.trim()).filter(Boolean),
        googleDescriptions: form.googleDescriptions.split('\n').map(text => text.trim()).filter(Boolean),
        keywords: form.keywords.split(',').map(text => text.trim()).filter(Boolean)
      };
      const result = editingAdId
        ? await api.put<GeneralAd>(`/api/general-ads/${editingAdId}`, payload)
        : await api.post<GeneralAd>('/api/general-ads', payload);
      setAds(current => editingAdId
        ? current.map(ad => ad.id === editingAdId ? result.data : ad)
        : [result.data, ...current]);
      setForm(emptyForm()); setEditingAdId(null); setShowForm(false);
      setNotice(editingAdId ? 'General Ad updated.' : 'General Ad saved as a draft. Choose a platform below to submit it.');
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Could not save the General Ad.');
    } finally { setSaving(false); }
  };

  const editAd = (ad: GeneralAd) => {
    setEditingAdId(ad.id);
    setForm({
      name: ad.name, advertiserOrTopic: ad.advertiserOrTopic, relatedInstitutionName: ad.relatedInstitutionName || '',
      headline: ad.headline, primaryText: ad.primaryText, description: ad.description, destinationUrl: ad.destinationUrl,
      imageUrl: ad.imageUrl || '', googleHeadlines: ad.googleHeadlines.join('\n'), googleDescriptions: ad.googleDescriptions.join('\n'),
      keywords: ad.keywords.join(', '), budgetInr: String(ad.budgetInr), startDateUtc: dateInput(new Date(ad.startDateUtc)),
      endDateUtc: dateInput(new Date(ad.endDateUtc))
    });
    setShowForm(true); setError(''); setNotice('');
  };

  const cancelForm = () => { setShowForm(false); setEditingAdId(null); setForm(emptyForm()); };

  const publish = async (ad: GeneralAd, platform: Platform) => {
    const provider = platform === 'GoogleAds' ? 'Google Ads Search' : 'Meta (Facebook and linked Instagram)';
    const budget = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(ad.budgetInr);
    if (!window.confirm(`Publish “${ad.name}” to the global ${provider} account? This submits an active ad using the total ${budget} budget and the dates shown. Provider review and billing apply.`)) return;
    setPublishing(`${ad.id}:${platform}`); setError(''); setNotice('');
    try {
      const result = await api.post<GeneralAd>(`/api/general-ads/${ad.id}/publish/${platform}`);
      setAds(current => current.map(item => item.id === ad.id ? result.data : item));
      setNotice(`${provider} submission recorded for “${ad.name}”.`);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || requestError?.response?.data?.message || `Could not publish to ${provider}.`);
      await loadAds();
    } finally { setPublishing(null); }
  };

  const deleteDraft = async (ad: GeneralAd) => {
    if (!window.confirm(`Delete the draft “${ad.name}”?`)) return;
    try { await api.delete(`/api/general-ads/${ad.id}`); setAds(current => current.filter(item => item.id !== ad.id)); }
    catch (requestError: any) { setError(requestError?.response?.data?.message || 'Could not delete this draft.'); }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-0.5 h-5 w-5 text-indigo-700" />
          <div>
            <h2 className="text-base font-bold text-indigo-950">General Ads</h2>
            <p className="mt-1 text-xs leading-5 text-indigo-900">These ads are owned and published by Super Admin, independently of institute campaigns. Promote MySchoolAdmissions, another product, public information, or optionally feature an institute. They use separate global Meta and Google accounts.</p>
          </div>
        </div>
      </section>

      <AdPlatformConnectionsPanel institutionId={null} institutionName="Global Super Admin" scope="global" />

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-gray-900">General Ad drafts and submissions</h2><p className="mt-1 text-xs text-gray-500">Choose one publish button per platform. Meta submits only to Meta (Facebook and, if selected, Instagram); Google Ads is a separate action and is never submitted by the Meta button. Meta requires a selected Facebook Page.</p></div>
          <button onClick={() => { if (showForm) cancelForm(); else { setEditingAdId(null); setForm(emptyForm()); setShowForm(true); } }} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800"><Plus className="h-4 w-4" />Create General Ad</button>
        </div>

        {showForm && <form onSubmit={saveDraft} className="mt-5 space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
          <h3 className="text-sm font-bold text-gray-900">{editingAdId ? 'Update General Ad' : 'Create General Ad'}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ad name"><input required maxLength={200} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Advertiser, product, or topic"><input required value={form.advertiserOrTopic} onChange={event => setForm({ ...form, advertiserOrTopic: event.target.value })} placeholder="MySchoolAdmissions, product name, public notice..." /></Field>
            <Field label="Related institute (optional)"><input value={form.relatedInstitutionName} onChange={event => setForm({ ...form, relatedInstitutionName: event.target.value })} placeholder="Optional context only" /></Field>
            <Field label="Ad headline"><input required maxLength={90} value={form.headline} onChange={event => setForm({ ...form, headline: event.target.value })} /></Field>
            <Field label="HTTPS destination URL"><input required type="url" value={form.destinationUrl} onChange={event => setForm({ ...form, destinationUrl: event.target.value })} placeholder="https://example.com" /></Field>
            <Field label="Public HTTPS image URL (required for Meta)"><input type="url" value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://example.com/ad-image.jpg" /></Field>
          </div>
          <Field label="Primary ad text"><textarea required rows={3} value={form.primaryText} onChange={event => setForm({ ...form, primaryText: event.target.value })} /></Field>
          <Field label="Short description"><input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Total budget (INR)"><input required type="number" min="1" step="1" value={form.budgetInr} onChange={event => setForm({ ...form, budgetInr: event.target.value })} /></Field>
            <Field label="Start date/time"><input required type="datetime-local" value={form.startDateUtc} onChange={event => setForm({ ...form, startDateUtc: event.target.value })} /></Field>
            <Field label="End date/time"><input required type="datetime-local" value={form.endDateUtc} onChange={event => setForm({ ...form, endDateUtc: event.target.value })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Google headlines (one per line; 3+; max 30 chars each)"><textarea rows={4} value={form.googleHeadlines} onChange={event => setForm({ ...form, googleHeadlines: event.target.value })} /></Field>
            <Field label="Google descriptions (one per line; 2+; max 90 chars each)"><textarea rows={4} value={form.googleDescriptions} onChange={event => setForm({ ...form, googleDescriptions: event.target.value })} /></Field>
            <Field label="Google Search keywords (comma separated)"><textarea rows={4} value={form.keywords} onChange={event => setForm({ ...form, keywords: event.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={cancelForm} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editingAdId ? 'Save changes' : 'Save draft'}</button></div>
        </form>}

        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /></div> : ads.length === 0 ? <p className="py-10 text-center text-xs text-gray-500">No General Ads yet. Create a draft to get started.</p> : <div className="mt-5 space-y-3">
          {ads.map(ad => <article key={ad.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-bold text-gray-900">{ad.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ad.status === 'Published' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{ad.status}</span></div>
                <p className="mt-1 text-xs text-gray-600">{ad.advertiserOrTopic}{ad.relatedInstitutionName ? ` · mentions ${ad.relatedInstitutionName}` : ''}</p>
                <a href={ad.destinationUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline">{ad.destinationUrl}<ExternalLink className="h-3 w-3" /></a>
                <p className="mt-1 text-xs text-gray-500">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(ad.budgetInr)} total · {new Date(ad.startDateUtc).toLocaleDateString()}–{new Date(ad.endDateUtc).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEditAd(ad) && <button onClick={() => editAd(ad)} title="Edit draft" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"><Pencil className="h-3.5 w-3.5" />Edit</button>}
                <PublishButton ad={ad} platform="Meta" busy={publishing === `${ad.id}:Meta`} onPublish={publish} />
                <PublishButton ad={ad} platform="GoogleAds" busy={publishing === `${ad.id}:GoogleAds`} onPublish={publish} />
                {ad.publications.length === 0 && <button onClick={() => void deleteDraft(ad)} title="Delete draft" className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
            {ad.publications.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{ad.publications.map(item => <div key={item.platform} className="rounded-lg bg-gray-50 p-3 text-xs"><div className="font-bold text-gray-800">{item.platform === 'GoogleAds' ? 'Google Ads' : 'Meta'} · {item.status}</div>{item.error && <p className="mt-1 text-red-700">{item.error}</p>}<pre className="mt-1 overflow-auto text-[10px] text-gray-600">{item.externalIdsJson}</pre></div>)}</div>}
          </article>)}
        </div>}
      </section>
    </div>
  );
};

const canEditAd = (ad: GeneralAd) => (ad.publications || []).every(item => {
  if (item.status.toLowerCase() !== 'failed') return false;
  try {
    const ids = JSON.parse(item.externalIdsJson || '{}') as Record<string, unknown>;
    const keys = Object.keys(ids);
    return keys.length === 0 || (item.platform.toLowerCase() === 'meta' && keys.every(key => key === 'campaignId'));
  } catch {
    return false;
  }
});

const PublishButton: FC<{ ad: GeneralAd; platform: Platform; busy: boolean; onPublish: (ad: GeneralAd, platform: Platform) => void }> = ({ ad, platform, busy, onPublish }) => {
  const record = ad.publications.find(item => item.platform === platform);
  const canRetry = record?.status === 'Failed';
  const exists = !!record && !canRetry;
  const label = platform === 'Meta' ? 'Meta only' : 'Google only';
  return <button disabled={busy || exists} onClick={() => onPublish(ad, platform)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}{exists ? `${label} submitted` : canRetry ? `Retry ${label}` : `Publish ${label}`}</button>;
};

const Field: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block text-xs font-semibold text-gray-700">{label}{React.cloneElement(children as React.ReactElement<{ className?: string }>, { className: 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-normal' })}</label>;
