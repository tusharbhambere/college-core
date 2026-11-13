import type { ContentItem } from "../index.js";
/**
 * Single-record page (notice, event, application, …): the attached document itself is
 * shown inline — images large with a zoomable lightbox, PDFs embedded, other files as
 * download tiles — beside the date, description and actions (stacked on phones).
 */
export declare function ContentDetail({ item, backHref, backLabel, freshDays, }: {
    item: ContentItem;
    backHref: string;
    backLabel: string;
    /** Show a "New" badge when the record is at most this many days old. */
    freshDays?: number;
}): import("react").JSX.Element;
//# sourceMappingURL=ContentDetail.d.ts.map