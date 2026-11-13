"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCollegeMutation, useWebsitePage } from "./hooks.js";
import { errorMessage } from "../index.js";
import { Button } from "./Button.js";
const register = (client, tenant, body) => client.alumni.register(tenant.alumniId, body);
const input = "input-glow min-h-11 w-full min-w-0 rounded-lg border border-input-border bg-off-white px-3 py-2.5 text-base sm:text-sm";
/** Alumni registration (alumni.register) — sent only on explicit submit. */
export function AlumniRegistration() {
    const mutation = useCollegeMutation(register);
    const departments = useWebsitePage("alumni-departments");
    if (mutation.status === "success") {
        return (_jsxs("div", { role: "status", className: "min-w-0 rounded-lg border border-success/30 bg-success/10 p-5 text-center [overflow-wrap:anywhere] sm:p-8", children: [_jsx("h3", { className: "text-lg font-semibold text-success", children: "Registration received" }), _jsx("p", { className: "mt-2 text-sm text-slate-muted", children: "Thank you for registering with the alumni association." })] }));
    }
    return (_jsxs("form", { className: "min-w-0 space-y-4 rounded-lg border border-border bg-white p-4 shadow-sm sm:p-6 md:p-8", onSubmit: (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const t = (k) => String(f.get(k) ?? "").trim();
            void mutation.mutate({
                name: t("name"),
                email: t("email"),
                phone_number: Number(t("phone").replace(/\D/g, "").slice(-10)),
                graduation_department: t("department"),
                pass_year: t("pass_year"),
                job_status: t("job_status"),
                company_name: t("company_name"),
                company_location: t("company_location"),
                higher_study: t("higher_study"),
            });
        }, children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [[
                        ["name", "Full name", "text", true],
                        ["email", "Email", "email", true],
                        ["phone", "Phone", "tel", true],
                        ["pass_year", "Year of passing", "text", true],
                        ["company_name", "Organisation / hospital", "text", false],
                        ["company_location", "Work location", "text", false],
                        ["higher_study", "Higher studies (if any)", "text", false],
                    ].map(([name, label, type, required]) => (_jsxs("div", { className: "min-w-0", children: [_jsxs("label", { className: "mb-1.5 block text-sm font-medium text-slate", htmlFor: `al-${name}`, children: [label, required && _jsx("span", { className: "text-accent-foreground", children: " *" })] }), _jsx("input", { id: `al-${name}`, name: name, type: type, required: required, className: input })] }, name))), _jsxs("div", { className: "min-w-0", children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-slate", htmlFor: "al-department", children: "Graduation department *" }), _jsxs("select", { id: "al-department", name: "department", required: true, className: input, defaultValue: "", children: [_jsx("option", { value: "", children: "Choose your department" }), departments.data?.items.map(department => _jsx("option", { value: department.id, children: department.title }, department.id))] }), departments.status === "error" && _jsxs("p", { role: "alert", className: "mt-2 text-sm text-error", children: ["Departments could not be loaded. ", _jsx("button", { type: "button", onClick: departments.refetch, className: "underline", children: "Try again" })] })] }), _jsxs("div", { className: "min-w-0", children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-slate", htmlFor: "al-job_status", children: "Current status" }), _jsxs("select", { id: "al-job_status", name: "job_status", className: input, defaultValue: "Working", children: [_jsx("option", { children: "Working" }), _jsx("option", { children: "Non-Working" })] })] })] }), mutation.status === "error" && (_jsxs("p", { role: "alert", className: "rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error [overflow-wrap:anywhere]", children: ["Registration was not sent. ", errorMessage(mutation.error)] })), _jsx(Button, { type: "submit", className: "w-full sm:w-auto", disabled: mutation.status === "loading", children: mutation.status === "loading" ? "Sending…" : "Register as Alumni" })] }));
}
//# sourceMappingURL=AlumniRegistration.js.map