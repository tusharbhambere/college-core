import { Link } from "./adapters.js";

type TickerItem = {
  text: string;
  href?: string;
  highlight?: boolean;
};

/**
 * Slim scrolling announcement strip under the header. Pure-CSS marquee
 * (content duplicated once for a seamless loop); pauses on hover/focus
 * and freezes for reduced-motion users.
 */
export function AnnouncementTicker({ items }: { items: TickerItem[] }) {
  // Each run repeats the items so a single run stays wider than the viewport
  // (the -50% marquee loop is only seamless when one run ≥ viewport width).
  const repeated = [...items, ...items, ...items];

  const renderRun = (ariaHidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {repeated.map((item, i) => (
        <div key={i} className="flex items-center whitespace-nowrap" aria-hidden={i >= items.length || undefined}>
          <span className="px-5 text-accent-light" aria-hidden>
            ✦
          </span>
          {item.href ? (
            <Link
              href={item.href}
              tabIndex={ariaHidden || i >= items.length ? -1 : undefined}
              className={
                item.highlight
                  ? "inline-flex min-h-11 items-center font-semibold text-on-primary underline decoration-accent-light decoration-2 underline-offset-4 hover:text-accent-light"
                  : "inline-flex min-h-11 items-center hover:text-on-primary"
              }
            >
              {item.text}
            </Link>
          ) : (
            <span className={item.highlight ? "font-semibold text-on-primary" : undefined}>
              {item.text}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="ticker overflow-hidden border-b border-white/10 bg-primary-ink text-[13px] text-on-primary-muted"
      role="region"
      aria-label="Announcements"
    >
      <div className="ticker-track">
        {renderRun(false)}
        {renderRun(true)}
      </div>
    </div>
  );
}
