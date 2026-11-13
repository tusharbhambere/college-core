"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
import { resolveLegacyRoute } from "../legacy-routes.js";
function DefaultLink({ href, children, ...props }) {
    return _jsx("a", { href: href, ...props, children: children });
}
function DefaultImage({ fill, sizes, unoptimized: _unoptimized, priority, style, loading, ...props }) {
    const fillStyle = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style;
    // eslint-disable-next-line @next/next/no-img-element
    return _jsx("img", { ...props, sizes: sizes, style: fillStyle, loading: priority ? "eager" : loading ?? "lazy", decoding: "async" });
}
function readLocation() {
    if (typeof window === "undefined")
        return { pathname: "/", searchParams: new URLSearchParams(), push: () => undefined };
    return {
        pathname: window.location.pathname,
        searchParams: new URLSearchParams(window.location.search),
        push: (href) => {
            window.history.pushState(null, "", href);
            window.dispatchEvent(new PopStateEvent("popstate"));
        },
    };
}
function useWindowNavigation() {
    const [state, setState] = useState(readLocation);
    useEffect(() => {
        const update = () => setState(readLocation());
        update();
        window.addEventListener("popstate", update);
        return () => window.removeEventListener("popstate", update);
    }, []);
    return state;
}
const defaults = {
    Link: DefaultLink, Image: DefaultImage, useNavigation: useWindowNavigation,
    explorePath: "/explore", contactPath: "/contact", legacyRoutes: true,
};
const CollegeUIContext = createContext(defaults);
/** Plugs the host framework's router and image components into every @college/core UI component. */
export function CollegeUIProvider({ children, ...config }) {
    const value = { ...defaults, ...Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined)) };
    return _jsx(CollegeUIContext.Provider, { value: value, children: children });
}
export function useCollegeUI() {
    return useContext(CollegeUIContext);
}
export function useCollegeNavigation() {
    return useContext(CollegeUIContext).useNavigation();
}
/** Router link used by every package component; `/explore` and legacy URLs follow the configured routes. */
export function Link({ href, ...props }) {
    const config = useCollegeUI();
    const Component = config.Link;
    return _jsx(Component, { href: toLocalHref(href, config) ?? href, ...props });
}
export function Image(props) {
    const { Image: Component } = useCollegeUI();
    return _jsx(Component, { ...props });
}
/** Normalizes package links for the host: legacy URLs, `/explore/?` → `${explorePath}?`. */
export function toLocalHref(href, config) {
    if (!href)
        return undefined;
    if (href.startsWith("/")) {
        const url = new URL(href, "https://college.invalid");
        if (config.legacyRoutes) {
            const legacy = resolveLegacyRoute(url.pathname, url.search, config);
            if (legacy)
                return legacy;
        }
        if (url.pathname === "/explore/" || url.pathname === "/explore")
            return `${config.explorePath}${url.search}${url.hash}`;
    }
    return href;
}
/** Hook form of `toLocalHref` bound to the configured routes. */
export function useLocalHref() {
    const config = useCollegeUI();
    return (href) => toLocalHref(href, config);
}
/** `toLocalHref` with the default routes (`/explore`, `/contact`, legacy URLs on). Prefer `useLocalHref` in components. */
export function localHref(href) {
    return toLocalHref(href, defaults);
}
//# sourceMappingURL=adapters.js.map