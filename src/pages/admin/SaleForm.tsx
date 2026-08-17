import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, ApiError } from '../../api/client';
import { JEWELRY_CATEGORIES } from '../../lib/categories';

const todayStr = () => new Date().toISOString().slice(0, 10);

interface JewelryOption {
  id: number;
  name: string;
  category: string;
  silverWeightGrams: number;
  stoneWeightGrams: number | null;
  stonePrice: number | null;
  makingCharge: number;
  price: number;
}

export function SaleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [mode, setMode] = useState<'manual' | 'inventory'>('manual');
  const [inventoryItems, setInventoryItems] = useState<JewelryOption[]>([]);
  const [jewelryId, setJewelryId] = useState('');

  const [ringName, setRingName] = useState('');
  const [category, setCategory] = useState(JEWELRY_CATEGORIES[0]);
  const [source, setSource] = useState<'homemade' | 'bought'>('homemade');
  const [silverWeightGrams, setSilverWeightGrams] = useState('');
  const [silverRatePerGram, setSilverRatePerGram] = useState('');
  const [stoneWeightGrams, setStoneWeightGrams] = useState('');
  const [stonePrice, setStonePrice] = useState('');
  const [makingCharge, setMakingCharge] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [soldAt, setSoldAt] = useState(todayStr());
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) return;
    apiGet('/settings').then((settings) => setSilverRatePerGram(String(settings.silverRatePerGram)));
  }, [isEdit]);

  useEffect(() => {
    apiGet('/jewelries?status=available&pageSize=200').then((res: { data: JewelryOption[] }) => setInventoryItems(res.data));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    apiGet(`/sales/${id}`).then((sale) => {
      setRingName(sale.ringName);
      setCategory(sale.category);
      setSource(sale.source);
      setSilverWeightGrams(String(sale.silverWeightGrams));
      setSilverRatePerGram(String(sale.silverRatePerGram));
      setStoneWeightGrams(sale.stoneWeightGrams !== null ? String(sale.stoneWeightGrams) : '');
      setStonePrice(sale.stonePrice ? String(sale.stonePrice) : '');
      setMakingCharge(sale.makingCharge ? String(sale.makingCharge) : '');
      setSoldPrice(String(sale.soldPrice));
      setSoldAt(sale.soldAt);
      setNotes(sale.notes ?? '');
      setLoading(false);

      if (sale.jewelryId !== null) {
        setMode('inventory');
        setJewelryId(String(sale.jewelryId));
        apiGet(`/jewelries/${sale.jewelryId}`).then((item: JewelryOption) => {
          setInventoryItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev]));
        });
      }
    });
  }, [id, isEdit]);

  const selectJewelry = (idStr: string) => {
    setJewelryId(idStr);
    const item = inventoryItems.find((i) => i.id === Number(idStr));
    if (!item) return;
    setRingName(item.name);
    setCategory(item.category);
    setSilverWeightGrams(String(item.silverWeightGrams));
    setStoneWeightGrams(item.stoneWeightGrams !== null ? String(item.stoneWeightGrams) : '');
    setStonePrice(item.stonePrice !== null ? String(item.stonePrice) : '');
    setMakingCharge(String(item.makingCharge));
  };

  const switchMode = (next: 'manual' | 'inventory') => {
    setMode(next);
    if (next === 'manual') setJewelryId('');
  };

  const showCostFields = mode === 'inventory' || source === 'bought';

  const weight = parseFloat(silverWeightGrams) || 0;
  const rate = parseFloat(silverRatePerGram) || 0;
  const stone = showCostFields ? parseFloat(stonePrice) || 0 : 0;
  const making = showCostFields ? parseFloat(makingCharge) || 0 : 0;
  const sold = parseFloat(soldPrice) || 0;

  const silverCost = weight * rate;
  const totalCost = silverCost + stone + making;
  const profit = sold - totalCost;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'inventory' && !jewelryId) {
      setError('Select an item from inventory, or switch to manual entry.');
      return;
    }

    setSubmitting(true);

    const payload = {
      ringName,
      category,
      jewelryId: mode === 'inventory' && jewelryId ? Number(jewelryId) : null,
      source: mode === 'inventory' ? 'bought' : source,
      silverWeightGrams,
      silverRatePerGram,
      stoneWeightGrams: showCostFields ? (stoneWeightGrams || undefined) : undefined,
      stonePrice: showCostFields ? (stonePrice || undefined) : undefined,
      makingCharge: showCostFields ? (makingCharge || undefined) : undefined,
      soldPrice,
      soldAt,
      notes: notes || undefined,
    };

    try {
      if (isEdit) await apiPut(`/sales/${id}`, payload);
      else await apiPost('/sales', payload);
      navigate('/admin/sales');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save sale');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <button type="button" onClick={() => navigate('/admin/sales')} className="text-sm text-neutral-500 hover:text-neutral-900 mb-4">
        ← Back to sales
      </button>

      <h1 className="text-2xl font-semibold mb-6">{isEdit ? 'Edit sale' : 'Add sale'}</h1>

      {error && <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <fieldset>
            <legend className="block text-sm font-medium text-neutral-700 mb-1.5">Item</legend>
            <div className="flex gap-5 mb-3">
              <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                <input type="radio" name="mode" checked={mode === 'manual'} onChange={() => switchMode('manual')} className="accent-neutral-900" />
                Manual entry
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                <input type="radio" name="mode" checked={mode === 'inventory'} onChange={() => switchMode('inventory')} className="accent-neutral-900" />
                From inventory
              </label>
            </div>

            {mode === 'inventory' && (
              <select
                value={jewelryId}
                onChange={(e) => selectJewelry(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white"
              >
                <option value="">Select a piece…</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.category} — Rs {item.price.toLocaleString()}
                  </option>
                ))}
              </select>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Ring name</span>
              <input
                required
                value={ringName}
                onChange={(e) => setRingName(e.target.value)}
                placeholder="e.g. Moonstone silver ring"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm capitalize bg-white"
              >
                {JEWELRY_CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
              </select>
            </label>
          </div>

          {mode === 'manual' && (
            <fieldset>
              <legend className="block text-sm font-medium text-neutral-700 mb-1.5">Source</legend>
              <div className="flex gap-5">
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input
                    type="radio"
                    name="source"
                    checked={source === 'homemade'}
                    onChange={() => setSource('homemade')}
                    className="accent-neutral-900"
                  />
                  Homemade
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input
                    type="radio"
                    name="source"
                    checked={source === 'bought'}
                    onChange={() => setSource('bought')}
                    className="accent-neutral-900"
                  />
                  Bought
                </label>
              </div>
            </fieldset>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Silver weight (g)</span>
              <input
                required type="number" step="0.001" min="0"
                value={silverWeightGrams} onChange={(e) => setSilverWeightGrams(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Silver rate (Rs/g)</span>
              <input
                required type="number" step="0.01" min="0"
                value={silverRatePerGram} onChange={(e) => setSilverRatePerGram(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              />
            </label>
          </div>

          {showCostFields && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-neutral-700 mb-1.5">Stone weight (g)</span>
                  <input
                    type="number" step="0.001" min="0"
                    value={stoneWeightGrams} onChange={(e) => setStoneWeightGrams(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-neutral-700 mb-1.5">Stone price (Rs)</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={stonePrice} onChange={(e) => setStonePrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-neutral-700 mb-1.5">Making charge{mode === 'manual' ? ' paid' : ''} (Rs)</span>
                <input
                  type="number" step="0.01" min="0"
                  value={makingCharge} onChange={(e) => setMakingCharge(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                />
              </label>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Sold price (Rs)</span>
              <input
                required type="number" step="0.01" min="0"
                value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Date sold</span>
              <input
                required type="date"
                value={soldAt} onChange={(e) => setSoldAt(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-neutral-700 mb-1.5">Notes</span>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Optional"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
            />
          </label>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-5 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-neutral-500">Silver cost</span><span>Rs {silverCost.toLocaleString()}</span></div>
          {showCostFields && <div className="flex justify-between"><span className="text-neutral-500">Stone cost</span><span>Rs {stone.toLocaleString()}</span></div>}
          {showCostFields && <div className="flex justify-between"><span className="text-neutral-500">Making charge</span><span>Rs {making.toLocaleString()}</span></div>}
          <div className="flex justify-between font-medium border-t border-neutral-200 pt-2"><span>Total cost</span><span>Rs {totalCost.toLocaleString()}</span></div>
          <div className={`flex justify-between font-semibold text-base ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            <span>Profit</span><span>Rs {profit.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/sales')} className="px-4 py-2 rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            Cancel
          </button>
          <button
            type="submit" disabled={submitting}
            className="px-4 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add sale'}
          </button>
        </div>
      </form>
    </div>
  );
}
