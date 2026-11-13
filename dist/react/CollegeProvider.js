"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createCollegeClient } from "../client.js";
import { DEFAULT_API_BASE_URL, DEFAULT_ASSET_BASE_URL } from "../config.js";
import { createDedupedFetch } from "../fetch.js";
import { resolveTenant } from "../tenant.js";
const CollegeContext = createContext(null);
/** Shared GET de-duplication across every client created by this module. */
const sharedFetch = typeof globalThis.fetch === "function" ? createDedupedFetch((input, init) => globalThis.fetch(input, init)) : undefined;
/**
 * Resolves the college (tenant) once per page load. An unmapped host stays "unavailable";
 * failed requests expose their error and a retry action to live sections.
 */
export function CollegeProvider({ children, client: provided, apiBaseUrl, assetBaseUrl, timeoutMs, host, onError }) {
    const client = useMemo(() => provided ?? createCollegeClient({
        baseUrl: apiBaseUrl || DEFAULT_API_BASE_URL,
        assetBaseUrl: assetBaseUrl || DEFAULT_ASSET_BASE_URL,
        timeoutMs: timeoutMs || 15_000,
        ...(sharedFetch ? { fetch: sharedFetch } : {}),
    }), [provided, apiBaseUrl, assetBaseUrl, timeoutMs]);
    const [state, setState] = useState({ tenant: null, status: "loading", error: undefined });
    const [attempt, setAttempt] = useState(0);
    const refetch = useCallback(() => {
        setState({ tenant: null, status: "loading", error: undefined });
        setAttempt((value) => value + 1);
    }, []);
    const hostValue = typeof host === "function" ? undefined : host;
    const readHost = typeof host === "function" ? host : undefined;
    useEffect(() => {
        const target = (readHost ? readHost() : hostValue ?? "").trim();
        let cancelled = false;
        const done = (next) => { if (!cancelled)
            setState(next); };
        if (!target) {
            done({ tenant: null, status: "unavailable", error: new Error("A college host has not been configured for this website.") });
        }
        else {
            resolveTenant(client, target)
                .then((tenant) => done({ tenant, status: "ready", error: undefined }))
                .catch((error) => {
                onError?.(error, target);
                done({ tenant: null, status: "unavailable", error });
            });
        }
        return () => { cancelled = true; };
        // readHost/onError identity is not a reason to resolve again.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt, client, hostValue]);
    return _jsx(CollegeContext.Provider, { value: { client, ...state, refetch }, children: children });
}
export function useCollege() {
    const value = useContext(CollegeContext);
    if (!value)
        throw new Error("useCollege must be used inside <CollegeProvider>.");
    return value;
}
//# sourceMappingURL=CollegeProvider.js.map