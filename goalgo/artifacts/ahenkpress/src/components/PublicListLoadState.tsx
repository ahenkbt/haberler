import type { ReactNode } from "react";

/** Vitrin liste sayfaları — boş ekran yerine iskelet / hata / yeniden dene. */
export function PublicListLoadState({
  loading,
  error,
  onRetry,
  skeleton,
  empty,
  children,
}: {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  skeleton?: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <>
        {skeleton ?? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}
      </>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center" role="alert">
        <p className="text-sm font-semibold text-red-800">Veri yüklenemedi</p>
        <p className="mt-1 text-xs text-red-700">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            Tekrar dene
          </button>
        ) : null}
      </div>
    );
  }

  if (empty) return <>{empty}</>;

  return <>{children}</>;
}
