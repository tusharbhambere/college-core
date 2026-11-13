export interface HostResolutionOptions {
    /** Host used on localhost / hosting preview domains (e.g. from NEXT_PUBLIC_COLLEGE_HOST). */
    override?: string;
    /** Served hostname → CMS hostname, for legacy domains still attached to hosting. */
    aliases?: Record<string, string>;
    /** Extra preview suffixes besides `.web.app` and `.firebaseapp.com`. */
    previewSuffixes?: readonly string[];
}
/** True for local development and hosting preview domains that have no backend mapping. */
export declare function isPreviewHost(hostname: string, previewSuffixes?: readonly string[]): boolean;
/**
 * Host used for tenant lookup. A real custom domain always selects its own college;
 * the override applies only on localhost and preview domains.
 */
export declare function resolveCollegeHost(hostname: string, options?: HostResolutionOptions): string;
/** [rel, file, size] icon files generated per host. */
export type FaviconFile = readonly [rel: string, file: string, size: number];
export declare const DEFAULT_FAVICON_FILES: readonly FaviconFile[];
export interface FaviconScriptOptions {
    /** CMS hosts that have generated icons under `${basePath}/<host>/`. */
    hosts: readonly string[];
    aliases?: Record<string, string>;
    override?: string;
    files?: readonly FaviconFile[];
    basePath?: string;
}
/**
 * Inline script that adds the served college's icons before first paint. Static exports serve
 * one HTML file to every domain, so the choice is made by hostname with `resolveCollegeHost` rules.
 */
export declare function faviconScript(options: FaviconScriptOptions): string;
//# sourceMappingURL=hosts.d.ts.map