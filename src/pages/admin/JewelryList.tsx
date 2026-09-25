import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Pagination } from './Pagination';

interface Jewelry {
  id: number;
  name: string;
  category: string;
  imageUrl: string | null;
  silverWeightGrams: number;
  makingCharge: number;
  status: 'available' | 'sold';
  price: number;
}

const PAGE_SIZE = 20;

export function JewelryList() {
  const [items, setItems] = useState<Jewelry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet(`/jewelries?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Pieces are never deleted -- invoice lines and stock rows point at them.
  // Retiring writes one outbound row to the stock ledger so the count still adds up.
  const retire = async (id: number) => {
    const status = prompt(
      'Take this piece off the shelf.\n\nType one of:\n' +
        '  damaged  - it broke\n' +
        '  lost     - it is missing\n' +
        '  voided   - it was entered by mistake and never existed',
    );
    if (status === null) return;
    const chosen = status.trim().toLowerCase();
    if (!['damaged', 'lost', 'voided'].includes(chosen)) {
      alert('Type damaged, lost or voided.');
      return;
    }
    const reason = prompt('Why? This is kept in the stock history.');
    if (reason === null) return;
    if (reason.trim() === '') {
      alert('A reason is required.');
      return;
    }
    try {
      await apiPost(`/jewelries/${id}/retire`, { status: chosen, reason: reason.trim() });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not retire this piece.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Jewelries</h1>
        <Link to="/admin/jewelries/new" className="admin-primary-action px-4 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black">
          Add jewelry
        </Link>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Image</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Weight</th>
              <th className="text-left px-4 py-3">Making charge</th>
              <th className="text-left px-4 py-3">Price</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-neutral-400" colSpan={8}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-4 py-6 text-neutral-400" colSpan={8}>No jewelries yet.</td></tr>
            ) : items.map((j) => (
              <tr key={j.id} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  {j.imageUrl ? (
                    <img src={j.imageUrl} alt={j.name} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-neutral-100" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{j.name}</td>
                <td className="px-4 py-3 capitalize">{j.category}</td>
                <td className="px-4 py-3">{j.silverWeightGrams} g</td>
                <td className="px-4 py-3">Rs {j.makingCharge.toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">Rs {j.price.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${j.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'}`}>
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link to={`/admin/jewelries/${j.id}/edit`} className="text-neutral-600 hover:text-neutral-900 underline">Edit</Link>
                    <button onClick={() => retire(j.id)} className="text-red-600 hover:text-red-800 underline">Retire</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
      </div>
    </div>
  );
}
