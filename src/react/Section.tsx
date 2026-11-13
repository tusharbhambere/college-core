import { cn } from "./cn.js";
import { Reveal } from "./Reveal.js";

type Tone = "default" | "muted" | "primary" | "white" | "tint" | "accent" | "gradient";

const tones: Record<Tone, string> = {
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

export function Section({
  children,
  className,
  id,
  tone = "default",
  reveal = true,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: Tone;
  /** Fade the section content up on first scroll into view (default on). */
  reveal?: boolean;
}) {
  // Only the layered gradient tone needs its content lifted over decoration.
  const inner = (
    <div className={cn("mx-auto max-w-6xl px-4 sm:px-6 lg:px-8", tone === "gradient" && "relative z-10")}>{children}</div>
  );

  return (
    <section id={id} className={cn("py-14 md:py-20", tones[tone], className)}>
      {tone === "gradient" && <div aria-hidden className="bg-pattern-grid pointer-events-none absolute inset-0" />}
      {reveal ? <Reveal>{inner}</Reveal> : inner}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  light,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-10 max-w-3xl">
      {eyebrow && (
        <p
          className={cn(
            "mb-3 flex items-center gap-2.5 text-[11px] font-sans font-semibold uppercase tracking-[0.18em]",
            light ? "text-accent-light" : "text-primary",
          )}
        >
          <span
            className={cn("rule-grow h-0.5 w-8 rounded-full", light ? "bg-gradient-accent-on-dark" : "bg-gradient-accent")}
            aria-hidden
          />
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          // CMS headings can run to a full sentence (name plus address); step those down a size.
          title.length > 70 ? "text-xl font-semibold leading-snug md:text-2xl lg:text-[1.75rem]" : "text-2xl font-semibold md:text-3xl lg:text-[2.375rem]",
          light ? "text-on-primary" : "text-primary-ink",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-3 text-base", light ? "text-on-primary-muted" : "text-slate-muted")}>
          {description}
        </p>
      )}
    </div>
  );
}
