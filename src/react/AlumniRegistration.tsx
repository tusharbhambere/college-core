"use client";

import type { AlumniRegistrationBody, CollegeClient, TenantContext } from "../index.js";
import { useCollegeMutation, useWebsitePage } from "./hooks.js";
import { errorMessage } from "../index.js";
import { Button } from "./Button.js";

const register = (client: CollegeClient, tenant: TenantContext, body: AlumniRegistrationBody) =>
  client.alumni.register(tenant.alumniId!, body);

const input = "input-glow min-h-11 w-full min-w-0 rounded-lg border border-input-border bg-off-white px-3 py-2.5 text-base sm:text-sm";

/** Alumni registration (alumni.register) — sent only on explicit submit. */
export function AlumniRegistration() {
  const mutation = useCollegeMutation(register);
  const departments = useWebsitePage("alumni-departments");

  if (mutation.status === "success") {
    return (
      <div role="status" className="min-w-0 rounded-lg border border-success/30 bg-success/10 p-5 text-center [overflow-wrap:anywhere] sm:p-8">
        <h3 className="text-lg font-semibold text-success">Registration received</h3>
        <p className="mt-2 text-sm text-slate-muted">Thank you for registering with the alumni association.</p>
      </div>
    );
  }

  return (
    <form
      className="min-w-0 space-y-4 rounded-lg border border-border bg-white p-4 shadow-sm sm:p-6 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const t = (k: string) => String(f.get(k) ?? "").trim();
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
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["name", "Full name", "text", true],
          ["email", "Email", "email", true],
          ["phone", "Phone", "tel", true],
          ["pass_year", "Year of passing", "text", true],
          ["company_name", "Organisation / hospital", "text", false],
          ["company_location", "Work location", "text", false],
          ["higher_study", "Higher studies (if any)", "text", false],
        ].map(([name, label, type, required]) => (
          <div key={name as string} className="min-w-0">
            <label className="mb-1.5 block text-sm font-medium text-slate" htmlFor={`al-${name}`}>
              {label as string}
              {required && <span className="text-accent-foreground"> *</span>}
            </label>
            <input id={`al-${name}`} name={name as string} type={type as string} required={required as boolean} className={input} />
          </div>
        ))}
        <div className="min-w-0">
          <label className="mb-1.5 block text-sm font-medium text-slate" htmlFor="al-department">Graduation department *</label>
          <select id="al-department" name="department" required className={input} defaultValue="">
            <option value="">Choose your department</option>
            {departments.data?.items.map(department => <option key={department.id} value={department.id}>{department.title}</option>)}
          </select>
          {departments.status === "error" && <p role="alert" className="mt-2 text-sm text-error">Departments could not be loaded. <button type="button" onClick={departments.refetch} className="underline">Try again</button></p>}
        </div>
        <div className="min-w-0">
          <label className="mb-1.5 block text-sm font-medium text-slate" htmlFor="al-job_status">Current status</label>
          <select id="al-job_status" name="job_status" className={input} defaultValue="Working">
            <option>Working</option>
            <option>Non-Working</option>
          </select>
        </div>
      </div>
      {mutation.status === "error" && (
        <p role="alert" className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error [overflow-wrap:anywhere]">
          Registration was not sent. {errorMessage(mutation.error)}
        </p>
      )}
      <Button type="submit" className="w-full sm:w-auto" disabled={mutation.status === "loading"}>{mutation.status === "loading" ? "Sending…" : "Register as Alumni"}</Button>
    </form>
  );
}
