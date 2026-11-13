"use client";

import { useEffect, useRef } from "react";
import { cn } from "./cn.js";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Scroll-reveal wrapper: fades content up the first time it enters the
 * viewport. The hidden state is gated behind `html.js` (see globals.css),
 * so content remains visible without JavaScript, and reduced-motion users
 * see it instantly.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Elements already in (or above) the viewport reveal immediately —
    // covers first paint and environments where observer callbacks lag.
    if (
      typeof IntersectionObserver === "undefined" ||
      el.getBoundingClientRect().top < window.innerHeight * 0.95
    ) {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("reveal", className)}>
      {children}
    </div>
  );
}
