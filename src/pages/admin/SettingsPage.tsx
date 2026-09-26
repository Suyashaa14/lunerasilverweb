import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiUpload, ApiError } from '../../api/client';
import { Loading } from '../../components/admin/ui';

export function SettingsPage() {
  const [rate, setRate] = useState('');
  const [rateSource, setRateSource] = useState<'manual' | 'auto'>('manual');
  const [rateSyncedAt, setRateSyncedAt] = useState<string | null>(null);
  const [esewaQrUrl, setEsewaQrUrl] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [savingRate, setSavingRate] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [syncingRate, setSyncingRate] = useState(false);
  const [rateMsg, setRateMsg] = useState<string | null>(null);
  const [qrMsg, setQrMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySettings = (s: { silverRatePerGram: number; silverRateSource: 'manual' | 'auto'; silverRateSyncedAt: string | null; esewaQrUrl: string | null }) => {
    setRate(String(s.silverRatePerGram));
    setRateSource(s.silverRateSource);
    setRateSyncedAt(s.silverRateSyncedAt);
    setEsewaQrUrl(s.esewaQrUrl);
  };

  useEffect(() => {
    apiGet('/settings').then((s) => {
      applySettings(s);
      setLoading(false);
    });
  }, []);

  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRate(true);
    setRateMsg(null);
    try {
      applySettings(await apiPut('/settings/silver-rate', { silverRatePerGram: parseFloat(rate) }));
      setRateMsg("Today's silver rate updated — all listing prices now reflect it.");
    } catch (err) {
      setRateMsg(err instanceof ApiError ? err.message : 'Could not update rate');
    } finally {
      setSavingRate(false);
    }
  };

  const syncRate = async () => {
    setSyncingRate(true);
    setRateMsg(null);
    try {
      applySettings(await apiPost('/settings/silver-rate/sync'));
      setRateMsg("Pulled today's rate from FENEGOSIDA.");
    } catch (err) {
      setRateMsg(err instanceof ApiError ? err.message : 'Could not fetch today\'s rate');
    } finally {
      setSyncingRate(false);
    }
  };

  const saveQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrFile) return;
    setSavingQr(true);
    setQrMsg(null);
    try {
      const fd = new FormData();
      fd.append('image', qrFile);
      const res = await apiUpload('/settings/esewa-qr', 'POST', fd);
      setEsewaQrUrl(res.esewaQrUrl);
      setQrFile(null);
      setQrMsg('eSewa QR updated.');
    } catch (err) {
      setQrMsg(err instanceof ApiError ? err.message : 'Could not upload QR image');
    } finally {
      setSavingQr(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <form onSubmit={saveRate} className="bg-white border border-neutral-200 rounded-lg p-6 space-y-3">
        <h2 className="font-semibold">Today's silver rate</h2>
        <p className="text-sm text-neutral-500">Every jewelry price is computed live from this rate plus its making charge.</p>
        <div className="flex gap-3 items-center">
          <span className="text-neutral-500 text-sm">Rs</span>
          <input required type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)}
                 className="px-3 py-2 border border-neutral-300 rounded-md w-40" />
          <span className="text-neutral-500 text-sm">per gram</span>
          <button type="submit" disabled={savingRate}
                  className="ml-auto px-4 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50">
            {savingRate ? 'Saving…' : 'Update rate'}
          </button>
        </div>
        <div className="flex items-center justify-between text-sm text-neutral-500 pt-1 border-t border-neutral-100">
          <span>
            {rateSource === 'auto'
              ? `Auto-synced from FENEGOSIDA${rateSyncedAt ? ` · ${new Date(rateSyncedAt).toLocaleString()}` : ''}`
              : 'Manually set'}
          </span>
          <button type="button" onClick={syncRate} disabled={syncingRate}
                  className="px-3 py-1.5 rounded-md border border-neutral-300 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50">
            {syncingRate ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
        {rateMsg && <div className="text-sm text-neutral-600">{rateMsg}</div>}
      </form>

      <form onSubmit={saveQr} className="bg-white border border-neutral-200 rounded-lg p-6 space-y-3">
        <h2 className="font-semibold">eSewa QR code</h2>
        <p className="text-sm text-neutral-500">Shown to customers at checkout when they choose to pay by eSewa.</p>
        {esewaQrUrl && <img src={esewaQrUrl} alt="Current eSewa QR" className="w-32 h-32 object-contain border border-neutral-200 rounded-md" />}
        <input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files?.[0] ?? null)} />
        <div>
          <button type="submit" disabled={savingQr || !qrFile}
                  className="px-4 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50">
            {savingQr ? 'Uploading…' : 'Upload QR'}
          </button>
        </div>
        {qrMsg && <div className="text-sm text-neutral-600">{qrMsg}</div>}
      </form>
    </div>
  );
}
