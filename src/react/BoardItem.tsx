"use client";

import { useRef, useState } from "react";
import { Link, useLocalHref } from "./adapters.js";
import type { ContentItem } from "../index.js";
import { formatDate, isRecent } from "../index.js";
import {
  AttachmentThumb,
  isPreviewable,
  itemAttachments,
  NewBadge,
  PreviewDialog,
  PreviewGlyph,
  useItemWithAttachments,
} from "./AttachmentPreview.js";

/**
 * Compact home-board row: date chip, title (whole row links to the record) and — when the
 * record has an image or PDF — a small thumbnail that opens the quick-preview dialog.
 */
export function BoardItem({
  item: listed,
  fallbackHref,
  loadDetails,
  freshDays,
}: {
  item: ContentItem;
  fallbackHref: string;
  /** Read the record's detail for attachments the list endpoint omits (notices). */
  loadDetails?: boolean;
  freshDays?: number;
}) {
  const { item, loading } = useItemWithAttachments(listed, Boolean(loadDetails));
  const [previewing, setPreviewing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const attachments = itemAttachments(item);
  const previewable = attachments.some(isPreviewable);
  const date = formatDate(item.date);
  const href = useLocalHref()(item.href) ?? fallbackHref;
  const fresh = freshDays !== undefined && isRecent(item.date, freshDays);

  return (
    <div className="group relative flex items-center gap-3 rounded-md border border-border bg-surface p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary-deep/5 sm:gap-4 sm:p-4">
      {date && (
        <time
          dateTime={item.date}
          className="flex w-14 shrink-0 flex-col items-center self-start rounded-md bg-primary py-1.5 text-center font-semibold uppercase leading-none text-on-primary"
        >
          {/* Day over a three-letter month: "SEPTEMBER" never breaks mid-word in the narrow chip. */}
          <span className="text-lg">{date.split(" ")[0]}</span>
          <span className="mt-1 text-[10px] tracking-[0.12em]">{date.split(" ")[1]?.slice(0, 3)}</span>
        </time>
      )}
      <span className="min-w-0 flex-1 pt-0.5 leading-snug">
        {fresh && <NewBadge className="me-2 align-[1px]" />}
        <Link
          href={href}
          className="text-sm font-medium text-slate [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-md group-hover:text-primary focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
        >
          {item.title}
        </Link>
      </span>
      {loading ? (
        <span aria-hidden className="h-12 w-12 shrink-0 animate-pulse rounded-md bg-muted-light" />
      ) : previewable ? (
        <button
          ref={trigger}
          type="button"
          onClick={() => setPreviewing(true)}
          className="relative z-10 h-12 w-12 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-border bg-muted-light ring-primary transition hover:ring-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <AttachmentThumb attachments={attachments} compact className="h-full w-full" />
          <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-primary-ink/55 text-on-primary opacity-0 transition-opacity hover:opacity-100">
            <PreviewGlyph />
          </span>
          <span className="sr-only">Quick preview: {item.title}</span>
        </button>
      ) : null}
      {previewing && (
        <PreviewDialog
          title={item.title}
          date={item.date}
          attachments={attachments}
          detailsHref={href.startsWith("/") ? href : undefined}
          onClose={() => setPreviewing(false)}
          returnFocusRef={trigger}
        />
      )}
    </div>
  );
}
