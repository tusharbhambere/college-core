import type { ContentItem } from "../index.js";
import { type FileKind } from "../index.js";
export type Attachment = {
    url: string;
    /** Human-readable name (upload prefixes, underscores and extension removed). */
    name: string;
    kind: FileKind;
    /** Short type label: "PDF", "JPG", … */
    badge: string;
};
/** Every file of an item (attachments first, then its cover image), de-duplicated by URL. */
export declare function itemAttachments(item: ContentItem): Attachment[];
export declare const isPreviewable: (a: Attachment) => boolean;
export declare const kindLabel: (kind: FileKind) => string;
/**
 * List endpoints (e.g. notices) omit attachments; when `enabled`, the item's detail
 * record is read once and its files/image are merged in. Shares the detail page's query key.
 */
export declare function useItemWithAttachments(item: ContentItem, enabled: boolean): {
    item: ContentItem;
    loading: boolean;
};
export declare function FileIcon({ kind, className }: {
    kind: FileKind;
    className?: string;
}): import("react").JSX.Element;
export declare function FileBadge({ attachment, className }: {
    attachment: Attachment;
    className?: string;
}): import("react").JSX.Element;
export declare function NewBadge({ className }: {
    className?: string;
}): import("react").JSX.Element;
export declare const actionStyles: {
    primary: string;
    secondary: string;
    quiet: string;
};
export declare function ExternalGlyph(): import("react").JSX.Element;
export declare function DownloadLink({ attachment, className, children }: {
    attachment: Attachment;
    className?: string;
    children?: React.ReactNode;
}): import("react").JSX.Element;
export declare function OpenLink({ attachment, className, children }: {
    attachment: Attachment;
    className?: string;
    children?: React.ReactNode;
}): import("react").JSX.Element;
/** Native share sheet where available (phones), plus copy-link everywhere. */
export declare function ShareActions({ title, url, className }: {
    title: string;
    url?: string;
    className?: string;
}): import("react").JSX.Element;
/** Card thumbnail: the first image, else a file-type tile. */
export declare function AttachmentThumb({ attachments, className, compact, onFail }: {
    attachments: Attachment[];
    className?: string;
    compact?: boolean;
    onFail?: () => void;
}): import("react").JSX.Element | null;
/** Calendar-style tile for records without any media, keeping list rows aligned. */
export declare function DateTile({ date, className, compact }: {
    date?: string;
    className?: string;
    compact?: boolean;
}): import("react").JSX.Element;
/**
 * Embedded PDF from the `sm` breakpoint up. Phones (whose browsers mostly cannot show a PDF
 * inline, or show only its first page) get an "Open PDF" tile instead; desktop browsers
 * without a PDF viewer fall back to the same tile through <object>'s fallback content.
 */
export declare function PdfFrame({ attachment, title, className }: {
    attachment: Attachment;
    title: string;
    className?: string;
}): import("react").JSX.Element;
/** Download tile for files that cannot be displayed inline. */
export declare function FileTile({ attachment, note, className }: {
    attachment: Attachment;
    note?: string;
    className?: string;
}): import("react").JSX.Element;
/**
 * Native modal <dialog>: the page behind is inert, Tab stays inside, Esc / backdrop /
 * close button dismiss it, and focus returns to the control that opened it.
 */
export declare function PreviewDialog({ title, date, attachments, detailsHref, onClose, returnFocusRef, }: {
    title: string;
    date?: string;
    attachments: Attachment[];
    detailsHref?: string;
    onClose: () => void;
    /** Control to focus after closing (Safari does not focus buttons on click, so activeElement is unreliable). */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
}): import("react").JSX.Element;
/** Eye icon used by "Preview" triggers. */
export declare function PreviewGlyph({ className }: {
    className?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=AttachmentPreview.d.ts.map