import { useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '../../components/Spinner';
import { ApiError } from '../../lib/errors';
import { updateStock } from './api';
import { stockKeys } from './queries';
import type { ProductDetail, ProductListResponse } from './schemas';

export function StockCorrectionForm({ product }: { product: ProductDetail }) {
  const inputId = useId();
  const messageId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(String(product.stock));
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (stock: number) => updateStock(product.id, stock),
    onSuccess: (updated) => {
      // Write the server's response straight into the cache instead of
      // invalidating. DummyJSON accepts the PUT but does not persist it, so a
      // refetch would return the old count and visibly undo the user's save.
      queryClient.setQueryData(stockKeys.detail(String(product.id)), updated);

      // Keep any list page already in cache agreeing with the detail view,
      // otherwise going back shows the old number.
      queryClient.setQueriesData<ProductListResponse>({ queryKey: stockKeys.lists }, (page) => {
        if (!page?.products.some((item) => item.id === updated.id)) return page;
        return {
          ...page,
          products: page.products.map((item) =>
            item.id === updated.id ? { ...item, stock: updated.stock } : item,
          ),
        };
      });
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    const parsed = Number(value);
    if (value.trim() === '' || !Number.isInteger(parsed) || parsed < 0) {
      setValidationError('Enter the counted quantity as a whole number, 0 or more.');
      inputRef.current?.focus();
      return;
    }
    if (parsed === product.stock) {
      setValidationError('That is already the recorded count.');
      inputRef.current?.focus();
      return;
    }

    mutation.mutate(parsed);
  }

  const errorMessage =
    validationError ??
    (mutation.isError
      ? mutation.error instanceof ApiError
        ? mutation.error.message
        : 'Could not save the new count. Check your connection and try again.'
      : null);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          Corrected stock count
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setValidationError(null);
          }}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? messageId : undefined}
          className="h-control w-40 rounded-md border border-slate-300 bg-white px-3 tabular-nums"
        />
      </div>

      <div>
        <button
          type="submit"
          // Disabled only while in flight, which is what stops a double submit.
          // Validation is reported rather than silently disabling the button.
          disabled={mutation.isPending}
          className="h-control rounded-md bg-brand-600 px-4 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {mutation.isPending ? <Spinner label="Saving" /> : 'Save new count'}
        </button>
      </div>

      {errorMessage && (
        <p
          id={messageId}
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMessage}
        </p>
      )}

      {mutation.isSuccess && !errorMessage && (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900"
        >
          Saved. Stock is now {mutation.data.stock}. The demo API accepts the change but does not
          store it, so a hard reload will show the original count.
        </p>
      )}
    </form>
  );
}
