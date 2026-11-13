import { Link } from "./adapters.js";
import { cn } from "./cn.js";

type Variant = "primary" | "secondary" | "ghost" | "brand";

const lift = "hover:-translate-y-0.5 active:translate-y-0";

const variants: Record<Variant, string> = {
  /* Solid accent + inset top highlight + accent-tinted shadow. The fill never
   * changes on hover (label contrast is calculated for it); depth does. */
  primary: cn(
    "btn-sheen bg-accent text-on-accent border border-accent-strong/45 shadow-elev-accent",
    "hover:shadow-[0_1px_0_color-mix(in_oklab,white_45%,transparent)_inset,0_10px_26px_-8px_color-mix(in_oklab,var(--accent-strong)_75%,transparent)]",
    lift,
  ),
  /* Background-size fill (always under text). Use onDark on dark panels. */
  secondary: cn(
    "btn-fill bg-transparent text-primary-dark border border-primary shadow-elev-1 hover:shadow-elev-2",
    lift,
  ),
  ghost: cn("bg-transparent text-primary-dark hover:bg-surface-tint border border-transparent", lift),
  /* Brand gradient (primary-deep → primary-vivid → secondary) with a white
   * label; every stop keeps ≥ 5.5:1 against white. */
  brand: cn(
    "btn-sheen bg-gradient-cta text-on-primary border border-primary-deep shadow-elev-2 hover:shadow-elev-3",
    lift,
  ),
};

/* White outline + white label on dark panels; fills white with a primary label on hover. */
const secondaryOnDark = cn(
  "btn-fill btn-on-dark bg-transparent text-on-primary border border-white/70 shadow-sm hover:shadow-md",
  lift,
);

const ghostOnDark = cn("bg-transparent text-on-primary hover:bg-surface/10 border border-transparent", lift);

type Props = {
  href?: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  external?: boolean;
  /**
   * Pair secondary and ghost buttons with dark primary surfaces
   * (hero video, PageHero, AdmissionCta). White fill → brand label.
   */
  onDark?: boolean;
  disabled?: boolean;
};

/** Keeps label above any decorative layer and inherits contrast colours. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="btn-label relative z-[1] inline-flex min-w-0 max-w-full items-center justify-center gap-2 [overflow-wrap:anywhere]">
      {children}
    </span>
  );
}

export function Button({
  href,
  children,
  variant = "primary",
  className,
  type = "button",
  onClick,
  external,
  onDark = false,
  disabled,
}: Props) {
  const classes = cn(
    "group inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-md px-5 py-2.5 text-center text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color] duration-200 min-h-11 active:scale-[0.98]",
    onDark && variant === "secondary" ? secondaryOnDark
      : onDark && variant === "ghost" ? ghostOnDark : variants[variant],
    disabled && "cursor-not-allowed opacity-60",
    className,
  );

  const label = <Label>{children}</Label>;

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
        >
          {label}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {label}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
