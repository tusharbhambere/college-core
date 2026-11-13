"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { errorMessage } from "../index.js";
import { Button } from "./Button.js";
import { useCollegeUI } from "./adapters.js";
/** Loading skeleton in the Gosavi card style (HPTRYK QLoader equivalent). */
export function LiveLoading({ rows = 3 }) {
    return (_jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", role: "status", "aria-live": "polite", children: [_jsx("span", { className: "sr-only", children: "Loading latest information\u2026" }), Array.from({ length: rows }, (_, i) => (_jsx("div", { className: "skeleton-shimmer h-28 rounded-lg border border-border-tint shadow-elev-1" }, i)))] }));
}
/** A failed request — kept visually distinct from an empty result. */
export function LiveError({ error, onRetry, title = "Couldn’t load the latest information." }) {
    return (_jsxs("div", { role: "alert", className: "flex min-w-0 gap-3 rounded-lg border border-error-border border-s-4 border-s-error bg-error-bg p-4 text-sm text-slate shadow-elev-1 [overflow-wrap:anywhere] sm:p-5", children: [_jsx("span", { "aria-hidden": true, className: "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-error text-xs font-bold text-white", children: "!" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-semibold text-error-fg", children: title }), _jsx("p", { className: "mt-1 text-slate-muted", children: errorMessage(error) }), onRetry && (_jsx("button", { type: "button", onClick: onRetry, className: "mt-3 min-h-11 rounded-md border border-primary bg-surface px-4 text-sm font-semibold text-primary-dark shadow-elev-1 transition-[background-color,box-shadow] hover:bg-surface-tint hover:shadow-elev-2", children: "Try again" }))] })] }));
}
export function LiveEmpty({ children = "The college has not published information in this section yet.", actions = false }) {
    const { contactPath } = useCollegeUI();
    return (_jsxs("div", { className: "flex min-w-0 items-start gap-3 rounded-lg border border-dashed border-border-strong bg-surface-tint p-4 text-sm text-slate-muted [overflow-wrap:anywhere] sm:p-5", children: [_jsx("span", { "aria-hidden": true, className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-tint text-secondary ring-1 ring-info-border", children: _jsxs("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M22 12h-6l-2 3h-4l-2-3H2" }), _jsx("path", { d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" })] }) }), _jsxs("div", { className: "min-w-0 pt-1", children: [_jsx("p", { children: children }), actions && _jsxs(_Fragment, { children: [_jsx("p", { className: "mt-2", children: "For current information, please contact the college office." }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [_jsx(Button, { href: contactPath, variant: "secondary", children: "Contact the office" }), _jsx(Button, { href: "/", variant: "ghost", children: "Back to home" })] })] })] })] }));
}
//# sourceMappingURL=LiveState.js.map