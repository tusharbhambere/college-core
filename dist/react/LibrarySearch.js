"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Section, SectionHeading } from "./Section.js";
import { useCollege } from "./CollegeProvider.js";
import { useWebsitePage } from "./hooks.js";
import { ContentList } from "./ContentList.js";
import { LiveEmpty, LiveError, LiveLoading } from "./LiveState.js";
/** Library OPAC search (library.opac via loadWebsitePage("library", { search })). */
export function LibrarySearch() {
    const { tenant } = useCollege();
    const [draft, setDraft] = useState("");
    const [by, setBy] = useState("book_title");
    const [submitted, setSubmitted] = useState(null);
    const query = useWebsitePage("library", submitted ? { view: "opac", search: submitted.search, is_search_by: submitted.by, page: 1, limit: 12 } : {}, { skip: !submitted });
    if (!tenant?.libraryId)
        return null;
    return (_jsxs(Section, { tone: "muted", reveal: false, children: [_jsx(SectionHeading, { eyebrow: "OPAC", title: "Search the library catalogue", description: "Find books by title, author or subject in the college library." }), _jsxs("form", { role: "search", className: "flex min-w-0 flex-wrap gap-3", onSubmit: (e) => {
                    e.preventDefault();
                    if (draft.trim())
                        setSubmitted({ search: draft.trim(), by });
                }, children: [_jsx("label", { className: "sr-only", htmlFor: "opac-by", children: "Search by" }), _jsxs("select", { id: "opac-by", value: by, onChange: (e) => setBy(e.target.value), className: "input-glow min-h-11 w-full min-w-0 rounded-lg border border-input-border bg-white px-3 text-base sm:w-auto sm:text-sm", children: [_jsx("option", { value: "book_title", children: "Title" }), _jsx("option", { value: "author", children: "Author" }), _jsx("option", { value: "subject", children: "Subject" })] }), _jsx("label", { className: "sr-only", htmlFor: "opac-q", children: "Search term" }), _jsx("input", { id: "opac-q", type: "search", value: draft, onChange: (e) => setDraft(e.target.value), placeholder: by === "author" ? "Author name" : by === "subject" ? "Subject" : "Book title", className: "input-glow min-h-11 min-w-0 flex-[1_1_16rem] rounded-lg border border-input-border bg-white px-3 text-base sm:text-sm" }), _jsx("button", { type: "submit", className: "btn-sheen min-h-11 w-full shrink-0 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover sm:w-auto", children: "Search" })] }), _jsx("div", { className: "mt-6", "aria-live": "polite", children: !submitted ? null : query.status === "error" ? (_jsx(LiveError, { error: query.error, onRetry: query.refetch })) : query.status !== "success" ? (_jsx(LiveLoading, {})) : query.data?.items.length ? (_jsx(ContentList, { items: query.data.items })) : (_jsxs(LiveEmpty, { children: ["No books matched \u201C", submitted.search, "\u201D."] })) })] }));
}
//# sourceMappingURL=LibrarySearch.js.map