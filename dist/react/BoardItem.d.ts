import type { ContentItem } from "../index.js";
/**
 * Compact home-board row: date chip, title (whole row links to the record) and — when the
 * record has an image or PDF — a small thumbnail that opens the quick-preview dialog.
 */
export declare function BoardItem({ item: listed, fallbackHref, loadDetails, freshDays, }: {
    item: ContentItem;
    fallbackHref: string;
    /** Read the record's detail for attachments the list endpoint omits (notices). */
    loadDetails?: boolean;
    freshDays?: number;
}): import("react").JSX.Element;
//# sourceMappingURL=BoardItem.d.ts.map