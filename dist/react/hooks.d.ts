import type { CollegeClient } from "../client.js";
import type { TenantContext } from "../tenant.js";
import { type ContentItem, type WebsitePage, type WebsitePageParams } from "../website.js";
import { useCollege } from "./CollegeProvider.js";
export type QueryStatus = "idle" | "loading" | "success" | "error";
export type QueryResult<T> = {
    data: T | undefined;
    error: unknown;
    status: QueryStatus;
    refetch: () => void;
};
/**
 * Generic read hook — the `useX({ id, skip }) → { data, refetch }` shape of HPTRYK's
 * hooks/about-api.js, backed by @college/core instead of RTK Query.
 * Waits for the tenant; `key` must change whenever the request inputs change.
 */
export declare function useCollegeQuery<T>(key: string, read: (client: CollegeClient, tenant: TenantContext) => Promise<T>, options?: {
    skip?: boolean;
}): QueryResult<T> & {
    tenantStatus: ReturnType<typeof useCollege>["status"];
};
/** Explicit user-action mutation. Never retried; rejection stays an error. */
export declare function useCollegeMutation<A, T>(send: (client: CollegeClient, tenant: TenantContext, args: A) => Promise<T>): {
    mutate: (args: A) => Promise<void>;
    reset: () => void;
    ready: boolean;
    status: QueryStatus;
    data?: T;
    error?: unknown;
};
/** Any `loadCollegePage` module (notices, departments, faculty, library, gallery, …). */
export declare function useWebsitePage(module: string, params?: WebsitePageParams, options?: {
    skip?: boolean;
}): QueryResult<WebsitePage> & {
    tenantStatus: ReturnType<typeof useCollege>["status"];
};
/** Principal / leadership messages (site.principalMessages). */
export declare function usePrincipalMessages(): QueryResult<ContentItem[]> & {
    tenantStatus: ReturnType<typeof useCollege>["status"];
};
/** Home "about" blocks (site.homeAbout). */
export declare function useHomeAbout(): QueryResult<ContentItem[]> & {
    tenantStatus: ReturnType<typeof useCollege>["status"];
};
//# sourceMappingURL=hooks.d.ts.map