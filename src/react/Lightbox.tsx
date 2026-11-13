"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "./adapters.js";

export type LightboxItem = {
  src: string;
  alt: string;
  caption?: string;
  category?: string;
};

type LightboxProps = {
  items: readonly LightboxItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** Adds a zoom toggle (button, double-click, +/- keys) for reading dense notices and posters. */
  zoomable?: boolean;
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

/**
 * Full-screen viewer shared by every photo grid on the site.
 * Blurred primary backdrop, zoom-in entrance, prev/next navigation,
 * keyboard support (Esc / ← / →, Tab stays inside), body scroll lock while open,
 * and focus returns to the opener on close.
 */
export function Lightbox({ items, index, onClose, onIndexChange, zoomable = false }: LightboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ src: string; on: boolean }>({ src: "", on: false });
  const item = items[index];
  const hasMany = items.length > 1;
  // Zoom belongs to one image; moving to another always starts fitted.
  const zoomed = zoomable && zoom.on && zoom.src === item?.src;
  const toggleZoom = useCallback(() => {
    if (item) setZoom((z) => ({ src: item.src, on: !(z.on && z.src === item.src) }));
  }, [item]);

  useEffect(() => {
    // Start a zoomed view at the top centre, where notices and posters put their headline.
    const viewport = viewportRef.current;
    if (zoomed && viewport) viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
  }, [zoomed]);

  const goTo = useCallback(
    (step: number) => {
      onIndexChange((index + step + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (hasMany && e.key === "ArrowLeft") goTo(-1);
      if (hasMany && e.key === "ArrowRight") goTo(1);
      if (zoomable && (e.key === "+" || e.key === "=" || e.key === "-")) {
        if ((e.key === "-") === zoomed) toggleZoom();
      }
      if (e.key === "Tab" && rootRef.current) {
        // Keep keyboard focus inside the modal viewer.
        const focusable = [...rootRef.current.querySelectorAll<HTMLElement>("button, a[href]")];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && (document.activeElement === first || !rootRef.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, hasMany, onClose, zoomable, zoomed, toggleZoom]);

  if (!item) return null;

  return (
    <div
      ref={rootRef}
      className="lightbox-backdrop fixed inset-0 z-50 flex h-dvh flex-col items-center justify-center overflow-y-auto bg-primary-ink/90 px-4 py-16 backdrop-blur-md sm:px-8 sm:py-20"
      role="dialog"
      aria-modal="true"
      aria-label={item.caption ?? item.alt}
      onClick={onClose}
    >
      <div
        key={item.src}
        className="lightbox-panel relative flex min-h-0 max-h-full w-full max-w-5xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={viewportRef}
          className={
            zoomed
              ? "h-[62dvh] min-h-0 w-full cursor-zoom-out overflow-auto overscroll-contain rounded-md sm:h-[70dvh]"
              : `relative h-[62dvh] min-h-0 w-full sm:h-[70dvh]${zoomable ? " cursor-zoom-in" : ""}`
          }
          onDoubleClick={zoomable ? toggleZoom : undefined}
        >
          <div className={zoomed ? "relative h-[220%] w-[220%]" : "relative h-full w-full"}>
            <Image
              src={item.src}
              alt={item.alt}
              fill
              className="object-contain drop-shadow-2xl"
              sizes={zoomed ? "220vw" : "100vw"}
              loading="eager"
            />
          </div>
        </div>

        <div className="mt-3 flex max-h-[25dvh] shrink-0 items-start justify-between gap-4 overflow-y-auto text-on-primary">
          <div className="min-w-0">
            <p className="font-medium [overflow-wrap:anywhere]">{item.caption ?? item.alt}</p>
            {item.category ? (
              <p className="text-[11px] uppercase tracking-[0.18em] text-on-primary-muted">
                {item.category}
              </p>
            ) : null}
          </div>
          {hasMany ? (
            <p className="shrink-0 text-sm tabular-nums text-on-primary-muted" aria-live="polite">
              {index + 1} <span className="opacity-60">/ {items.length}</span>
            </p>
          ) : null}
        </div>
      </div>

      {zoomable ? (
        <button
          type="button"
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
          aria-pressed={zoomed}
          className="absolute right-16 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-on-primary backdrop-blur transition hover:bg-white/25 active:scale-95 sm:right-[4.5rem] sm:top-6"
          onClick={(e) => {
            e.stopPropagation();
            toggleZoom();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5M8 11h6" />
            {zoomed ? null : <path d="M11 8v6" />}
          </svg>
        </button>
      ) : null}

      <button
        ref={closeRef}
        type="button"
        aria-label="Close viewer"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-on-primary backdrop-blur transition hover:bg-white/25 active:scale-95 sm:right-6 sm:top-6"
        onClick={onClose}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {hasMany ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-on-primary backdrop-blur transition hover:bg-white/25 active:scale-95 sm:left-6"
            onClick={(e) => {
              e.stopPropagation();
              goTo(-1);
            }}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-on-primary backdrop-blur transition hover:bg-white/25 active:scale-95 sm:right-6"
            onClick={(e) => {
              e.stopPropagation();
              goTo(1);
            }}
          >
            <Chevron direction="right" />
          </button>
        </>
      ) : null}
    </div>
  );
}
