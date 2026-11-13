"use client";

import type { ContentItem } from "../index.js";
import { Section, SectionHeading } from "./Section.js";
import type { QueryResult } from "./hooks.js";
import { usePrincipalMessages, useHomeAbout } from "./hooks.js";
import { ContentList } from "./ContentList.js";
import { LiveError, LiveLoading } from "./LiveState.js";

function LiveCollection({ query, eyebrow, title }: { query: QueryResult<ContentItem[]>; eyebrow: string; title: string }) {
  if (query.status === "idle") return null;
  if (query.status === "success" && !query.data?.length) return null;
  return (
    <Section tone="white" reveal={false}>
      <SectionHeading eyebrow={eyebrow} title={title} />
      {query.status === "error" ? (
        <LiveError error={query.error} onRetry={query.refetch} />
      ) : query.data ? (
        <ContentList items={query.data} layout="list" />
      ) : (
        <LiveLoading />
      )}
    </Section>
  );
}

/** site.principalMessages */
export function LivePrincipalMessages() {
  return <LiveCollection query={usePrincipalMessages()} eyebrow="Live from the college office" title="Messages from the desk" />;
}

/** site.homeAbout */
export function LiveHomeAbout() {
  return <LiveCollection query={useHomeAbout()} eyebrow="Live from the college office" title="About the college" />;
}
