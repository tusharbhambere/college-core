"use client";

import type { CollegeClient, NewsletterBody, TenantContext } from "../index.js";
import { Section, SectionHeading } from "./Section.js";
import { useCollege } from "./CollegeProvider.js";
import { useCollegeMutation } from "./hooks.js";
import { errorMessage } from "../index.js";

const subscribe = (client: CollegeClient, tenant: TenantContext, body: NewsletterBody) =>
  client.events.subscribe(tenant.eventManagerId!, body);

/** Event newsletter subscription (events.subscribe). "Already Subscribed" stays an error. */
export function NewsletterSubscribe() {
  const { tenant } = useCollege();
  const mutation = useCollegeMutation(subscribe);
  if (!tenant?.eventManagerId) return null;

  return (
    <Section tone="muted" reveal={false}>
      <SectionHeading eyebrow="Stay informed" title="Subscribe to event updates" />
      {mutation.status === "success" ? (
        <p role="status" className="font-semibold text-success [overflow-wrap:anywhere]">You’re subscribed to college event updates.</p>
      ) : (
        <form
          className="flex min-w-0 flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void mutation.mutate({ name: String(f.get("name")).trim(), email: String(f.get("email")).trim() });
          }}
        >
          <label className="sr-only" htmlFor="nl-name">Name</label>
          <input id="nl-name" name="name" required placeholder="Your name" className="input-glow min-h-11 min-w-0 flex-[1_1_14rem] rounded-lg border border-input-border bg-white px-3 text-base sm:text-sm" />
          <label className="sr-only" htmlFor="nl-email">Email</label>
          <input id="nl-email" name="email" type="email" required placeholder="you@example.com" className="input-glow min-h-11 min-w-0 flex-[1_1_14rem] rounded-lg border border-input-border bg-white px-3 text-base sm:text-sm" />
          <button type="submit" disabled={mutation.status === "loading"} className="btn-sheen min-h-11 w-full shrink-0 disabled:cursor-not-allowed disabled:opacity-60 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover sm:w-auto">
            {mutation.status === "loading" ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}
      {mutation.status === "error" && (
        <p role="alert" className="mt-3 text-sm text-error [overflow-wrap:anywhere]">{errorMessage(mutation.error)}</p>
      )}
    </Section>
  );
}
