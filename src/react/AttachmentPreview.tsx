"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "./adapters.js";
import type { ContentItem } from "../index.js";
import { useWebsitePage } from "./hooks.js";
import { fileBadge, fileDisplayName, fileExtension, fileKind, formatDate, type FileKind } from "../index.js";
import { cn } from "./cn.js";

/* ── Model ───────────────────────────────────────────────────────────────── */

export type Attachment = {
  url: string;
  /** Human-readable name (upload prefixes, underscores and extension removed). */
  name: string;
  kind: FileKind;
  /** Short type label: "PDF", "JPG", … */
  badge: string;
};

/** Every file of an item (attachments first, then its cover image), de-duplicated by URL. */
export function itemAttachments(item: ContentItem): Attachment[] {
  const sources: { url: string; label?: string; image?: boolean }[] = [
    ...(item.files ?? []).map((f) => ({ url: f.url, label: f.label === item.title ? undefined : f.label })),
    ...(item.image ? [{ url: item.image, image: true }] : []),
  ];
  const seen = new Set<string>();
  const unique = sources.filter((s) => s.url && !seen.has(s.url) && seen.add(s.url));
  return unique.map((s, i) => {
    const detected = fileKind(s.url, s.label);
    // Cover images may use opaque, extensionless CDN keys.
    const kind = s.image && detected === "file" ? "image" : detected;
    const fallback = unique.length > 1 ? `${item.title} (${i + 1})` : item.title;
    return { url: s.url, name: fileDisplayName(s.label, s.url, fallback), kind, badge: kind === "image" && !fileExtension(s.url) && !fileExtension(s.label) ? "Image" : fileBadge(s.url, s.label) };
  });
}

export const isPreviewable = (a: Attachment) => a.kind === "image" || a.kind === "pdf";

const kindLabels: Record<FileKind, string> = {
  image: "Image", pdf: "PDF document", doc: "Document", sheet: "Spreadsheet", slides: "Presentation",
  archive: "Archive", video: "Video", audio: "Audio", file: "File",
};
export const kindLabel = (kind: FileKind) => kindLabels[kind];

/** `/explore?module=announcement&id=…` → the record behind a list row. */
function exploreTarget(href?: string): { module: string; id: string } | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href, "https://college.invalid");
    if (url.origin !== "https://college.invalid" || !url.pathname.replace(/\/$/, "").endsWith("/explore")) return undefined;
    const name = url.searchParams.get("module");
    const id = url.searchParams.get("id");
    return name && id ? { module: name, id } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * List endpoints (e.g. notices) omit attachments; when `enabled`, the item's detail
 * record is read once and its files/image are merged in. Shares the detail page's query key.
 */
export function useItemWithAttachments(item: ContentItem, enabled: boolean) {
  const target = enabled && !item.files?.length && !item.image ? exploreTarget(item.href) : undefined;
  const query = useWebsitePage(target?.module ?? "", target ? { id: target.id } : {}, { skip: !target });
  const detail = query.data?.items.find((d) => d.id === item.id) ?? (query.data?.items.length === 1 ? query.data.items[0] : undefined);
  const merged: ContentItem = detail ? { ...item, image: item.image ?? detail.image, files: item.files ?? detail.files } : item;
  return { item: merged, loading: Boolean(target) && query.status !== "success" && query.status !== "error" };
}

/* ── Icons & badges ──────────────────────────────────────────────────────── */

export function FileIcon({ kind, className }: { kind: FileKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {kind === "image" ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M21 16l-5-5-9 9" />
        </>
      ) : (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          {kind === "pdf" ? <path d="M8.5 13h7M8.5 16.5h5" /> : <path d="M9 13h6M9 16.5h6" />}
        </>
      )}
    </svg>
  );
}

export function FileBadge({ attachment, className }: { attachment: Attachment; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.08em]",
        attachment.kind === "pdf" ? "bg-error/10 text-error" : attachment.kind === "image" ? "bg-primary/10 text-primary-dark" : "bg-muted-light text-slate",
        className,
      )}
    >
      <span className="sr-only">File type: </span>
      {attachment.badge}
    </span>
  );
}

export function NewBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-on-accent", className)}>
      New
    </span>
  );
}

/* ── Actions ─────────────────────────────────────────────────────────────── */

function downloadName(attachment: Attachment) {
  const ext = fileExtension(attachment.url);
  const base = attachment.name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "attachment";
  return ext ? `${base}.${ext}` : base;
}

/** Saves the file under its readable name; falls back to opening it when the CDN refuses a CORS read. */
async function saveAttachment(attachment: Attachment) {
  try {
    const response = await fetch(attachment.url, { mode: "cors" });
    if (!response.ok) throw new Error(String(response.status));
    const href = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = href;
    link.download = downloadName(attachment);
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 30_000);
  } catch {
    window.open(attachment.url, "_blank", "noopener,noreferrer");
  }
}

const actionBase =
  "inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
