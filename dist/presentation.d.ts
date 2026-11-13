import type { ContentItem } from './website.js';
/** Plain text with backend placeholder copy ("Require information", "N/A", "-") removed. */
export declare function cleanText(value: unknown): string;
/** CMS references and placeholder values are not readable public content. */
export declare function contentText(value?: string): string;
/** Splits "• a • b" / multi-line statements into list items. */
export declare function splitStatement(value: string): string[];
/** Keep real labels, contact details and documents; omit empty CMS slots recursively. */
export declare function presentableItems(items: ContentItem[]): ContentItem[];
/** Depth-first search through nested content. */
export declare function findContentItem(items: readonly ContentItem[], id: string): ContentItem | undefined;
/** Only explicit unpublished/empty API responses qualify; transport failures remain retryable. */
export declare function isUnpublishedPage(error: unknown, module: string): boolean;
export declare function formatDate(value?: string): string | undefined;
/** User-facing message; never claims success for a failed request. */
export declare function errorMessage(error: unknown): string;
export type FileKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'archive' | 'video' | 'audio' | 'file';
export declare function fileExtension(value?: string): string;
/** File type from the URL extension, falling back to the label (CDN keys can be opaque). */
export declare function fileKind(url: string, label?: string): FileKind;
/** Short badge text for a file: 'PDF', 'JPG', 'DOCX', … */
export declare function fileBadge(url: string, label?: string): string;
/**
 * Human-readable attachment name: strips upload timestamps / hash prefixes, the
 * extension and underscores — '1792646577581_WhatsApp_Image_2026-10-22_at_10.46.40_AM.jpeg'
 * → 'WhatsApp Image 2026-10-22 at 10.46.40 AM'. Returns `fallback` for meaningless names
 * ('image001 (2)', '1757308325113', 'image_cropper_1741101618995').
 */
export declare function fileDisplayName(label: string | undefined, url: string, fallback?: string): string;
/** True when the date is in the past `days` days (never for future dates). */
export declare function isRecent(value: string | undefined, days: number, now?: number): boolean;
//# sourceMappingURL=presentation.d.ts.map