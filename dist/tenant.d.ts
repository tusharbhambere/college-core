import type { CollegeClient } from './client.js';
import type { DomainMapping, Institute, WebsiteProfile } from './models.js';
export interface TenantContext {
    host: string;
    instituteId: string;
    admissionAdminId?: string;
    admissionAdminIds: string[];
    financeId?: string;
    hostelId?: string;
    alumniId?: string;
    libraryId?: string;
    eventManagerId?: string;
    eventManagerIds: string[];
    landingControlId?: string;
    iqacId?: string;
    dashboard: Institute;
    profile: WebsiteProfile;
    domain: DomainMapping;
}
/** Builds the same dependency IDs used by the existing college websites. */
export declare function tenantFromResponses(host: string, domain: DomainMapping | null, dashboard: Institute, profile: WebsiteProfile): TenantContext;
/** Resolves the tenant first, then fetches its independent dashboard and website profile together. */
export declare function resolveTenant(client: CollegeClient, host: string): Promise<TenantContext>;
//# sourceMappingURL=tenant.d.ts.map