export const actionStyles = {
  primary: cn(actionBase, "bg-primary text-on-primary hover:bg-primary-dark"),
  secondary: cn(actionBase, "border border-primary/40 bg-white text-primary-dark hover:border-primary hover:bg-muted-light"),
  quiet: cn(actionBase, "px-3 text-primary-dark hover:bg-muted-light"),
};

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
      <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" />
    </svg>
  );
}

export function ExternalGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function DownloadLink({ attachment, className, children = "Download" }: { attachment: Attachment; className?: string; children?: React.ReactNode }) {
  return (
    <a
      href={attachment.url}
      download={downloadName(attachment)}
      className={className ?? actionStyles.secondary}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        void saveAttachment(attachment);
      }}
    >
      <DownloadGlyph />
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </a>
  );
}

export function OpenLink({ attachment, className, children }: { attachment: Attachment; className?: string; children?: React.ReactNode }) {
  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer" className={className ?? actionStyles.secondary}>
      <ExternalGlyph />
      <span className="min-w-0 [overflow-wrap:anywhere]">{children ?? (attachment.kind === "pdf" ? "Open PDF" : "Open full size")}</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

const noop = () => () => {};
const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

/** Native share sheet where available (phones), plus copy-link everywhere. */
export function ShareActions({ title, url, className }: { title: string; url?: string; className?: string }) {
  const shareable = useSyncExternalStore(noop, canShare, () => false);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const link = () => (url ? new URL(url, window.location.href).toString() : window.location.href);
  return (
    <>
      {shareable && (
        <button
          type="button"
          className={className ?? actionStyles.secondary}
          onClick={() => navigator.share({ title, url: link() }).catch(() => undefined)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
            <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" />
            <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
          </svg>
          Share
        </button>
      )}
      <button
        type="button"
        className={className ?? actionStyles.secondary}
        onClick={() => {
          const done = (state: "copied" | "failed") => {
            setCopied(state);
            window.setTimeout(() => setCopied("idle"), 2500);
          };
          if (navigator.clipboard) navigator.clipboard.writeText(link()).then(() => done("copied"), () => done("failed"));
          else done("failed");
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
          {copied === "copied" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />}
        </svg>
        <span aria-live="polite">{copied === "copied" ? "Link copied" : copied === "failed" ? "Copy failed" : "Copy link"}</span>
      </button>
    </>
  );
}

/* ── Thumbnails ──────────────────────────────────────────────────────────── */

/** Card thumbnail: the first image, else a file-type tile. */
export function AttachmentThumb({ attachments, className, compact, onFail }: { attachments: Attachment[]; className?: string; compact?: boolean; onFail?: () => void }) {
  const image = attachments.find((a) => a.kind === "image");
  const [failed, setFailed] = useState("");
  if (image && failed !== image.url) {
    return (
      // Remote CDN images: plain <img> (static export, unoptimized images).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => {
          setFailed(image.url);
          onFail?.();
        }}
        className={cn("bg-muted-light object-cover object-top", className)}
      />
    );
  }
  const first = attachments.find((a) => a.kind !== "image") ?? attachments[0];
  if (!first) return null;
  return (
    <span aria-hidden className={cn("flex flex-col items-center justify-center gap-1.5 bg-muted-light text-primary", className)}>
      <FileIcon kind={first.kind} className={compact ? "h-5 w-5" : "h-10 w-10"} />
      {!compact && <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-dark">{first.badge}</span>}
      {compact && <span className="text-[9px] font-bold uppercase leading-none">{first.badge}</span>}
    </span>
  );
}

/** Calendar-style tile for records without any media, keeping list rows aligned. */
export function DateTile({ date, className, compact }: { date?: string; className?: string; compact?: boolean }) {
  const d = date ? new Date(date) : undefined;
  const valid = d && !Number.isNaN(d.getTime());
  return (
    <span aria-hidden className={cn("flex flex-col items-center justify-center bg-muted-light text-primary-dark", className)}>
      {valid ? (
        <>
          <span className={cn("font-display font-semibold leading-none", compact ? "text-2xl" : "text-4xl")}>{d.getDate()}</span>
          <span className={cn("mt-1 font-bold uppercase text-slate-muted", compact ? "text-[9px] tracking-[0.08em]" : "text-[11px] tracking-[0.16em]")}>
            {d.toLocaleDateString("en-IN", compact ? { month: "short" } : { month: "short", year: "numeric" })}
          </span>
        </>
      ) : (
        <FileIcon kind="doc" className={cn("text-primary", compact ? "h-6 w-6" : "h-10 w-10")} />
      )}
    </span>
  );
}

/* ── Inline viewers ──────────────────────────────────────────────────────── */

/**
 * Embedded PDF from the `sm` breakpoint up. Phones (whose browsers mostly cannot show a PDF
 * inline, or show only its first page) get an "Open PDF" tile instead; desktop browsers
 * without a PDF viewer fall back to the same tile through <object>'s fallback content.
 */
export function PdfFrame({ attachment, title, className }: { attachment: Attachment; title: string; className?: string }) {
  const tile = (note: string, extra?: string) => <FileTile attachment={attachment} note={note} className={extra} />;
  return (
    <>
      <div className="sm:hidden">{tile("Open the PDF to read it full screen, or download it.", "border-0")}</div>
      <object data={`${attachment.url}#view=FitH`} type="application/pdf" aria-label={title} className={cn("hidden w-full bg-white sm:block", className)}>
        {tile("This browser can’t show the PDF here. Open it or download it instead.", "h-full")}
      </object>
    </>
  );
}

/** Download tile for files that cannot be displayed inline. */
export function FileTile({ attachment, note, className }: { attachment: Attachment; note?: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted-light/60 p-6 text-center sm:p-10", className)}>
      <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
        <FileIcon kind={attachment.kind} className="h-9 w-9" />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center justify-center gap-2 font-semibold text-slate [overflow-wrap:anywhere]">
          <FileBadge attachment={attachment} />
          {attachment.name}
        </p>
        <p className="mt-1 text-sm text-slate-muted">{note ?? `${kindLabel(attachment.kind)} — download to view.`}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <OpenLink attachment={attachment}>{attachment.kind === "pdf" ? "Open PDF" : "Open"}</OpenLink>
        <DownloadLink attachment={attachment} className={actionStyles.primary} />
      </div>
    </div>
  );
}

/* ── Quick preview dialog ────────────────────────────────────────────────── */

/**
 * Native modal <dialog>: the page behind is inert, Tab stays inside, Esc / backdrop /
 * close button dismiss it, and focus returns to the control that opened it.
 */
export function PreviewDialog({
  title,
  date,
  attachments,
  detailsHref,
  onClose,
  returnFocusRef,
}: {
  title: string;
  date?: string;
  attachments: Attachment[];
  detailsHref?: string;
  onClose: () => void;
  /** Control to focus after closing (Safari does not focus buttons on click, so activeElement is unreliable). */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [index, setIndex] = useState(() => Math.max(0, attachments.findIndex(isPreviewable)));
  const current = attachments[index];
  const formatted = formatDate(date);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!openerRef.current) openerRef.current = returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      const opener = openerRef.current;
      if (opener?.isConnected) window.setTimeout(() => opener.focus(), 0);
    };
  }, [returnFocusRef]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button, a[href], object, [tabindex]:not([tabindex="-1"])'))
          .filter((control) => control.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close();
      }}
      className="fixed inset-0 m-auto h-fit max-h-[94dvh] w-[min(68rem,calc(100vw-1rem))] max-w-none overflow-hidden rounded-xl border border-border bg-white p-0 text-slate shadow-2xl backdrop:bg-primary-ink/75 backdrop:backdrop-blur-sm open:flex open:flex-col sm:w-[min(68rem,calc(100vw-3rem))]"
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1">
          {formatted && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <time dateTime={date}>{formatted}</time>
            </p>
          )}
          <h2 id={titleId} className="mt-0.5 line-clamp-2 font-semibold text-slate [overflow-wrap:anywhere] sm:text-lg">
            {title}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close preview"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate hover:bg-muted-light focus-visible:outline-2 focus-visible:outline-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {attachments.length > 1 && (
        <div role="group" aria-label="Attachments" className="flex shrink-0 gap-2 overflow-x-auto border-b border-border px-4 py-2 sm:px-6">
          {attachments.map((a, i) => (
            <button
              key={a.url}
              type="button"
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium",
                i === index ? "border-primary bg-primary/5 text-primary-dark" : "border-border text-slate-muted hover:border-primary/50",
              )}
            >
              <FileBadge attachment={a} />
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto bg-muted-light/60">
        {current?.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={current.url} src={current.url} alt={`${title} — ${current.name}`} className="mx-auto block h-auto max-h-[68dvh] w-auto max-w-full object-contain p-2 sm:p-4" />
        ) : current?.kind === "pdf" ? (
          <PdfFrame key={current.url} attachment={current} title={`${title} — PDF`} className="h-[68dvh]" />
        ) : current ? (
          <FileTile attachment={current} className="m-4 border-solid bg-white" />
        ) : (
          <p className="p-6 text-sm text-slate-muted">No attachment to preview.</p>
        )}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-6">
        {current && (
          <p className="me-auto flex min-w-0 basis-full items-center gap-2 text-sm text-slate-muted sm:basis-auto">
            <FileBadge attachment={current} />
            <span className="min-w-0 truncate">{current.name}</span>
          </p>
        )}
        {current && <OpenLink attachment={current} />}
        {current && <DownloadLink attachment={current} />}
        {detailsHref && (
          <Link href={detailsHref} className={actionStyles.primary}>
            View details <span aria-hidden>→</span>
          </Link>
        )}
      </footer>
    </dialog>
  );
}

/** Eye icon used by "Preview" triggers. */
export function PreviewGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
