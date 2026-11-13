import type { ContentItem } from "../index.js";
type CardOptions = {
    /** Media-forward list rows: attachment thumbnail, file-type badges and a quick-preview dialog. */
    preview?: boolean;
    /** "New" badge for records at most this many days old (omit for dated-in-future content such as events). */
    freshDays?: number;
    /** List endpoints that omit attachments (notices): read each row's detail record for its files. */
    loadDetails?: boolean;
};
export declare function ContentList({ items, layout, className, ...options }: {
    items: ContentItem[];
    /** "people": compact avatar rows for staff directories. */
    layout?: "grid" | "list" | "people";
    className?: string;
} & CardOptions): import("react").JSX.Element;
export declare function ContentCard({ item: listed, horizontal, preview, freshDays, loadDetails, }: {
    item: ContentItem;
    horizontal?: boolean;
} & CardOptions): import("react").JSX.Element;
export {};
//# sourceMappingURL=ContentList.d.ts.map