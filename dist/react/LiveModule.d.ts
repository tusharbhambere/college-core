import type { WebsitePageParams } from "../index.js";
type Props = {
    /** Any `loadWebsitePage` module: notices, departments, faculty, events, gallery, … */
    module: string;
    params?: WebsitePageParams;
    eyebrow?: string;
    title?: string;
    description?: string;
    tone?: "default" | "muted" | "white";
    layout?: "grid" | "list";
    /** Show "Load more" when the module reports more pages. */
    paginate?: boolean;
    /** Hide the whole section when the college published nothing (default). */
    hideWhenEmpty?: boolean;
    /** Render without the Section wrapper (for embedding in an existing section). */
    bare?: boolean;
};
/**
 * Live section for one Gosavi tab. Waits for the tenant, then displays content
 * or a retryable error, including failures while resolving the college.
 */
export declare function LiveModule({ module, params, eyebrow, title, description, tone, layout, paginate, hideWhenEmpty, bare, }: Props): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=LiveModule.d.ts.map