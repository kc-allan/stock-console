import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">That link does not point at anything in this console.</p>
      <Link
        to="/items"
        className="mt-4 inline-flex h-control items-center font-medium text-ink underline underline-offset-4"
      >
        Back to stock list
      </Link>
    </div>
  );
}
