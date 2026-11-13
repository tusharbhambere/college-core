import type { CollegeClient } from './client.js';
import type { TenantContext } from './tenant.js';
import { type WebsitePage, type WebsitePageParams } from './website.js';
export interface CollegePageOptions {
    /** Route that renders these modules. Default: `/explore`. */
    explorePath?: string;
}
/** Infrastructure tabs of `other_data.infrastructure` (Somani). URL token → API key. */
export declare const INFRASTRUCTURE_SECTIONS: Record<string, string>;
/** Student-zone tabs of `other_data.student_zone` (Somani). URL token → API key. */
export declare const STUDENT_ZONE_SECTIONS: Record<string, string>;
/** Readable names for the document collections of `other_data` (Somani institute profile tabs). */
export declare const INSTITUTE_DOCUMENT_LABELS: Record<string, string>;
/** Institute activity categories (Somani). URL token → exact `activity_type`. */
export declare const INSTITUTE_ACTIVITY_TYPES: Record<string, string>;
/**
 * Every public website module: the `loadWebsitePage` modules plus complete profile sections
 * (about, society, administration, accreditation, courses), research papers and meetings,
 * MOU batches, alumni feedback polls, committee members, Somani-style infrastructure,
 * student zone, institute activities, home blocks, flash notices and news posts.
 * Empty CMS slots are removed; failures propagate so callers can offer a retry.
 */
export declare function loadCollegePage(client: CollegeClient, tenant: TenantContext, module: string, params?: WebsitePageParams, options?: CollegePageOptions): Promise<WebsitePage>;
//# sourceMappingURL=pages.d.ts.map