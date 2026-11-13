"use client";

import { AnnouncementTicker } from "./AnnouncementTicker.js";
import { useWebsitePage } from "./hooks.js";
import { useLocalHref } from "./adapters.js";
import { LiveError } from "./LiveState.js";

type TickerItem = { text: string; href?: string; highlight?: boolean };

/** Home ticker: curated site items first, then the latest published API notices. */
export function LiveNoticesTicker({ items }: { items: TickerItem[] }) {
  const notices = useWebsitePage("notices", { page: 1, limit: 5 });
  const localHref = useLocalHref();
  const live = (notices.data?.items ?? []).map((n) => ({ text: n.title, href: localHref(n.href) }));
  return (
    <>
      <AnnouncementTicker items={[...items, ...live]} />
      {notices.status === "error" && (
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <LiveError error={notices.error} onRetry={notices.refetch} />
        </div>
      )}
    </>
  );
}
