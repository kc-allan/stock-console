import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-600">That link does not point at anything in this console.</p>
      <Link to="/items" className="mt-4 inline-block text-brand-700 underline">
        Back to stock list
      </Link>
    </div>
  );
}
