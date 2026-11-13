"use client";

import { errorMessage } from "../index.js";
import { Button } from "./Button.js";
import { useCollegeUI } from "./adapters.js";

/** Loading skeleton in the Gosavi card style (HPTRYK QLoader equivalent). */
export function LiveLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">
      <span className="sr-only">Loading latest information…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-shimmer h-28 rounded-lg border border-border-tint shadow-elev-1" />
      ))}
    </div>
  );
}

/** A failed request — kept visually distinct from an empty result. */
export function LiveError({ error, onRetry, title = "Couldn’t load the latest information." }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex min-w-0 gap-3 rounded-lg border border-error-border border-s-4 border-s-error bg-error-bg p-4 text-sm text-slate shadow-elev-1 [overflow-wrap:anywhere] sm:p-5">
      <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-error text-xs font-bold text-white">
        !
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-error-fg">{title}</p>
        <p className="mt-1 text-slate-muted">{errorMessage(error)}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-11 rounded-md border border-primary bg-surface px-4 text-sm font-semibold text-primary-dark shadow-elev-1 transition-[background-color,box-shadow] hover:bg-surface-tint hover:shadow-elev-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function LiveEmpty({ children = "The college has not published information in this section yet.", actions = false }: { children?: React.ReactNode; actions?: boolean }) {
  const { contactPath } = useCollegeUI();
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-dashed border-border-strong bg-surface-tint p-4 text-sm text-slate-muted [overflow-wrap:anywhere] sm:p-5">
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-tint text-secondary ring-1 ring-info-border">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      </span>
      <div className="min-w-0 pt-1">
        <p>{children}</p>
        {actions && <>
          <p className="mt-2">For current information, please contact the college office.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={contactPath} variant="secondary">Contact the office</Button>
            <Button href="/" variant="ghost">Back to home</Button>
          </div>
        </>}
      </div>
    </div>
  );
}
