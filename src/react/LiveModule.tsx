"use client";

import { useState } from "react";
import type { WebsitePageParams } from "../index.js";
import { Section, SectionHeading } from "./Section.js";
import { useWebsitePage } from "./hooks.js";
import { ContentList } from "./ContentList.js";
import { LiveEmpty, LiveError, LiveLoading } from "./LiveState.js";

type Props = {
  /** Any `loadWebsitePage` module: notices, departments, faculty, events, gallery, … */
  module: string;
  params?: WebsitePageParams;
  eyebrow?: string;
  title?: string;
  description?: string;
  tone?: "default" | "muted" | "white";
  layout?: "grid" | "list";
  /** Show "Load more" when the module reports more pages. */
  paginate?: boolean;
  /** Hide the whole section when the college published nothing (default). */
  hideWhenEmpty?: boolean;
  /** Render without the Section wrapper (for embedding in an existing section). */
  bare?: boolean;
};

/**
 * Live section for one Gosavi tab. Waits for the tenant, then displays content
 * or a retryable error, including failures while resolving the college.
 */
export function LiveModule({
  module,
  params = {},
  eyebrow = "Live from the college office",
  title,
  description,
  tone = "white",
  layout = "grid",
  paginate = false,
  hideWhenEmpty = true,
  bare = false,
}: Props) {
  const [page, setPage] = useState(1);
  const limit = Number(params.limit) || 9;
  const query = useWebsitePage(module, paginate ? { ...params, page, limit } : params);
  const [pages, setPages] = useState<Record<number, NonNullable<typeof query.data>["items"]>>({});

  if (query.status === "idle") return null; // tenant loading or request skipped
  if (query.status === "success" && query.data && pages[page] !== query.data.items) {
    setPages((prev) => ({ ...prev, [page]: query.data!.items }));
  }

  const items = paginate
    ? Object.keys(pages).map(Number).sort((a, b) => a - b).filter((p) => p <= page).flatMap((p) => pages[p] ?? [])
    : query.data?.items ?? [];
  const empty = query.status === "success" && items.length === 0;
  if (empty && hideWhenEmpty) return null;

  const body = (
    <>
      {(title || query.data?.title) && (
        <SectionHeading eyebrow={eyebrow} title={title ?? query.data!.title} description={description} />
      )}
      {query.status === "error" ? (
        <LiveError error={query.error} onRetry={query.refetch} />
      ) : items.length ? (
        <>
          <ContentList items={items} layout={layout} />
          {paginate && query.data?.hasMore && query.status === "success" && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="mt-6 min-h-11 rounded-md border border-primary px-5 text-sm font-semibold text-primary-dark hover:bg-muted-light"
            >
              Load more
            </button>
          )}
          {query.status === "loading" && <div className="mt-4"><LiveLoading rows={3} /></div>}
        </>
      ) : empty ? (
        <LiveEmpty />
      ) : (
        <LiveLoading />
      )}
      {query.data?.warnings?.length ? (
        <p className="mt-4 text-xs text-slate-muted [overflow-wrap:anywhere]">Some sections could not be loaded: {query.data.warnings.join("; ")}</p>
      ) : null}
    </>
  );

  if (bare) return <div className="mt-8 min-w-0 sm:mt-10">{body}</div>;
  return (
    <Section tone={tone} reveal={false}>
      {body}
    </Section>
  );
}
