"use client";

import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ComponentType, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from "react";
import { resolveLegacyRoute } from "../legacy-routes.js";

export type LinkComponentProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children?: ReactNode };
export type ImageComponentProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Fill the positioned parent (like next/image `fill`). */
  fill?: boolean;
  sizes?: string;
  /** Accepted for next/image compatibility; ignored by the default <img> adapter. */
  unoptimized?: boolean;
  priority?: boolean;
};

export interface CollegeNavigation {
  pathname: string;
  searchParams: URLSearchParams;
  push: (href: string) => void;
}

export interface CollegeUIConfig {
  /** Client-side router link (e.g. next/link). Default: a plain <a>. */
  Link?: ComponentType<LinkComponentProps>;
  /** Image component (e.g. next/image). Default: a plain lazy <img>. */
  Image?: ComponentType<ImageComponentProps>;
  /** Hook returning the router state (e.g. built from next/navigation). Default: window.location + history. */
  useNavigation?: () => CollegeNavigation;
  /** Route rendering `<ExploreView />`. Default `/explore`. */
  explorePath?: string;
  /** Contact page (enquiry form at `#enquiry`). Default `/contact`. */
  contactPath?: string;
  /** Translate old website URLs. Default: PVG legacy route families; pass `false` to disable. */
  legacyRoutes?: boolean;
}

function DefaultLink({ href, children, ...props }: LinkComponentProps) {
  return <a href={href} {...props}>{children}</a>;
}

function DefaultImage({ fill, sizes, unoptimized: _unoptimized, priority, style, loading, ...props }: ImageComponentProps) {
  const fillStyle: CSSProperties | undefined = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style;
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} sizes={sizes} style={fillStyle} loading={priority ? "eager" : loading ?? "lazy"} decoding="async" />;
}

function readLocation(): CollegeNavigation {
  if (typeof window === "undefined") return { pathname: "/", searchParams: new URLSearchParams(), push: () => undefined };
  return {
    pathname: window.location.pathname,
    searchParams: new URLSearchParams(window.location.search),
    push: (href) => {
      window.history.pushState(null, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  };
}

function useWindowNavigation(): CollegeNavigation {
  const [state, setState] = useState(readLocation);
  useEffect(() => {
    const update = () => setState(readLocation());
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return state;
}

const defaults: Required<CollegeUIConfig> = {
  Link: DefaultLink, Image: DefaultImage, useNavigation: useWindowNavigation,
  explorePath: "/explore", contactPath: "/contact", legacyRoutes: true,
};

const CollegeUIContext = createContext<Required<CollegeUIConfig>>(defaults);

/** Plugs the host framework's router and image components into every @college/core UI component. */
export function CollegeUIProvider({ children, ...config }: CollegeUIConfig & { children: ReactNode }) {
  const value = { ...defaults, ...Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined)) } as Required<CollegeUIConfig>;
  return <CollegeUIContext.Provider value={value}>{children}</CollegeUIContext.Provider>;
}

export function useCollegeUI(): Required<CollegeUIConfig> {
  return useContext(CollegeUIContext);
}

export function useCollegeNavigation(): CollegeNavigation {
  return useContext(CollegeUIContext).useNavigation();
}

/** Router link used by every package component; `/explore` and legacy URLs follow the configured routes. */
export function Link({ href, ...props }: LinkComponentProps) {
  const config = useCollegeUI();
  const Component = config.Link;
  return <Component href={toLocalHref(href, config) ?? href} {...props} />;
}

export function Image(props: ImageComponentProps) {
  const { Image: Component } = useCollegeUI();
  return <Component {...props} />;
}

/** Normalizes package links for the host: legacy URLs, `/explore/?` → `${explorePath}?`. */
export function toLocalHref(href: string | undefined, config: Pick<Required<CollegeUIConfig>, "explorePath" | "contactPath" | "legacyRoutes">): string | undefined {
  if (!href) return undefined;
  if (href.startsWith("/")) {
    const url = new URL(href, "https://college.invalid");
    if (config.legacyRoutes) {
      const legacy = resolveLegacyRoute(url.pathname, url.search, config);
      if (legacy) return legacy;
    }
    if (url.pathname === "/explore/" || url.pathname === "/explore") return `${config.explorePath}${url.search}${url.hash}`;
  }
  return href;
}

/** Hook form of `toLocalHref` bound to the configured routes. */
export function useLocalHref(): (href?: string) => string | undefined {
  const config = useCollegeUI();
  return (href) => toLocalHref(href, config);
}

/** `toLocalHref` with the default routes (`/explore`, `/contact`, legacy URLs on). Prefer `useLocalHref` in components. */
export function localHref(href?: string): string | undefined {
  return toLocalHref(href, defaults);
}
