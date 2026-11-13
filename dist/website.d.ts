import type { CollegeClient } from './client.js';
import { type TenantContext } from './tenant.js';
/** A framework-neutral presentation model. API field aliases stay inside this package. */
export interface ContentItem {
    id: string;
    title: string;
    description: string;
    date?: string;
    image?: string;
    href?: string;
    files?: {
        label: string;
        url: string;
    }[];
    children?: ContentItem[];
    meta?: string[];
    /** The inquiry route uses the application's admission administrator, not the institute ID. */
    admissionAdminId?: string;
}
export interface WebsiteSnapshot {
    schemaVersion: 1;
    host: string;
    capturedAt: string;
    tenant: TenantContext;
    brand: {
        name: string;
        fullName: string;
        address: string;
        email: string;
        phone: string;
        affiliation: string;
        accreditation: string;
        logo: string;
        heroImages: string[];
        about: string;
        vision: string;
        mission: string;
    };
    modules: {
        key: string;
        label: string;
        href: string;
    }[];
    notices: ContentItem[];
    departments: ContentItem[];
    events: ContentItem[];
    applications: ContentItem[];
    studentCorner: ContentItem[];
    dynamicTabs: ContentItem[];
    gallery: ContentItem[];
    governance: ContentItem[];
    warnings: string[];
}
export interface ContentOptions {
    assetBaseUrl?: string;
    /** The explore module used for links to full API records. */
    module?: string;
    defaultTitle?: string;
    admissionAdminId?: string;
    /** Defaults to /explore/, a path that works on a static host. */
    pagePath?: string;
}
export interface WebsitePage {
    title: string;
    items: ContentItem[];
    hasMore?: boolean;
    total?: number;
    warnings?: string[];
}
export type WebsitePageParams = Record<string, string | number | undefined>;
/** Normalizes public content recursively without modifying API objects or trusting backend HTML. */
export declare function normalizeContent(value: unknown, options?: ContentOptions): ContentItem[];
/** Resolves a host, then settles optional public reads independently. No mutation is sent. */
export declare function loadWebsite(client: CollegeClient, host?: string): Promise<WebsiteSnapshot>;
/** Reads pages through the same client and domain IDs used by the original sites.
 * Failures are propagated so callers can show retryable errors separately from empty content.
 */
export declare function loadWebsitePage(client: CollegeClient, tenant: TenantContext, module: string, params?: WebsitePageParams): Promise<WebsitePage>;
//# sourceMappingURL=website.d.ts.map