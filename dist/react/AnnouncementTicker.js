import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "./adapters.js";
/**
 * Slim scrolling announcement strip under the header. Pure-CSS marquee
 * (content duplicated once for a seamless loop); pauses on hover/focus
 * and freezes for reduced-motion users.
 */
export function AnnouncementTicker({ items }) {
    // Each run repeats the items so a single run stays wider than the viewport
    // (the -50% marquee loop is only seamless when one run ≥ viewport width).
    const repeated = [...items, ...items, ...items];
    const renderRun = (ariaHidden) => (_jsx("div", { className: "flex shrink-0 items-center", "aria-hidden": ariaHidden || undefined, children: repeated.map((item, i) => (_jsxs("div", { className: "flex items-center whitespace-nowrap", "aria-hidden": i >= items.length || undefined, children: [_jsx("span", { className: "px-5 text-accent-light", "aria-hidden": true, children: "\u2726" }), item.href ? (_jsx(Link, { href: item.href, tabIndex: ariaHidden || i >= items.length ? -1 : undefined, className: item.highlight
                        ? "inline-flex min-h-11 items-center font-semibold text-on-primary underline decoration-accent-light decoration-2 underline-offset-4 hover:text-accent-light"
                        : "inline-flex min-h-11 items-center hover:text-on-primary", children: item.text })) : (_jsx("span", { className: item.highlight ? "font-semibold text-on-primary" : undefined, children: item.text }))] }, i))) }));
    return (_jsx("div", { className: "ticker overflow-hidden border-b border-white/10 bg-primary-ink text-[13px] text-on-primary-muted", role: "region", "aria-label": "Announcements", children: _jsxs("div", { className: "ticker-track", children: [renderRun(false), renderRun(true)] }) }));
}
//# sourceMappingURL=AnnouncementTicker.js.map