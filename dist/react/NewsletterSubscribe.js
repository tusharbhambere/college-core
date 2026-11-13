"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Section, SectionHeading } from "./Section.js";
import { useCollege } from "./CollegeProvider.js";
import { useCollegeMutation } from "./hooks.js";
import { errorMessage } from "../index.js";
const subscribe = (client, tenant, body) => client.events.subscribe(tenant.eventManagerId, body);
/** Event newsletter subscription (events.subscribe). "Already Subscribed" stays an error. */
export function NewsletterSubscribe() {
    const { tenant } = useCollege();
    const mutation = useCollegeMutation(subscribe);
    if (!tenant?.eventManagerId)
        return null;
    return (_jsxs(Section, { tone: "muted", reveal: false, children: [_jsx(SectionHeading, { eyebrow: "Stay informed", title: "Subscribe to event updates" }), mutation.status === "success" ? (_jsx("p", { role: "status", className: "font-semibold text-success [overflow-wrap:anywhere]", children: "You\u2019re subscribed to college event updates." })) : (_jsxs("form", { className: "flex min-w-0 flex-wrap gap-3", onSubmit: (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void mutation.mutate({ name: String(f.get("name")).trim(), email: String(f.get("email")).trim() });
                }, children: [_jsx("label", { className: "sr-only", htmlFor: "nl-name", children: "Name" }), _jsx("input", { id: "nl-name", name: "name", required: true, placeholder: "Your name", className: "input-glow min-h-11 min-w-0 flex-[1_1_14rem] rounded-lg border border-input-border bg-white px-3 text-base sm:text-sm" }), _jsx("label", { className: "sr-only", htmlFor: "nl-email", children: "Email" }), _jsx("input", { id: "nl-email", name: "email", type: "email", required: true, placeholder: "you@example.com", className: "input-glow min-h-11 min-w-0 flex-[1_1_14rem] rounded-lg border border-input-border bg-white px-3 text-base sm:text-sm" }), _jsx("button", { type: "submit", disabled: mutation.status === "loading", className: "btn-sheen min-h-11 w-full shrink-0 disabled:cursor-not-allowed disabled:opacity-60 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover sm:w-auto", children: mutation.status === "loading" ? "Subscribing…" : "Subscribe" })] })), mutation.status === "error" && (_jsx("p", { role: "alert", className: "mt-3 text-sm text-error [overflow-wrap:anywhere]", children: errorMessage(mutation.error) }))] }));
}
//# sourceMappingURL=NewsletterSubscribe.js.map