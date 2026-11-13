"use client";

import { useEffect, useRef } from "react";
import { assetUrl, DEFAULT_ASSET_BASE_URL, plainText } from "../index.js";
import { useCollegeQuery } from "./hooks.js";
import { useCollege } from "./CollegeProvider.js";


/** The current college's published flash notice, with native dialog keyboard/focus handling. */
export function TenantFlashNotice() {
  const dialog = useRef<HTMLDialogElement>(null);
  const query = useCollegeQuery("flash-notice", async (client, tenant) => {
    const { institute } = await client.site.opener(tenant.instituteId);
    const notices = institute?.site_flash_notice;
    return Array.isArray(notices) ? notices[0] : undefined;
  });
  const notice = query.data;
  const { client } = useCollege();
  const image = assetUrl(notice?.notice_image, client.assetBaseUrl ?? DEFAULT_ASSET_BASE_URL);
  useEffect(() => {
    if (image && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [image]);
  if (!image) return null;
  return <dialog ref={dialog} aria-label="College flash notice" className="m-auto max-h-[90dvh] w-[min(92vw,640px)] overflow-y-auto rounded-xl border border-border bg-white p-4 text-slate shadow-xl backdrop:bg-black/60">
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold">{plainText(notice?.notice_title) || "College notice"}</h2>
      <button type="button" onClick={() => dialog.current?.close()} aria-label="Close college notice" className="min-h-11 rounded-md border border-border px-4">Close</button>
    </div>
    <a href={image} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={plainText(notice?.notice_title) || "Published college notice. Open the original attachment for details."} className="h-auto w-full" />
    </a>
  </dialog>;
}
