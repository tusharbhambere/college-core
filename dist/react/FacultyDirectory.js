"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
];
/** Staff directory using the shared filterStaff / filterStaffByName rules inside @college/core. */
export function FacultyDirectory({ initialCategory = "teaching" }) {
    const [category, setCategory] = useState(initialCategory === "non-teaching" || initialCategory === "other" ? initialCategory : "teaching");
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(12);
    const query = useWebsitePage("staff", { category, search, page: 1, limit });
    if (query.status === "idle")
        return null;
    return (_jsxs(Section, { tone: "white", reveal: false, children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted-light p-3 sm:p-4", children: [_jsx("div", { role: "tablist", "aria-label": "Staff category", className: "flex min-w-0 flex-wrap gap-2", children: categories.map((c) => (_jsx("button", { role: "tab", type: "button", "aria-selected": category === c.key, onClick: () => { setCategory(c.key); setLimit(12); }, className: cn("min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors", category === c.key ? "border-primary bg-primary text-on-primary shadow-sm" : "border-border bg-surface text-slate hover:border-primary hover:text-primary"), children: c.label }, c.key))) }), _jsx("label", { className: "sr-only", htmlFor: "staff-search", children: "Search by name" }), _jsx("input", { id: "staff-search", type: "search", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search by name", className: "input-glow min-h-11 w-full min-w-0 rounded-full border border-input-border bg-surface px-4 text-base sm:ms-auto sm:w-72 sm:text-sm" })] }), query.status === "error" ? (_jsx(LiveError, { error: query.error, onRetry: query.refetch })) : query.status !== "success" ? (_jsx(LiveLoading, {})) : query.data?.items.length ? (_jsxs(_Fragment, { children: [query.data.total != null && (_jsxs("p", { className: "mb-4 text-sm text-slate-muted", "aria-live": "polite", children: ["Showing ", _jsx("span", { className: "font-semibold text-slate", children: query.data.items.length }), " of", " ", _jsx("span", { className: "font-semibold text-slate", children: query.data.total }), " ", categories.find((c) => c.key === category)?.label.toLowerCase(), " staff", search.trim() && _jsxs(_Fragment, { children: [" matching \u201C", search.trim(), "\u201D"] })] })), _jsx(ContentList, { items: query.data.items, layout: "people" }), query.data.hasMore && (_jsxs("button", { type: "button", onClick: () => setLimit((l) => l + 12), className: "mx-auto mt-8 flex min-h-11 items-center rounded-full border border-primary px-6 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary hover:text-on-primary", children: ["Show more (", query.data.total - query.data.items.length, " more)"] }))] })) : (_jsx(LiveEmpty, { children: search.trim() ? `No staff named “${search.trim()}” in this category. Check the spelling or try another category.` : "No staff have been published in this category yet." }))] }));
}
//# sourceMappingURL=FacultyDirectory.js.map