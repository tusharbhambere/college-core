"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Section, SectionHeading } from "./Section.js";
import { useWebsitePage } from "./hooks.js";
import { ContentList } from "./ContentList.js";
import { LiveEmpty, LiveError, LiveLoading } from "./LiveState.js";
/**
 * Live section for one Gosavi tab. Waits for the tenant, then displays content
 * or a retryable error, including failures while resolving the college.
 */
export function LiveModule({ module, params = {}, eyebrow = "Live from the college office", title, description, tone = "white", layout = "grid", paginate = false, hideWhenEmpty = true, bare = false, }) {
    const [page, setPage] = useState(1);
    const limit = Number(params.limit) || 9;
    const query = useWebsitePage(module, paginate ? { ...params, page, limit } : params);
    const [pages, setPages] = useState({});
    if (query.status === "idle")
        return null; // tenant loading or request skipped
    if (query.status === "success" && query.data && pages[page] !== query.data.items) {
        setPages((prev) => ({ ...prev, [page]: query.data.items }));
    }
    const items = paginate
        ? Object.keys(pages).map(Number).sort((a, b) => a - b).filter((p) => p <= page).flatMap((p) => pages[p] ?? [])
        : query.data?.items ?? [];
    const empty = query.status === "success" && items.length === 0;
    if (empty && hideWhenEmpty)
        return null;
    const body = (_jsxs(_Fragment, { children: [(title || query.data?.title) && (_jsx(SectionHeading, { eyebrow: eyebrow, title: title ?? query.data.title, description: description })), query.status === "error" ? (_jsx(LiveError, { error: query.error, onRetry: query.refetch })) : items.length ? (_jsxs(_Fragment, { children: [_jsx(ContentList, { items: items, layout: layout }), paginate && query.data?.hasMore && query.status === "success" && (_jsx("button", { type: "button", onClick: () => setPage((p) => p + 1), className: "mt-6 min-h-11 rounded-md border border-primary px-5 text-sm font-semibold text-primary-dark hover:bg-muted-light", children: "Load more" })), query.status === "loading" && _jsx("div", { className: "mt-4", children: _jsx(LiveLoading, { rows: 3 }) })] })) : empty ? (_jsx(LiveEmpty, {})) : (_jsx(LiveLoading, {})), query.data?.warnings?.length ? (_jsxs("p", { className: "mt-4 text-xs text-slate-muted [overflow-wrap:anywhere]", children: ["Some sections could not be loaded: ", query.data.warnings.join("; ")] })) : null] }));
    if (bare)
        return _jsx("div", { className: "mt-8 min-w-0 sm:mt-10", children: body });
    return (_jsx(Section, { tone: tone, reveal: false, children: body }));
}
//# sourceMappingURL=LiveModule.js.map