import { useCallback, useEffect, useState, type FC } from 'react';
import { AlertCircle, CheckCircle2, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react';
import api from '../../lib/api';

type AdAccount = { id: string; name: string; currency?: string; timeZone?: string; status?: string };
type FacebookPage = { id: string; name: string; instagramBusinessAccountId?: string; instagramUsername?: string };
type Connection = {
  platform: 'Meta' | 'GoogleAds';
  providerUserName: string;
  providerUserId: string;
  accounts: AdAccount[];
  pages: FacebookPage[];
  selectedAccountId?: string;
  metaPageId?: string;
  instagramAccountId?: string;
  googleManagerCustomerId?: string;
  connectedAtUtc: string;
  tokenExpiresAtUtc?: string;
};

interface Props {
  institutionId: string | null;
  institutionName: string;
  scope?: 'institution' | 'global';
}

export const AdPlatformConnectionsPanel: FC<Props> = ({ institutionId, institutionName, scope = 'institution' }) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isGlobal = scope === 'global';
  const apiPath = isGlobal ? '/api/ad-platforms/global' : '/api/ad-platforms';

  const loadConnections = useCallback(async () => {
    if (!isGlobal && !institutionId) {
      setConnections([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Connection[]>(isGlobal ? `${apiPath}/connections` : `${apiPath}/connections`);
      setConnections(response.data || []);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Could not load the institution ad account connections.');
    } finally {
      setLoading(false);
    }
  }, [institutionId, isGlobal, apiPath]);

  useEffect(() => { void loadConnections(); }, [loadConnections]);

  useEffect(() => {
    const onOAuthComplete = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'ad-platform-oauth') return;
      if (event.data.success) {
        setNotice(`${event.data.platform === 'GoogleAds' ? 'Google Ads' : 'Meta'} account connected. Select the ad account below.`);
        setError('');
        void loadConnections();
      } else {
        setError('The account could not be connected. Check the provider app, permissions, account access, and server configuration, then try again.');
      }
    };
    window.addEventListener('message', onOAuthComplete);
    return () => window.removeEventListener('message', onOAuthComplete);
  }, [loadConnections]);

  const connect = async (platform: 'Meta' | 'GoogleAds') => {
    if (!isGlobal && !institutionId) return;
    setError('');
    setNotice('');
    const popup = window.open('about:blank', 'ad-platform-oauth', 'popup,width=680,height=780');
    if (!popup) {
      setError('Allow pop-ups for MySchoolAdmissions to connect an ad account.');
      return;
    }
    try {
      const response = await api.post<{ authorizationUrl: string }>(`${apiPath}/${platform}/authorize`);
      popup.location.href = response.data.authorizationUrl;
    } catch (requestError: any) {
      popup.close();
      setError(requestError?.response?.data?.message || 'Could not start the account authorization flow.');
    }
  };

  const saveSelection = async (connection: Connection, form: HTMLFormElement) => {
    const formData = new FormData(form);
    const platform = connection.platform;
    setSavingPlatform(platform);
    setError('');
    setNotice('');
    try {
      await api.put(`${apiPath}/${platform}/selection`, {
        accountId: formData.get('accountId'),
        pageId: formData.get('pageId') || null,
        instagramAccountId: formData.get('instagramAccountId') || null,
        googleManagerCustomerId: formData.get('googleManagerCustomerId') || null
      });
      setNotice(`${platform === 'GoogleAds' ? 'Google Ads' : 'Meta'} account selection saved for ${institutionName}.`);
      await loadConnections();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Could not save the selected ad account.');
    } finally {
      setSavingPlatform(null);
    }
  };

  const disconnect = async (platform: 'Meta' | 'GoogleAds') => {
    if (!window.confirm(`Disconnect ${platform === 'GoogleAds' ? 'Google Ads' : 'Meta'} for ${institutionName}?`)) return;
    setSavingPlatform(platform);
    setError('');
    setNotice('');
    try {
      await api.delete(`${apiPath}/${platform}/connection`);
      setNotice(`${platform === 'GoogleAds' ? 'Google Ads' : 'Meta'} was disconnected from ${institutionName}.`);
      await loadConnections();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Could not disconnect the ad account.');
    } finally {
      setSavingPlatform(null);
    }
  };

  const byPlatform = (platform: Connection['platform']) => connections.find(item => item.platform === platform);

  if (!isGlobal && !institutionId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Select one institution to manage its ad account connections. Every connection is isolated to that institution.
      </div>
    );
  }

  const meta = byPlatform('Meta');
  const google = byPlatform('GoogleAds');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{isGlobal ? 'Global ad platform accounts' : 'Ad platform accounts'}</h2>
          <p className="mt-1 text-xs text-gray-500">{isGlobal ? 'Super Admin owned accounts used only for General Ads, separate from institution accounts. Meta ads require a Facebook Page; Instagram placement is optional.' : `Connect accounts owned by ${institutionName}. Meta ads require a Facebook Page; Instagram placement is optional.`}</p>
        </div>
        <button onClick={() => void loadConnections()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

      {loading && connections.length === 0 ? (
        <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ConnectionCard title="Meta: Facebook + Instagram" description={isGlobal ? 'Authorize Super Admin-owned Meta Business assets for General Ads.' : "Authorize this institution's Meta Business portfolio and linked Instagram account."} connection={meta} platform="Meta" busy={savingPlatform === 'Meta'} onConnect={connect} onDisconnect={disconnect} onSave={saveSelection} />
          <ConnectionCard title="Google Ads" description={isGlobal ? 'Authorize the Super Admin Google Ads customer used for General Ads.' : "Authorize this institution's Google Ads customer account."} connection={google} platform="GoogleAds" busy={savingPlatform === 'GoogleAds'} onConnect={connect} onDisconnect={disconnect} onSave={saveSelection} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
          <h3 className="text-sm font-bold text-blue-950">Campaign publishing</h3>
          <p className="mt-2 text-xs leading-5 text-blue-900">{isGlobal ? 'General Ads are authored and published from the separate General Ads workspace with these global accounts. Institute campaign accounts are not used.' : 'Institute campaign publishing and General Ads use separate workflows and separate account connections.'}</p>
        </section>
        <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
          <h3 className="text-sm font-bold text-violet-950">Lead import</h3>
          <p className="mt-2 text-xs leading-5 text-violet-900">Lead import is a separate integration. It needs provider webhooks/forms, institution routing, and lead-field mapping; connecting an ad account does not subscribe forms or import leads.</p>
        </section>
      </div>
    </div>
  );
};

interface CardProps {
  title: string;
  description: string;
  connection?: Connection;
  platform: 'Meta' | 'GoogleAds';
  busy: boolean;
  onConnect: (platform: 'Meta' | 'GoogleAds') => void;
  onDisconnect: (platform: 'Meta' | 'GoogleAds') => void;
  onSave: (connection: Connection, form: HTMLFormElement) => void;
}

const ConnectionCard: FC<CardProps> = ({ title, description, connection, platform, busy, onConnect, onDisconnect, onSave }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
      {connection ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800">Connected</span> : <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600">Not connected</span>}
    </div>

    {!connection ? (
      <button onClick={() => onConnect(platform)} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Connect {platform === 'GoogleAds' ? 'Google Ads' : 'Meta'}
      </button>
    ) : (
      <>
        <button onClick={() => onConnect(platform)} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Reconnect / change authorized user
        </button>
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
          <div><span className="font-semibold">Authorized user:</span> {connection.providerUserName}</div>
          {connection.tokenExpiresAtUtc && <div className="mt-1"><span className="font-semibold">Token expiry:</span> {new Date(connection.tokenExpiresAtUtc).toLocaleDateString()}</div>}
        </div>
        {platform === 'Meta' && connection.pages.length === 0 && (
          <div role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Meta returned no Facebook Pages for this authorized profile, so there is nothing to select. Give this Facebook profile access to the Page and approve <code>pages_show_list</code> for the app, then use <strong>Reconnect / change authorized user</strong> to reload its assets. The Page dropdown is required for Meta ads.
          </div>
        )}
        <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void onSave(connection, event.currentTarget); }}>
          <label className="block text-xs font-semibold text-gray-700">
            {platform === 'GoogleAds' ? 'Google Ads customer account' : 'Meta ad account'}
            <select name="accountId" defaultValue={connection.selectedAccountId || ''} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-xs">
              <option value="" disabled>Select an account</option>
              {connection.accounts.map(account => <option key={account.id} value={account.id}>{account.name} | {account.id}{account.currency ? ` | ${account.currency}` : ''}</option>)}
            </select>
          </label>
          {platform === 'Meta' && (
            <>
              <label className="block text-xs font-semibold text-gray-700">Facebook Page (required for Meta ads)
                <select name="pageId" defaultValue={connection.metaPageId || ''} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-xs">
                  <option value="" disabled>Select a Facebook Page</option>
                  {connection.pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-gray-700">Linked Instagram professional account
                <select name="instagramAccountId" defaultValue={connection.instagramAccountId || ''} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-xs">
                  <option value="">None selected</option>
                  {connection.pages.filter(page => page.instagramBusinessAccountId).map(page => <option key={page.instagramBusinessAccountId} value={page.instagramBusinessAccountId}>@{page.instagramUsername || page.name} | {page.instagramBusinessAccountId}</option>)}
                </select>
              </label>
            </>
          )}
          {platform === 'GoogleAds' && (
            <label className="block text-xs font-semibold text-gray-700">Manager account (optional)
              <select name="googleManagerCustomerId" defaultValue={connection.googleManagerCustomerId || ''} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-xs">
                <option value="">Direct account access</option>
                {connection.accounts.map(account => <option key={account.id} value={account.id}>{account.name} | {account.id}</option>)}
              </select>
              <span className="mt-1 block font-normal text-gray-500">Set this only when the selected customer is accessed through that manager.</span>
            </label>
          )}
          <button type="submit" disabled={busy} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50">{busy ? 'Saving...' : 'Save account selection'}</button>
        </form>
        <button onClick={() => onDisconnect(platform)} disabled={busy} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900 disabled:opacity-50"><Unlink className="h-3.5 w-3.5" /> Disconnect account</button>
      </>
    )}
  </section>
);
