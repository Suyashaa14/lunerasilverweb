interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-sm">
      <span className="text-neutral-500">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-neutral-50"
        >
          Previous
        </button>
        <span className="px-2 py-1.5 text-neutral-500">Page {page} of {totalPages}</span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-neutral-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
