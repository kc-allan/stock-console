import type { ReactNode } from 'react';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl bg-out-soft p-4 text-center text-out">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 h-control rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-raised"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Mirrors the real row height so the page does not jump when results land. */
export function SkeletonRows({ count }: { count: number }) {
  return (
    <ul
      className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="h-16 animate-pulse bg-raised" />
      ))}
    </ul>
  );
}
