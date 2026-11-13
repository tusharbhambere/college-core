"use client";

import { useRef, useState } from "react";
import { Link, useLocalHref } from "./adapters.js";
import { Image } from "./adapters.js";
import type { ContentItem } from "../index.js";
import { formatDate, isRecent } from "../index.js";
import { cn } from "./cn.js";
import { ContentText } from "./ContentText.js";
import {
  actionStyles,
  AttachmentThumb,
  DateTile,
  DownloadLink,
  FileBadge,
  isPreviewable,
  itemAttachments,
  NewBadge,
  PreviewDialog,
  PreviewGlyph,
  useItemWithAttachments,
} from "./AttachmentPreview.js";

function ItemLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const target = useLocalHref()(href)!;
  if (target.startsWith("/")) {
    return (
      <Link href={target} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={target} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** Renders normalized API content as text in Gosavi card styling. Never trusts backend HTML. */
const isoTimestamp = /^\d{4}-\d{2}-\d{2}T/;

type CardOptions = {
  /** Media-forward list rows: attachment thumbnail, file-type badges and a quick-preview dialog. */
  preview?: boolean;
  /** "New" badge for records at most this many days old (omit for dated-in-future content such as events). */
  freshDays?: number;
  /** List endpoints that omit attachments (notices): read each row's detail record for its files. */
  loadDetails?: boolean;
};

export function ContentList({
  items,
  layout = "grid",
  className,
  ...options
}: {
  items: ContentItem[];
  /** "people": compact avatar rows for staff directories. */
  layout?: "grid" | "list" | "people";
  className?: string;
} & CardOptions) {
  if (layout === "people") {
    return (
      <ul className={cn("grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <PersonCard item={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul
      className={cn(
        layout === "grid" ? "grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "min-w-0 space-y-4",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <ContentCard item={item} horizontal={layout === "list"} {...options} />
        </li>
      ))}
    </ul>
  );
}

function PersonCard({ item }: { item: ContentItem }) {
  const meta = item.meta?.filter((m) => !isoTimestamp.test(m)).slice(0, 2) ?? [];
  const body = (
    <>
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-full bg-muted-light object-cover" />
      ) : (
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted-light font-semibold text-primary">
          {item.title.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "").charAt(0)}
        </span>
      )}
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className="block font-semibold text-slate group-hover:text-primary">{item.title}</span>
        {meta.map((m) => (
          <span key={m} className="mt-0.5 block text-xs text-slate-muted">{m}</span>
        ))}
      </span>
    </>
  );
  const classes = "group flex h-full min-w-0 items-start gap-3 rounded-lg border border-border bg-white p-3 transition-colors hover:border-primary/50";
  return item.href ? (
    <ItemLink href={item.href} className={classes}>{body}</ItemLink>
  ) : (
    <div className={classes}>{body}</div>
  );
}

export function ContentCard({
  item: listed,
  horizontal,
  preview,
  freshDays,
  loadDetails,
}: {
  item: ContentItem;
  horizontal?: boolean;
} & CardOptions) {
  const localHref = useLocalHref();
  const { item, loading } = useItemWithAttachments(listed, Boolean(preview && loadDetails));
  const [previewing, setPreviewing] = useState(false);
  const previewButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openPreview = (trigger: HTMLElement | null) => {
    opener.current = trigger;
    setPreviewing(true);
  };
  const date = formatDate(item.date);
  const meta = item.meta?.filter((m) => !isoTimestamp.test(m)) ?? [];
  const attachments = itemAttachments(item);
  const files = attachments.filter((a) => item.files?.some((f) => f.url === a.url));
  const previewable = attachments.some(isPreviewable);
  const fresh = freshDays !== undefined && isRecent(item.date, freshDays);
  const detailsHref = item.href && !item.files?.some((f) => f.url === item.href) ? item.href : undefined;
  // Media-forward cards: rows with a photo get a wide thumbnail; documents and dated records get a
  // small file-type or date tile instead of a large grey panel that only holds an icon.
  const media = preview && horizontal;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !media && item.image && !imageFailed;
  const photo = media && !loading && attachments.some((a) => a.kind === "image") && !imageFailed;

  // Thumbnails fill the row instead of sizing it, so every row keeps its text height.
  const fill = "absolute inset-0 h-full w-full";
  const tile = "h-16 w-16 rounded-lg ring-1 ring-border sm:h-[4.5rem] sm:w-[4.5rem]";
  const thumb = media ? (
    loading ? (
      <span aria-hidden className={cn(tile, "animate-pulse bg-muted-light")} />
    ) : photo ? (
      <AttachmentThumb attachments={attachments.filter((a) => a.kind === "image")} className={fill} onFail={() => setImageFailed(true)} />
    ) : attachments.length ? (
      <AttachmentThumb attachments={attachments.filter((a) => a.kind !== "image")} compact className={tile} />
    ) : (
      <DateTile date={item.date} compact className={tile} />
    )
  ) : null;
  const thumbFrame = photo
    ? "relative block aspect-[16/10] w-full min-w-0 overflow-hidden border-b border-border bg-muted-light sm:aspect-auto sm:h-full sm:min-h-44 sm:border-e sm:border-b-0"
    : "relative hidden min-w-0 justify-center pt-5 sm:flex";

  return (
    <article
      className={cn(
        "glow-card group relative h-full min-w-0 overflow-hidden rounded-lg border border-border bg-white transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary-deep/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
        horizontal && (showImage || media) && "sm:grid sm:grid-cols-[180px_minmax(0,1fr)]",
        media && (photo ? "sm:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]" : "sm:grid-cols-[6.5rem_minmax(0,1fr)]"),
      )}
    >
      {showImage && (
        // Remote CDN images: plain <img> (static export, unoptimized images).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className={cn("w-full bg-muted-light object-cover", horizontal ? "aspect-[16/10] sm:h-full sm:max-h-56 sm:aspect-auto" : "aspect-[16/10]")}
        />
      )}
      {thumb &&
        (previewable ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => openPreview(previewButton.current)}
            className={cn(thumbFrame, "z-10 cursor-zoom-in", !photo && "items-start")}
          >
            {thumb}
            {photo && <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-primary-ink/75 py-1.5 text-xs font-semibold text-on-primary opacity-0 transition-opacity group-hover:opacity-100">
              <PreviewGlyph className="h-3.5 w-3.5" /> Quick preview
            </span>}
          </button>
        ) : (
          <div className={thumbFrame}>{thumb}</div>
        ))}
      <div className="min-w-0 p-4 [overflow-wrap:anywhere] sm:p-5">
        {(date || meta.length > 0 || fresh || (media && attachments.length > 0)) && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {fresh && <NewBadge />}
            {date && <time dateTime={item.date}>{date}</time>}
            {media && attachments.length > 0 && (
              <span className="flex flex-wrap gap-1 tracking-normal">
                {[...new Map(attachments.map((a) => [a.badge, a])).values()].map((a) => (
                  <FileBadge key={a.badge} attachment={a} />
                ))}
                {attachments.length > 1 && (
                  <span className="text-[11px] font-medium normal-case text-slate-muted">{attachments.length} files</span>
                )}
              </span>
            )}
            {meta.slice(0, 3).map((m) => (
              <span key={m} className="min-w-0 normal-case tracking-normal text-slate-muted">
                {m}
              </span>
            ))}
          </p>
        )}
        <h3 className="mt-1 text-base font-semibold text-slate">
          {item.href ? (
            <ItemLink href={item.href} className={cn("hover:text-primary", !item.children?.length && "after:absolute after:inset-0 after:rounded-lg")}>
              {item.title}
            </ItemLink>
          ) : (
            item.title
          )}
        </h3>
        {item.description && (
          <ContentText text={item.description} linkUrls={!item.href} className={cn("mt-2", item.href && (media ? "line-clamp-3" : "line-clamp-4"))} />
        )}
        {media ? (
          (previewable || detailsHref || (attachments.length > 0 && !previewable)) && (
            <div className="relative z-10 mt-4 flex flex-wrap gap-2">
              {previewable && (
                <button ref={previewButton} type="button" onClick={(e) => openPreview(e.currentTarget)} className={actionStyles.secondary}>
                  <PreviewGlyph /> Preview
                  <span className="sr-only">: {item.title}</span>
                </button>
              )}
              {!previewable && attachments[0] && (
                <DownloadLink attachment={attachments[0]}>
                  Download {attachments[0].badge}
                </DownloadLink>
              )}
              {detailsHref && (
                <ItemLink href={detailsHref} className={actionStyles.quiet}>
                  View details <span aria-hidden>→</span>
                  <span className="sr-only">: {item.title}</span>
                </ItemLink>
              )}
            </div>
          )
        ) : (
          (files.length > 0 || item.href) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
              {files.map((file) => (
                <span key={file.url} className="inline-flex min-w-0 items-center gap-1.5">
                  {file.badge !== "File" && <FileBadge attachment={file} />}
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="relative z-10 inline-flex min-h-11 min-w-0 items-center text-accent-foreground hover:underline">
                    {files.length === 1 && file.name === item.title ? "Open attachment" : file.name} <span aria-hidden>↗</span>
                  </a>
                  {isPreviewable(file) && (
                    <button
                      type="button"
                      onClick={(e) => openPreview(e.currentTarget)}
                      className="relative z-10 inline-flex min-h-11 items-center gap-1 rounded px-1.5 text-xs font-semibold text-primary hover:bg-muted-light"
                    >
                      <PreviewGlyph className="h-3.5 w-3.5" /> Preview<span className="sr-only">: {file.name}</span>
                    </button>
                  )}
                </span>
              ))}
              {detailsHref && (item.children?.length ? (
                <ItemLink href={detailsHref} className="relative z-10 inline-flex min-h-11 items-center text-primary hover:underline">View details <span aria-hidden>→</span><span className="sr-only">: {item.title}</span></ItemLink>
              ) : <span aria-hidden className="inline-flex min-h-11 items-center gap-1 text-primary">View details <span>→</span></span>)}
            </div>
          )
        )}
        {item.children && item.children.length > 0 && <NestedContent items={item.children} />}
      </div>
      {previewing && (
        <PreviewDialog
          title={item.title}
          date={item.date}
          attachments={media ? attachments : files.length ? files : attachments}
          detailsHref={detailsHref && localHref(detailsHref)?.startsWith("/") ? localHref(detailsHref) : undefined}
          onClose={() => setPreviewing(false)}
          returnFocusRef={opener}
        />
      )}
    </article>
  );
}

