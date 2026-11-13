import type { WebsiteProfile } from './models.js';
export interface SafeUrlOptions {
    baseUrl?: string;
    allowMailto?: boolean;
    allowTel?: boolean;
}
/** Accepts navigable URLs without depending on a browser or DOM. */
export declare function safeUrl(value: unknown, options?: SafeUrlOptions): string | undefined;
/** Resolves a storage key beneath its CDN base; absolute HTTP(S) assets remain absolute. */
export declare function assetUrl(key: unknown, baseUrl: string): string | undefined;
/** Extracts a plain-text preview. Render the result as text, never as trusted HTML. */
export declare function plainText(value: unknown): string;
export interface Pagination {
    page: number;
    limit: number;
}
export interface PaginatedItems<T> extends Pagination {
    items: T[];
    total: number;
    totalPages: number;
}
/** Matches the public API's default page and limit without silently capping list sizes. */
export declare function normalizePagination(page?: unknown, limit?: unknown): Pagination;
export declare function paginate<T>(items: readonly T[], page?: unknown, limit?: unknown): PaginatedItems<T>;
/** Missing switches are enabled; only explicit false disables a module. */
export declare function enabledModules(profile: WebsiteProfile): Record<string, boolean>;
//# sourceMappingURL=helpers.d.ts.map