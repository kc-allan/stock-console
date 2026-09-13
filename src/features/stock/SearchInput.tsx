import { useEffect, useId, useState } from 'react';

/** Long enough to skip most intermediate keystrokes, short enough to feel live. */
const DEBOUNCE_MS = 300;

type Props = {
  value: string;
  onCommit: (next: string) => void;
};

/**
 * The text being typed is local state; the committed query is URL state. They
 * are different things: the URL should describe a search the user has settled
 * on, not every keystroke on the way to it.
 *
 * Debouncing here reduces requests. It is not what prevents stale results from
 * being shown -- that is the query key in `queries.ts`.
 */
export function SearchInput({ value, onCommit }: Props) {
  const inputId = useId();
  const [draft, setDraft] = useState(value);
  const [lastCommitted, setLastCommitted] = useState(value);

  // The URL can change without anyone typing: the back button, or opening a
  // shared link. Re-sync the box when that happens.
  if (value !== lastCommitted) {
    setLastCommitted(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onCommit(draft), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, onCommit]);

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        Search stock
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Item name"
          className="h-control min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3"
        />
        {draft && (
          <button
            type="button"
            onClick={() => {
              setDraft('');
              onCommit('');
            }}
            className="h-control rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
