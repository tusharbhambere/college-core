import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "./cn.js";
import { Reveal } from "./Reveal.js";
const tones = {
    default: "bg-off-white",
    /* Faint primary/accent glows over the muted paper give bands some rhythm. */
    muted: "bg-muted-light bg-gradient-band",
    primary: "on-dark bg-gradient-cta text-on-primary",
    white: "bg-white",
    /* Brand-tinted band: surface-tint fading to paper, with a hairline edge. */
    tint: "bg-surface-tint bg-gradient-tint border-y border-border-tint",
    /* Warm accent band for highlights / calls to action on light pages. */
    accent: "bg-accent-tint border-y border-accent/30",
    /* Deep layered hero gradient + dot pattern. Dark tones (primary, gradient)
     * need SectionHeading `light` and Button `onDark`. */
    gradient: "on-dark surface-hero texture-grain relative overflow-hidden text-on-primary",
};
export function Section({ children, className, id, tone = "default", reveal = true, }) {
    // Only the layered gradient tone needs its content lifted over decoration.
    const inner = (_jsx("div", { className: cn("mx-auto max-w-6xl px-4 sm:px-6 lg:px-8", tone === "gradient" && "relative z-10"), children: children }));
    return (_jsxs("section", { id: id, className: cn("py-14 md:py-20", tones[tone], className), children: [tone === "gradient" && _jsx("div", { "aria-hidden": true, className: "bg-pattern-grid pointer-events-none absolute inset-0" }), reveal ? _jsx(Reveal, { children: inner }) : inner] }));
}
export function SectionHeading({ eyebrow, title, description, light, }) {
    return (_jsxs("div", { className: "mb-10 max-w-3xl", children: [eyebrow && (_jsxs("p", { className: cn("mb-3 flex items-center gap-2.5 text-[11px] font-sans font-semibold uppercase tracking-[0.18em]", light ? "text-accent-light" : "text-primary"), children: [_jsx("span", { className: cn("rule-grow h-0.5 w-8 rounded-full", light ? "bg-gradient-accent-on-dark" : "bg-gradient-accent"), "aria-hidden": true }), eyebrow] })), _jsx("h2", { className: cn(
                // CMS headings can run to a full sentence (name plus address); step those down a size.
                title.length > 70 ? "text-xl font-semibold leading-snug md:text-2xl lg:text-[1.75rem]" : "text-2xl font-semibold md:text-3xl lg:text-[2.375rem]", light ? "text-on-primary" : "text-primary-ink"), children: title }), description && (_jsx("p", { className: cn("mt-3 text-base", light ? "text-on-primary-muted" : "text-slate-muted"), children: description }))] }));
}
//# sourceMappingURL=Section.js.map