"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { AnnouncementTicker } from "./AnnouncementTicker.js";
import { useWebsitePage } from "./hooks.js";
import { useLocalHref } from "./adapters.js";
import { LiveError } from "./LiveState.js";
/** Home ticker: curated site items first, then the latest published API notices. */
export function LiveNoticesTicker({ items }) {
    const notices = useWebsitePage("notices", { page: 1, limit: 5 });
    const localHref = useLocalHref();
    const live = (notices.data?.items ?? []).map((n) => ({ text: n.title, href: localHref(n.href) }));
    return (_jsxs(_Fragment, { children: [_jsx(AnnouncementTicker, { items: [...items, ...live] }), notices.status === "error" && (_jsx("div", { className: "mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8", children: _jsx(LiveError, { error: notices.error, onRetry: notices.refetch }) }))] }));
}
//# sourceMappingURL=LiveNoticesTicker.js.map