"use client";

import { useState } from "react";
import { Section, SectionHeading } from "./Section.js";
import { useCollege } from "./CollegeProvider.js";
import { useWebsitePage } from "./hooks.js";
import { ContentList } from "./ContentList.js";
import { LiveEmpty, LiveError, LiveLoading } from "./LiveState.js";

type By = "book_title" | "author" | "subject";

/** Library OPAC search (library.opac via loadWebsitePage("library", { search })). */
export function LibrarySearch() {
  const { tenant } = useCollege();
  const [draft, setDraft] = useState("");
  const [by, setBy] = useState<By>("book_title");
  const [submitted, setSubmitted] = useState<{ search: string; by: By } | null>(null);
  const query = useWebsitePage(
    "library",
    submitted ? { view: "opac", search: submitted.search, is_search_by: submitted.by, page: 1, limit: 12 } : {},
    { skip: !submitted },
  );

  if (!tenant?.libraryId) return null;

  return (
    <Section tone="muted" reveal={false}>
      <SectionHeading
        eyebrow="OPAC"
        title="Search the library catalogue"
        description="Find books by title, author or subject in the college library."
      />
      <form
        role="search"
        className="flex min-w-0 flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) setSubmitted({ search: draft.trim(), by });
        }}
      >
        <label className="sr-only" htmlFor="opac-by">Search by</label>
        <select
          id="opac-by"
          value={by}
          onChange={(e) => setBy(e.target.value as By)}
          className="input-glow min-h-11 w-full min-w-0 rounded-lg border border-input-border bg-white px-3 text-base sm:w-auto sm:text-sm"
        >
          <option value="book_title">Title</option>
          <option value="author">Author</option>
          <option value="subject">Subject</option>
        </select>
        <label className="sr-only" htmlFor="opac-q">Search term</label>
        <input
          id="opac-q"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={by === "author" ? "Author name" : by === "subject" ? "Subject" : "Book title"}
          className="input-glow min-h-11 min-w-0 flex-[1_1_16rem] rounded-lg border border-input-border bg-white px-3 text-base sm:text-sm"
        />
        <button type="submit" className="btn-sheen min-h-11 w-full shrink-0 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover sm:w-auto">
          Search
        </button>
      </form>
      <div className="mt-6" aria-live="polite">
        {!submitted ? null : query.status === "error" ? (
          <LiveError error={query.error} onRetry={query.refetch} />
        ) : query.status !== "success" ? (
          <LiveLoading />
        ) : query.data?.items.length ? (
          <ContentList items={query.data.items} />
        ) : (
          <LiveEmpty>No books matched “{submitted.search}”.</LiveEmpty>
        )}
      </div>
    </Section>
  );
}
