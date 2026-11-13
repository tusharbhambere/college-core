/** Translates URLs of the previous college websites (PVG route families) to `loadCollegePage` modules. */
/** Every public route family in the previous PVG export. */
export declare const legacyPaths: readonly string[];
export interface LegacyRouteOptions {
    explorePath?: string;
    contactPath?: string;
}
/** Translate old bookmarks without losing their tenant-specific IDs or nested selection. */
export declare function resolveLegacyRoute(pathname: string, search?: string, options?: LegacyRouteOptions): string | null;
//# sourceMappingURL=legacy-routes.d.ts.map