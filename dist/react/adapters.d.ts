import { type AnchorHTMLAttributes, type ComponentType, type ImgHTMLAttributes, type ReactNode } from "react";
export type LinkComponentProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    children?: ReactNode;
};
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
/** Plugs the host framework's router and image components into every @college/core UI component. */
export declare function CollegeUIProvider({ children, ...config }: CollegeUIConfig & {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useCollegeUI(): Required<CollegeUIConfig>;
export declare function useCollegeNavigation(): CollegeNavigation;
/** Router link used by every package component; `/explore` and legacy URLs follow the configured routes. */
export declare function Link({ href, ...props }: LinkComponentProps): import("react").JSX.Element;
export declare function Image(props: ImageComponentProps): import("react").JSX.Element;
/** Normalizes package links for the host: legacy URLs, `/explore/?` → `${explorePath}?`. */
export declare function toLocalHref(href: string | undefined, config: Pick<Required<CollegeUIConfig>, "explorePath" | "contactPath" | "legacyRoutes">): string | undefined;
/** Hook form of `toLocalHref` bound to the configured routes. */
export declare function useLocalHref(): (href?: string) => string | undefined;
/** `toLocalHref` with the default routes (`/explore`, `/contact`, legacy URLs on). Prefer `useLocalHref` in components. */
export declare function localHref(href?: string): string | undefined;
//# sourceMappingURL=adapters.d.ts.map