/** CMS document trees can be many levels deep; every leaf remains reachable. */
function NestedContent({ items }: { items: ContentItem[] }) {
  return <ul className="mt-3 min-w-0 space-y-3 border-s border-border ps-3 text-sm sm:ps-4">
    {items.map(item => <li key={item.id} className="min-w-0 [overflow-wrap:anywhere]">
      {item.children?.length ? <details>
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">{item.title}</summary>
        {item.description && <ContentText text={item.description} />}
        {item.meta?.length ? <p className="my-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-muted">{item.meta.map(m => <span key={m}>{m}</span>)}</p> : null}
        {item.image && <Image src={item.image} alt="" width={800} height={600} unoptimized className="my-2 h-auto max-h-80 max-w-full object-contain" />}
        {item.files?.map(f => <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="me-4 inline-block py-2 text-primary underline">{f.label}</a>)}
        <NestedContent items={item.children} />
      </details> : <>
        {item.href ? <ItemLink href={item.href} className="inline-block py-2 font-semibold text-primary hover:underline">{item.title}</ItemLink> : <p className="font-semibold text-slate">{item.title}</p>}
        {item.description && <ContentText text={item.description} />}
        {item.meta?.length ? <p className="my-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-muted">{item.meta.map(m => <span key={m}>{m}</span>)}</p> : null}
        {item.image && <Image src={item.image} alt="" width={800} height={600} unoptimized className="my-2 h-auto max-h-80 max-w-full object-contain" />}
        {item.files?.map(f => <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="me-4 inline-block py-2 text-primary underline">{f.label}</a>)}
      </>}
    </li>)}
  </ul>;
}
