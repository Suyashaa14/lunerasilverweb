import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, apiGet, apiPost, apiPut, apiUpload } from '../../api/client';
import { BUTTON, Card, CardHead, ErrorNote, Loading } from '../../components/admin/ui';
import { money } from '../../components/admin/format';

const CATEGORIES = ['rings', 'necklaces', 'earrings', 'bangles', 'pendants', 'other'];
const PURITIES = ['925', '999', '800'];
const n = (v: string) => (v.trim() === '' ? 0 : Number(v));

export function JewelryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('rings');
  const [status, setStatus] = useState('available');
  const [material, setMaterial] = useState('Silver');
  const [purity, setPurity] = useState('925');
  const [silverWeightGrams, setWeight] = useState('');
  const [makingCharge, setMaking] = useState('');
  const [stoneWeightGrams, setStoneWeight] = useState('');
  const [stonePrice, setStonePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/settings').then((s) => setRate(Number(s.silverRatePerGram))).catch(() => setRate(0));
  }, []);

  useEffect(() => {
    if (!editing) return;
    apiGet(`/jewelries/${id}/detail`)
      .then((p) => {
        setName(p.name); setSku(p.sku ?? ''); setCategory(p.category); setStatus(p.status);
        setMaterial(p.material ?? 'Silver'); setPurity(p.purity ?? '925');
        setWeight(String(p.silverWeightGrams)); setMaking(String(p.makingCharge));
        setStoneWeight(p.stoneWeightGrams === null ? '' : String(p.stoneWeightGrams));
        setStonePrice(p.stonePrice === null ? '' : String(p.stonePrice));
        setCostPrice(p.costPrice === null ? '' : String(p.costPrice));
      })
      .catch(() => setError('Could not load this piece.'))
      .finally(() => setLoading(false));
  }, [id, editing]);

  // Exactly the formula printed on the jewellery screens, worked out live so
  // the figure here and the figure on the detail page can never differ.
  const silverValue = n(silverWeightGrams) * rate;
  const price = silverValue + n(makingCharge) + n(stonePrice);
  const cost = costPrice.trim() === '' ? null : n(costPrice);
  const margin = cost === null ? null : price - cost;
  const marginPercent = cost === null || price === 0 ? null : Math.round(((price - cost) / price) * 1000) / 10;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim() === '') return setError('The piece needs a name.');
    if (n(silverWeightGrams) <= 0) return setError('Enter the silver weight.');

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        category,
        pricingMode: 'makingCharge',
        makingCharge: n(makingCharge),
        silverWeightGrams: n(silverWeightGrams),
        stoneWeightGrams: stoneWeightGrams.trim() === '' ? undefined : n(stoneWeightGrams),
        stonePrice: stonePrice.trim() === '' ? undefined : n(stonePrice),
      };

      let saved;
      if (photo) {
        const form = new FormData();
        Object.entries(body).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
        form.append('image', photo);
        saved = await apiUpload(editing ? `/jewelries/${id}` : '/jewelries', editing ? 'PUT' : 'POST', form);
      } else {
        saved = editing ? await apiPut(`/jewelries/${id}`, body) : await apiPost('/jewelries', body);
      }

      navigate(`/admin/jewelries/${saved.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this piece.');
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <form onSubmit={submit} className="max-w-[1300px] pb-28 md:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-neutral-500">Jewellery / {editing ? sku || 'Edit' : 'New piece'}</div>
          <h1 className="text-3xl font-semibold tracking-tight">{editing ? 'Edit piece' : 'New piece'}</h1>
        </div>
        <div className="hidden md:flex gap-2">
          <button type="button" onClick={() => navigate('/admin/jewelries')} className={BUTTON.secondary}>Cancel</button>
          <button type="submit" disabled={saving} className={BUTTON.primary}>{saving ? 'Saving…' : 'Save piece'}</button>
        </div>
      </header>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <Card>
            <CardHead title="Identity" />
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-neutral-600">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                <span className="text-xs text-neutral-400 mt-1 block">Printed on the invoice line.</span>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">SKU</span>
                <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="auto" disabled={editing}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono disabled:bg-neutral-50 disabled:text-neutral-500" />
                <span className="text-xs text-neutral-400 mt-1 block">
                  {editing ? 'Cannot change once the piece exists.' : 'Left blank, one is generated.'}
                </span>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm bg-white capitalize">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Status</span>
                <input value={status} disabled
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm bg-neutral-50 text-neutral-500 capitalize" />
                <span className="text-xs text-neutral-400 mt-1 block">
                  Sold and reserved are set by selling, not here. To retire a piece, use the detail page.
                </span>
              </label>
            </div>
          </Card>

          <Card>
            <CardHead title="Silver and making" />
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-neutral-600">Material</span>
                <input value={material} onChange={(e) => setMaterial(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Purity</span>
                <select value={purity} onChange={(e) => setPurity(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm bg-white">
                  {PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Silver weight (grams)</span>
                <input type="number" step="0.001" value={silverWeightGrams} onChange={(e) => setWeight(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                <span className="text-xs text-neutral-400 mt-1 block">Three decimals. Drives the price and the silver-in-stock total.</span>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Making charge (Rs)</span>
                <input type="number" step="0.01" value={makingCharge} onChange={(e) => setMaking(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                <span className="text-xs text-neutral-400 mt-1 block">This is your margin on the silver.</span>
              </label>
            </div>
          </Card>

          <Card>
            <CardHead title="Stone" right={<span className="text-sm text-neutral-400">Optional</span>} />
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-neutral-600">Stone weight (grams)</span>
                <input type="number" step="0.001" value={stoneWeightGrams} onChange={(e) => setStoneWeight(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                <span className="text-xs text-neutral-400 mt-1 block">Not counted as silver.</span>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Stone price (Rs)</span>
                <input type="number" step="0.01" value={stonePrice} onChange={(e) => setStonePrice(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                <span className="text-xs text-neutral-400 mt-1 block">Added to the selling price.</span>
              </label>
            </div>
          </Card>

          <Card>
            <CardHead title="Photo" right={<span className="text-sm text-neutral-400">One per piece</span>} />
            <div className="px-5 py-4">
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-sm" />
              <p className="text-xs text-neutral-400 mt-2">
                Invoices keep their own copy at the time of sale, so replacing this never changes a past invoice.
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="Selling price today" />
            <div className="px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-mono tabular-nums">
                  {silverWeightGrams || '0'} g × {rate.toFixed(2)}
                </span>
                <span className="font-mono tabular-nums">{money(silverValue)}</span>
              </div>
              <div className="flex justify-between"><span className="text-neutral-500">Making charge</span><span className="font-mono tabular-nums">{money(n(makingCharge))}</span></div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Stone</span>
                <span className={`font-mono tabular-nums ${n(stonePrice) === 0 ? 'text-neutral-400' : ''}`}>{money(n(stonePrice))}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-neutral-100">
                <span className="text-base font-semibold">Price</span>
                <span className="font-mono tabular-nums text-2xl font-semibold">{money(price)}</span>
              </div>
              <p className="text-xs text-neutral-400 pt-2">
                Recalculated from the live silver rate every time. Not stored on the piece.
              </p>
            </div>
          </Card>

          <Card>
            <CardHead title="Margin check" />
            <div className="px-5 py-4 space-y-2 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span className="text-neutral-500">Cost price</span>
                <input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="not set" disabled={editing}
                  className="w-32 px-2 py-1.5 rounded-lg border border-neutral-200 text-sm font-mono text-right disabled:bg-neutral-50" />
              </label>
              <div className="flex justify-between">
                <span className="text-neutral-500">Margin</span>
                <span className={`font-mono tabular-nums ${margin === null ? 'text-neutral-400' : margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {margin === null ? '—' : money(margin)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Margin %</span>
                <span className={`font-mono tabular-nums ${marginPercent === null ? 'text-neutral-400' : marginPercent >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {marginPercent === null ? '—' : `${marginPercent}%`}
                </span>
              </div>
              <p className="text-xs text-neutral-400 pt-2">
                Cost comes from the purchase bill the piece arrived on. Entering a bill under Purchases fills this in and links the
                piece to its source — which is the only way the margin can be trusted.
              </p>
            </div>
          </Card>

          <Card>
            <CardHead title="On save" />
            <p className="px-5 py-4 text-sm text-neutral-600">
              {editing
                ? 'Changing weight or making charge only affects future sales. Issued invoices keep their own snapshot, so past bills stay untouched.'
                : 'The piece goes on the shelf as available. A piece added here has no purchase bill behind it, so it has no cost price and no margin — enter it through Purchases instead if you have the bill.'}
            </p>
          </Card>
        </div>
      </div>

      <div className="md:hidden fixed inset-x-0 bottom-0 p-4 bg-neutral-50/95 backdrop-blur border-t border-neutral-200 flex gap-3">
        <button type="button" onClick={() => navigate('/admin/jewelries')} className={BUTTON.secondary}>Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-3.5 rounded-xl bg-neutral-900 text-white text-[15px] font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : `Save · ${money(price)}`}
        </button>
      </div>
    </form>
  );
}
