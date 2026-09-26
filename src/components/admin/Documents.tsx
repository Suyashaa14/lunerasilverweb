import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiGet, apiUpload } from '../../api/client';
import { BUTTON } from './ui';
import { shortDate } from './format';

interface Doc {
  id: number;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

/**
 * The evidence behind a row: the supplier's bill, the receipt for the rent.
 *
 * Attached in the same call that uploads it, so a receipt cannot end up stored
 * but linked to nothing — which is the same as not having it when someone asks.
 */
export function Documents({
  referenceType,
  referenceId,
  documentType,
  label = 'Receipt',
}: {
  referenceType: string;
  referenceId: number;
  documentType: string;
  label?: string;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    apiGet(`/documents?referenceType=${referenceType}&referenceId=${referenceId}`)
      .then(setDocs)
      .catch(() => setDocs([]));
  }, [referenceType, referenceId]);

  useEffect(load, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('documentType', documentType);
      form.append('referenceType', referenceType);
      form.append('referenceId', String(referenceId));
      await apiUpload('/documents', 'POST', form);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload that file.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      {docs.length > 0 && (
        <ul className="space-y-2 mb-3">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-neutral-800 underline underline-offset-2 truncate">
                {d.fileName}
              </a>
              <span className="text-xs text-neutral-400 shrink-0">
                {Math.round(d.fileSize / 1024)} KB · {shortDate(d.uploadedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-700 mb-2">{error}</p>}

      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className={BUTTON.secondary}>
        {busy ? 'Uploading…' : docs.length === 0 ? `Attach ${label.toLowerCase()}` : 'Attach another'}
      </button>

      {docs.length === 0 && (
        <p className="text-xs text-neutral-400 mt-2">
          A photo of the paper is enough. Kept so you can produce it if anyone asks.
        </p>
      )}
    </div>
  );
}
