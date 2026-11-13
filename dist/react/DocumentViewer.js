"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { assetUrl, DEFAULT_ASSET_BASE_URL } from "../index.js";
import { useCollege } from "./CollegeProvider.js";
import { LiveEmpty } from "./LiveState.js";
import { ContentDetail } from "./ContentDetail.js";
/**
 * Legacy PDF / flipbook links (`/explore?module=viewer&file=…`) on static Hosting:
 * the file is shown inline by type — PDFs embedded, images large with zoom, anything
 * else as a download tile — with open, download and share actions.
 */
export function DocumentViewer({ file }) {
    const { client } = useCollege();
    const url = assetUrl(file, client.assetBaseUrl ?? DEFAULT_ASSET_BASE_URL);
    if (!url)
        return _jsx(LiveEmpty, { children: "This document link is unavailable." });
    const raw = url.split(/[?#]/)[0].split("/").pop() ?? "";
    let label = raw;
    try {
        label = decodeURIComponent(raw);
    }
    catch {
        /* keep the encoded name */
    }
    return (_jsx(ContentDetail, { item: { id: url, title: "College document", description: "", files: [{ label, url }] }, backHref: "/", backLabel: "Back to home" }));
}
//# sourceMappingURL=DocumentViewer.js.map