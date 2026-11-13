import { Link } from "./adapters.js";
import { Button } from "./Button.js";

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-muted">
        <li>
          <Link href="/" className="underline-offset-4 hover:text-primary hover:underline">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.label} className="flex min-w-0 max-w-full items-start gap-1.5 [overflow-wrap:anywhere]">
            <span aria-hidden className="text-accent-strong">/</span>
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="underline-offset-4 hover:text-primary hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-primary-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  title,
  description,
  breadcrumbs,
  cta,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  cta?: { label: string; href: string }[];
}) {
  return (
    <div className="surface-hero texture-grain relative overflow-hidden text-on-primary">
      {/* Decorative layers: dot pattern, soft accent orb, ECG rule */}
      <div aria-hidden className="bg-pattern-grid pointer-events-none absolute inset-0 z-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -end-24 -top-24 z-0 h-72 w-72 rounded-full bg-primary-glow/20 blur-3xl"
      />
      <svg
        className="absolute inset-x-0 bottom-4 z-0 h-7 w-full text-accent-light/30"
        viewBox="0 0 1200 48"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden
      >
        <path
          className="pulse-line"
          pathLength={1}
          d="M0 36 H720 l14 0 10 -14 12 24 10 -32 10 26 8 -4 H840 H1200"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {/* Signature brand stripe along the foot of the hero */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-1 bg-gradient-brand-line-on-dark" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 md:py-16">
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="anim-fade-up mb-5">
            <ol className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-primary-ink/45 px-3.5 py-1.5 text-sm text-on-primary-muted ring-1 ring-white/15 backdrop-blur-sm">
              <li>
                <Link href="/" className="underline-offset-4 hover:text-on-primary hover:underline">
                  Home
                </Link>
              </li>
              {breadcrumbs.map((item, i) => (
                <li key={item.label} className="flex min-w-0 max-w-full items-start gap-1.5 [overflow-wrap:anywhere]">
                  <span aria-hidden className="text-accent-light/80">/</span>
                  {item.href && i < breadcrumbs.length - 1 ? (
                    <Link href={item.href} className="underline-offset-4 hover:text-on-primary hover:underline">
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-semibold text-on-primary">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <span className="anim-fade-up anim-delay-1 block h-1 w-14 rounded-full bg-gradient-accent-on-dark shadow-[0_0_14px_color-mix(in_oklab,var(--accent)_45%,transparent)]" aria-hidden />
        <h1 className="anim-fade-up anim-delay-1 mt-5 max-w-3xl text-3xl font-semibold text-on-primary md:text-4xl lg:text-[2.75rem]">
          {title}
        </h1>
        {description && (
          <p className="anim-fade-up anim-delay-2 mt-4 max-w-2xl text-base text-on-primary-muted md:text-lg">
            {description}
          </p>
        )}
        {cta && cta.length > 0 && (
          <div className="anim-fade-up anim-delay-3 mt-8 flex flex-wrap gap-3">
            {cta.map((c, i) => (
              <Button
                key={c.href}
                href={c.href}
                variant={i === 0 ? "primary" : "secondary"}
                onDark={i > 0}
                className={i > 0 ? "border-white text-on-primary hover:border-white" : ""}
              >
                {c.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
