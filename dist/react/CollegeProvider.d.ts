import { type ReactNode } from "react";
import { type CollegeClient } from "../client.js";
import { type TenantContext } from "../tenant.js";
export type TenantStatus = "loading" | "ready" | "unavailable";
export type CollegeContextValue = {
    client: CollegeClient;
    tenant: TenantContext | null;
    status: TenantStatus;
    error: unknown;
    refetch: () => void;
};
export interface CollegeProviderProps {
    children: ReactNode;
    /** A pre-built client. Otherwise one is created from apiBaseUrl/assetBaseUrl/timeoutMs. */
    client?: CollegeClient;
    apiBaseUrl?: string;
    assetBaseUrl?: string;
    timeoutMs?: number;
    /** Host to resolve, or a function evaluated in the browser (e.g. from window.location). */
    host: string | (() => string);
    /** Called when tenant resolution fails (logging/diagnostics). */
    onError?: (error: unknown, host: string) => void;
}
/**
 * Resolves the college (tenant) once per page load. An unmapped host stays "unavailable";
 * failed requests expose their error and a retry action to live sections.
 */
export declare function CollegeProvider({ children, client: provided, apiBaseUrl, assetBaseUrl, timeoutMs, host, onError }: CollegeProviderProps): import("react").JSX.Element;
export declare function useCollege(): CollegeContextValue;
//# sourceMappingURL=CollegeProvider.d.ts.map