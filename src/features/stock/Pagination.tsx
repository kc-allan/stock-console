type Props = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageCount, onPageChange }: Props) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Stock list pages" className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="h-control rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-raised disabled:opacity-40"
      >
        Previous
      </button>
      <p className="text-sm text-muted">
        Page {page} of {pageCount}
      </p>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        className="h-control rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-raised disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
