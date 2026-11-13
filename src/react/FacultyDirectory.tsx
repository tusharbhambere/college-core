"use client";

import { useState } from "react";
import { Section } from "./Section.js";
import { useWebsitePage } from "./hooks.js";
import { cn } from "./cn.js";
import { ContentList } from "./ContentList.js";
import { LiveError, LiveLoading, LiveEmpty } from "./LiveState.js";

const categories = [
  { key: "teaching", label: "Teaching" },
  { key: "non-teaching", label: "Non-teaching" },
  { key: "other", label: "Other" },
] as const;

/** Staff directory using the shared filterStaff / filterStaffByName rules inside @college/core. */
export function FacultyDirectory({ initialCategory = "teaching" }: { initialCategory?: string }) {
  const [category, setCategory] = useState<(typeof categories)[number]["key"]>(initialCategory === "non-teaching" || initialCategory === "other" ? initialCategory : "teaching");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(12);
  const query = useWebsitePage("staff", { category, search, page: 1, limit });

  if (query.status === "idle") return null;

  return (
    <Section tone="white" reveal={false}>
      {/* The PageHero above already titles this page "Faculty & staff"; no second heading here. */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted-light p-3 sm:p-4">
        <div role="tablist" aria-label="Staff category" className="flex min-w-0 flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.key}
              role="tab"
              type="button"
              aria-selected={category === c.key}
              onClick={() => { setCategory(c.key); setLimit(12); }}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                category === c.key ? "border-primary bg-primary text-on-primary shadow-sm" : "border-border bg-surface text-slate hover:border-primary hover:text-primary",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="staff-search">Search by name</label>
        <input
          id="staff-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          className="input-glow min-h-11 w-full min-w-0 rounded-full border border-input-border bg-surface px-4 text-base sm:ms-auto sm:w-72 sm:text-sm"
        />
      </div>
      {query.status === "error" ? (
        <LiveError error={query.error} onRetry={query.refetch} />
      ) : query.status !== "success" ? (
        <LiveLoading />
      ) : query.data?.items.length ? (
        <>
          {query.data.total != null && (
            <p className="mb-4 text-sm text-slate-muted" aria-live="polite">
              Showing <span className="font-semibold text-slate">{query.data.items.length}</span> of{" "}
              <span className="font-semibold text-slate">{query.data.total}</span> {categories.find((c) => c.key === category)?.label.toLowerCase()} staff
              {search.trim() && <> matching “{search.trim()}”</>}
            </p>
          )}
          <ContentList items={query.data.items} layout="people" />
          {query.data.hasMore && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + 12)}
              className="mx-auto mt-8 flex min-h-11 items-center rounded-full border border-primary px-6 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary hover:text-on-primary"
            >
              Show more ({query.data.total! - query.data.items.length} more)
            </button>
          )}
        </>
      ) : (
        <LiveEmpty>{search.trim() ? `No staff named “${search.trim()}” in this category. Check the spelling or try another category.` : "No staff have been published in this category yet."}</LiveEmpty>
      )}
    </Section>
  );
}
