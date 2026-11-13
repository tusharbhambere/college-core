"use client";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { DEFAULT_ASSET_BASE_URL } from "../config.js";
import { loadCollegePage } from "../pages.js";
import { normalizeContent } from "../website.js";
import { useCollegeUI } from "./adapters.js";
import { useCollege } from "./CollegeProvider.js";
/**
 * Generic read hook — the `useX({ id, skip }) → { data, refetch }` shape of HPTRYK's
 * hooks/about-api.js, backed by @college/core instead of RTK Query.
 * Waits for the tenant; `key` must change whenever the request inputs change.
 */
export function useCollegeQuery(key, read, options = {}) {
    const { client, tenant, status: tenantStatus, error: tenantError, refetch: refetchTenant } = useCollege();
    const [nonce, setNonce] = useState(0);
    const [result, setResult] = useState({
        request: "",
        key: "",
        ok: false,
    });
    const runRead = useEffectEvent((t) => read(client, t));
    const enabled = Boolean(tenant) && !options.skip;
    const scopedKey = `${tenant?.instituteId ?? "unresolved"}:${key}`;
    const request = `${scopedKey}#${nonce}`;
    useEffect(() => {
        if (!enabled || !tenant)
            return;
        let cancelled = false;
        runRead(tenant).then((data) => !cancelled && setResult({ request, key: scopedKey, data, ok: true }), (error) => !cancelled && setResult({ request, key: scopedKey, error, ok: false }));
        return () => {
            cancelled = true;
        };
    }, [tenant, enabled, request, scopedKey]);
    const refetch = useCallback(() => {
        if (tenantStatus === "unavailable")
            refetchTenant();
        else
            setNonce((n) => n + 1);
    }, [tenantStatus, refetchTenant]);
    const settled = result.request === request;
    // Loading is derived: the latest request has not settled yet. Data of the same key stays visible while refetching.
    const tenantFailed = tenantStatus === "unavailable" && !options.skip;
    const status = tenantFailed ? "error" : !enabled ? "idle" : !settled ? "loading" : result.ok ? "success" : "error";
    return {
        data: result.key === scopedKey ? result.data : undefined,
        error: tenantFailed ? tenantError : settled ? result.error : undefined,
        status,
        refetch,
        tenantStatus,
    };
}
/** Explicit user-action mutation. Never retried; rejection stays an error. */
export function useCollegeMutation(send) {
    const { client, tenant, error: tenantError } = useCollege();
    const [state, setState] = useState({ status: "idle" });
    const inFlight = useRef(false);
    const mutate = useCallback(async (args) => {
        if (inFlight.current)
            return; // one send per explicit action; a double click must not submit twice
        if (!tenant) {
            const error = tenantError ?? new Error("Online submissions are not connected for this college yet.");
            setState({ status: "error", error });
            return;
        }
        inFlight.current = true;
        setState({ status: "loading" });
        try {
            const data = await send(client, tenant, args);
            setState({ status: "success", data });
        }
        catch (error) {
            setState({ status: "error", error });
        }
        finally {
            inFlight.current = false;
        }
    }, [client, tenant, tenantError, send]);
    const reset = useCallback(() => setState({ status: "idle" }), []);
    return { ...state, mutate, reset, ready: Boolean(tenant) };
}
/** Any `loadCollegePage` module (notices, departments, faculty, library, gallery, …). */
export function useWebsitePage(module, params = {}, options = {}) {
    const { explorePath } = useCollegeUI();
    const key = `${module}?${JSON.stringify(params)}`;
    return useCollegeQuery(key, (client, tenant) => loadCollegePage(client, tenant, module, params, { explorePath }), options);
}
const contentOptions = (client) => ({ assetBaseUrl: client.assetBaseUrl ?? DEFAULT_ASSET_BASE_URL });
/** Principal / leadership messages (site.principalMessages). */
export function usePrincipalMessages() {
    return useCollegeQuery("principal-messages", async (client, tenant) => normalizeContent((await client.site.principalMessages(tenant.instituteId)).home_principal_message_list, contentOptions(client)));
}
/** Home "about" blocks (site.homeAbout). */
export function useHomeAbout() {
    return useCollegeQuery("home-about", async (client, tenant) => normalizeContent((await client.site.homeAbout(tenant.instituteId)).home_about_list, contentOptions(client)));
}
//# sourceMappingURL=hooks.js.map