import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { contentText } from "../index.js";
import { cn } from "./cn.js";
/** Plain CMS text, with short, clickable host labels instead of long bare URLs. */
function LinkedText({ text, links }) {
    return text.split(/(https?:\/\/[^\s<>]+)/gi).map((part, index) => {
        if (!/^https?:\/\//i.test(part))
            return part;
        const href = part.replace(/[.,;:!?]+$/, "").replace(/[)\]]+$/, (closing) => {
            const opens = (part.match(/[([]/g) ?? []).length;
            const closes = (part.match(/[)\]]/g) ?? []).length;
            return closing.slice(0, Math.max(0, closing.length - (closes - opens)));
        });
        try {
            const url = new URL(href);
            if (!links)
                return `${url.hostname.replace(/^www\./i, "")}${part.slice(href.length)}`;
            return _jsxs("span", { children: [_jsxs("a", { href: url.href, target: "_blank", rel: "noopener noreferrer", className: "relative z-10 inline-block min-h-8 py-1 font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary", children: [url.hostname.replace(/^www\./i, ""), _jsx("span", { "aria-hidden": true, children: " \u2197" }), _jsx("span", { className: "sr-only", children: " (opens in a new tab)" })] }), part.slice(href.length)] }, index);
        }
        catch {
            return part;
        }
    });
}
/** Bullets, numbered programme outcomes and paragraph breaks survive CMS normalization. */
export function ContentText({ text, className, linkUrls = true }) {
    const value = contentText(text);
    if (!value)
        return null;
    const parts = value.split(/\n\s*\n|\n(?=\s*[-•*])|[•]|(?=\b(?:PO|PSO)\s*\d+\s*[-–:])/i).map((part) => part.trim()).filter(Boolean);
    const listed = /•|\n\s*[-*]|\b(?:PO|PSO)\s*\d+\s*[-–:]/i.test(value) && parts.length > 1;
    return (_jsx("div", { className: cn("whitespace-pre-line text-sm leading-relaxed text-slate-muted [overflow-wrap:anywhere]", className), children: listed ? _jsx("ul", { className: "list-disc space-y-2 ps-5 marker:text-primary", children: parts.map((part, i) => _jsx("li", { children: _jsx(LinkedText, { text: part.replace(/^[-•*]\s+/, ""), links: linkUrls }) }, i)) })
            : parts.map((part, i) => _jsx("p", { className: i ? "mt-3" : undefined, children: _jsx(LinkedText, { text: part, links: linkUrls }) }, i)) }));
}
//# sourceMappingURL=ContentText.js.map