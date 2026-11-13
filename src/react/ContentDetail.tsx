"use client";

import { useState } from "react";
import { Link } from "./adapters.js";
import type { ContentItem } from "../index.js";
import { Lightbox } from "./Lightbox.js";
import { formatDate, isRecent } from "../index.js";
import { cn } from "./cn.js";
import { ContentText } from "./ContentText.js";
import {
  actionStyles,
  DownloadLink,
  FileBadge,
  FileIcon,
  FileTile,
  itemAttachments,
  kindLabel,
  NewBadge,
  OpenLink,
  PdfFrame,
  ShareActions,
  type Attachment,
} from "./AttachmentPreview.js";

/** Large, click-to-zoom image; becomes a download tile if the file is not actually an image. */
function ImageFrame({ attachment, alt, onOpen }: { attachment: Attachment; alt: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FileTile attachment={attachment} note="This file couldn’t be shown here. Open it or download it instead." />;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open full size: ${alt}`}
      className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border bg-muted-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {/* Remote CDN image: plain <img> (static export, unoptimized images). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={attachment.url} alt={alt} onError={() => setFailed(true)} className="mx-auto block h-auto max-h-[85dvh] w-auto max-w-full object-contain" />
      <span aria-hidden className="pointer-events-none absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-primary-ink/80 px-3 py-1.5 text-xs font-semibold text-on-primary opacity-90 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5M8 11h6M11 8v6" />
        </svg>
        Click to enlarge
      </span>
    </button>
  );
}

function AttachmentView({ attachment, title, onOpenImage }: { attachment: Attachment; title: string; onOpenImage: () => void }) {
  if (attachment.kind === "image") return <ImageFrame attachment={attachment} alt={`${title} — ${attachment.name}`} onOpen={onOpenImage} />;
  if (attachment.kind === "pdf") {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <PdfFrame attachment={attachment} title={`${title} — ${attachment.name}`} className="h-[80dvh] min-h-[28rem]" />
      </div>
    );
  }
  return <FileTile attachment={attachment} />;
}

/**
 * Single-record page (notice, event, application, …): the attached document itself is
 * shown inline — images large with a zoomable lightbox, PDFs embedded, other files as
 * download tiles — beside the date, description and actions (stacked on phones).
 */
export function ContentDetail({
  item,
  backHref,
  backLabel,
  freshDays,
}: {
  item: ContentItem;
  backHref: string;
  backLabel: string;
  /** Show a "New" badge when the record is at most this many days old. */
  freshDays?: number;
}) {
  const attachments = itemAttachments(item);
  const images = attachments.filter((a) => a.kind === "image");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const date = formatDate(item.date);
  const fresh = freshDays !== undefined && isRecent(item.date, freshDays);
  const primary = attachments[0];
  const meta = item.meta?.filter((m) => !/^\d{4}-\d{2}-\d{2}T/.test(m)) ?? [];
  const intro = Boolean(date || fresh || meta.length || (attachments.length > 0 && item.description));
  const external = item.href && !item.href.includes("/explore") && !attachments.some((a) => a.url === item.href) ? item.href : undefined;

  const openPrimary =
    primary?.kind === "image" ? (
      <button type="button" className={actionStyles.primary} onClick={() => setLightbox(images.indexOf(primary))}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4 shrink-0" aria-hidden>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
        Open full size
      </button>
    ) : primary ? (
      <OpenLink attachment={primary} className={actionStyles.primary}>
        {primary.kind === "pdf" ? "Open PDF" : "Open file"}
      </OpenLink>
    ) : null;

  return (
    <article className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)] lg:items-start lg:gap-10">
      {/* Preview column — the notice itself */}
      <div className="min-w-0 space-y-6 lg:order-1">
        {attachments.length ? (
          attachments.map((attachment, i) => (
            <figure key={attachment.url} id={`attachment-${i + 1}`} className="min-w-0 scroll-mt-28">
              <AttachmentView attachment={attachment} title={item.title} onOpenImage={() => setLightbox(images.indexOf(attachment))} />
              <figcaption className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-muted">
                <FileBadge attachment={attachment} />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  {attachments.length > 1 && <span className="font-semibold text-slate">{i + 1} of {attachments.length} · </span>}
                  {attachment.name}
                </span>
                {attachments.length > 1 && (
                  <span className="flex gap-1">
                    <OpenLink attachment={attachment} className={actionStyles.quiet}>Open</OpenLink>
                    <DownloadLink attachment={attachment} className={actionStyles.quiet} />
                  </span>
                )}
              </figcaption>
            </figure>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-white p-6 sm:p-8">
            <ContentText text={item.description || "No further details or attachments were published with this record."} className="text-base text-slate" />
          </div>
        )}
      </div>

      {/* Details column */}
      <aside className="min-w-0 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-28 lg:order-2" aria-label="Details">
        {(date || fresh) && (
          <div className="flex flex-wrap items-center gap-3">
            {date && (
              <p className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden>
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path d="M3.5 10h17M8 3v4M16 3v4" />
                  </svg>
                </span>
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-muted">Published</span>
                  <time dateTime={item.date} className="block text-lg font-semibold text-slate">{date}</time>
                </span>
              </p>
            )}
            {fresh && <NewBadge />}
          </div>
        )}

        {meta.length > 0 && (
          <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-muted">
            {meta.map((m) => <span key={m} className="min-w-0 [overflow-wrap:anywhere]">{m}</span>)}
          </p>
        )}
        {attachments.length > 0 && item.description && (
          <ContentText text={item.description} className="mt-4 text-[15px] text-slate" />
        )}

        {attachments.length > 0 && (
          <div className={intro ? "mt-5 border-t border-border pt-4" : undefined}>
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-muted">
              {attachments.length === 1 ? "Attachment" : `${attachments.length} attachments`}
            </h3>
            <ul className="mt-2 space-y-2">
              {attachments.map((a, i) => (
                <li key={a.url} className="relative flex min-w-0 items-center gap-3 rounded-md bg-muted-light/60 p-2.5 has-[a:hover]:bg-muted-light">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-primary">
                    <FileIcon kind={a.kind} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    {attachments.length > 1 ? (
                      <a href={`#attachment-${i + 1}`} className="block text-sm font-medium text-slate [overflow-wrap:anywhere] after:absolute after:inset-0 hover:text-primary">
                        {a.name}
                      </a>
                    ) : (
                      <span className="block text-sm font-medium text-slate [overflow-wrap:anywhere]">{a.name}</span>
                    )}
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-muted">
                      <FileBadge attachment={a} />
                      {kindLabel(a.kind)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2", (intro || attachments.length > 0) && "mt-5")}>
          {openPrimary && <div className="grid [&>*]:w-full">{openPrimary}</div>}
          {primary && (
            <DownloadLink attachment={primary} className={cn(actionStyles.secondary, "w-full")}>
              {attachments.length > 1 ? "Download first file" : "Download"}
            </DownloadLink>
          )}
          {external && (
            <a href={external} target="_blank" rel="noopener noreferrer" className={cn(actionStyles.primary, "w-full")}>
              Visit link <span aria-hidden>↗</span>
            </a>
          )}
          <ShareActions title={item.title} className={cn(actionStyles.secondary, "w-full")} />
        </div>
        <Link href={backHref} className={cn(actionStyles.quiet, "mt-3 w-full justify-start px-0 hover:bg-transparent hover:underline")}>
          <span aria-hidden>←</span> {backLabel}
        </Link>
      </aside>

      {lightbox !== null && lightbox >= 0 && (
        <Lightbox
          zoomable
          items={images.map((a) => ({ src: a.url, alt: `${item.title} — ${a.name}`, caption: a.name }))}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      )}
    </article>
  );
}
