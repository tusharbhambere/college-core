"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Section, SectionHeading } from "./Section.js";
import { usePrincipalMessages, useHomeAbout } from "./hooks.js";
import { ContentList } from "./ContentList.js";
import { LiveError, LiveLoading } from "./LiveState.js";
function LiveCollection({ query, eyebrow, title }) {
    if (query.status === "idle")
        return null;
    if (query.status === "success" && !query.data?.length)
        return null;
    return (_jsxs(Section, { tone: "white", reveal: false, children: [_jsx(SectionHeading, { eyebrow: eyebrow, title: title }), query.status === "error" ? (_jsx(LiveError, { error: query.error, onRetry: query.refetch })) : query.data ? (_jsx(ContentList, { items: query.data, layout: "list" })) : (_jsx(LiveLoading, {}))] }));
}
/** site.principalMessages */
export function LivePrincipalMessages() {
    return _jsx(LiveCollection, { query: usePrincipalMessages(), eyebrow: "Live from the college office", title: "Messages from the desk" });
}
/** site.homeAbout */
export function LiveHomeAbout() {
    return _jsx(LiveCollection, { query: useHomeAbout(), eyebrow: "Live from the college office", title: "About the college" });
}
//# sourceMappingURL=LiveCollection.js.map