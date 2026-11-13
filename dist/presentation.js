import { CollegeApiError, getApiResponseMessage } from './errors.js';
import { plainText } from './helpers.js';
/* ── Text ──────────────────────────────────────────────────────────────── */
const placeholder = /^(?:require information|n\/a|na|-|\.+|null|undefined)$/i;
const cmsReference = /^(?:[0-9a-f]{20,32}|require information|n\/a|na|null|undefined|[-.]+)$/i;
/** Plain text with backend placeholder copy ("Require information", "N/A", "-") removed. */
export function cleanText(value) {
    const text = plainText(value).trim();
    return placeholder.test(text) ? '' : text;
}
/** CMS references and placeholder values are not readable public content. */
export function contentText(value) {
    const text = value?.trim() ?? '';
    return cmsReference.test(text) ? '' : text;
}
/** Splits "• a • b" / multi-line statements into list items. */
export function splitStatement(value) {
    return value
        .split(/\n|•|·/)
        .map((part) => part.replace(/^[\s\-–*]+/, '').trim())
        .filter(Boolean);
}
/** Keep real labels, contact details and documents; omit empty CMS slots recursively. */
export function presentableItems(items) {
    return items.flatMap((item) => {
        const title = contentText(item.title);
        const description = contentText(item.description);
        const meta = item.meta?.map(contentText).filter(Boolean);
        const children = item.children ? presentableItems(item.children) : undefined;
        const hasContent = description || item.image || item.files?.length || item.href || meta?.length || children?.length;
        if (!hasContent && (!title || /^(?:information|department contacts|library contacts)$/i.test(title) || item.children?.length))
            return [];
        return [{ ...item, title: title || 'Information', description, meta, children }];
    });
}
/** Depth-first search through nested content. */
export function findContentItem(items, id) {
    for (const item of items) {
        if (item.id === id)
            return item;
        const child = findContentItem(item.children ?? [], id);
        if (child)
            return child;
    }
    return undefined;
}
/* ── Errors ────────────────────────────────────────────────────────────── */
/** Only explicit unpublished/empty API responses qualify; transport failures remain retryable. */
export function isUnpublishedPage(error, module) {
    if (!(error instanceof CollegeApiError) || !['api', 'response'].includes(error.kind))
        return false;
    const response = error.details.response;
    const message = getApiResponseMessage(response) ?? '';
    if (['admission', 'admissions'].includes(module)) {
        return response?.access === true && /^Admission site info is not updated\b/i.test(message);
    }
    if (module === 'scholarships') {
        return /^No\s+scholar\s*ship\s*[.!]?$/i.test(message)
            && Array.isArray(response?.all_scholar) && response.all_scholar.length === 0;
    }
    // "No Document Available", "No images found", …: an explicit empty answer, not a failure to retry.
    const status = error.details.status;
    if (typeof status === 'number' && status >= 500)
        return false;
    return /^No\s+[\p{L} ]{1,40}\s+(?:available|found)\s*[.!]?$/iu.test(message);
}
export function formatDate(value) {
    if (!value)
        return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
/** User-facing message; never claims success for a failed request. */
export function errorMessage(error) {
    if (error instanceof CollegeApiError) {
        if (error.kind === 'timeout')
            return 'The college server took too long to respond. Please try again.';
        if (error.kind === 'network')
            return 'Could not reach the college server. Check your connection and try again.';
        const message = getApiResponseMessage(error.details.response);
        if (message)
            return message;
        if (error.kind === 'aborted')
            return 'The request was cancelled. Please try again.';
        if (error.kind === 'json' || error.kind === 'response')
            return 'The college server returned an incomplete or unreadable response. Please try again later.';
        if (error.kind === 'http') {
            const status = error.details.status;
            if (status === 401 || status === 403)
                return 'You do not have permission to access this information. Please contact the college office.';
            if (status === 404)
                return 'The requested information is not available. Please contact the college office.';
            if (status === 408 || status === 504)
                return 'The college server took too long to respond. Please try again.';
            if (status === 429)
                return 'Too many requests. Please wait a moment and try again.';
            if (status !== undefined && status >= 500)
                return 'The college server is temporarily unavailable. Please try again later.';
            return 'The college server could not complete this request. Please try again.';
        }
        if (error.message.trim())
            return error.message.trim();
    }
    if (error instanceof Error && error.message.trim())
        return error.message.trim();
    return 'Something went wrong while contacting the college server.';
}
const kindByExtension = {
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', avif: 'image', bmp: 'image', svg: 'image', jfif: 'image',
    pdf: 'pdf',
    doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc', txt: 'doc',
    xls: 'sheet', xlsx: 'sheet', csv: 'sheet', ods: 'sheet',
    ppt: 'slides', pptx: 'slides', odp: 'slides',
    zip: 'archive', rar: 'archive', '7z': 'archive',
    mp4: 'video', webm: 'video', mov: 'video', avi: 'video', mkv: 'video',
    mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio',
};
/** Lower-case extension of a URL path or file name ('' when there is none). */
function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    }
    catch {
        return value;
    }
}
export function fileExtension(value) {
    if (!value)
        return '';
    let path = value;
    try {
        path = new URL(value, 'https://college.invalid').pathname;
    }
    catch {
        /* plain file name */
    }
    const name = safeDecode(path.split('/').pop() ?? '');
    const match = /\.([a-z0-9]{1,5})$/i.exec(name);
    return match ? match[1].toLowerCase() : '';
}
/** File type from the URL extension, falling back to the label (CDN keys can be opaque). */
export function fileKind(url, label) {
    return kindByExtension[fileExtension(url)] ?? kindByExtension[fileExtension(label)] ?? 'file';
}
/** Short badge text for a file: 'PDF', 'JPG', 'DOCX', … */
export function fileBadge(url, label) {
    const ext = fileExtension(url) || fileExtension(label);
    if (ext === 'jpeg' || ext === 'jfif')
        return 'JPG';
    if (ext)
        return ext.toUpperCase();
    return fileKind(url, label) === 'image' ? 'Image' : 'File';
}
const generic = /^(?:img|image|photo|pic|picture|scan|unnamed|untitled|download|document|file|attachment|view document|image cropper)?[\s\d()_-]*$/i;
/**
 * Human-readable attachment name: strips upload timestamps / hash prefixes, the
 * extension and underscores — '1792646577581_WhatsApp_Image_2026-10-22_at_10.46.40_AM.jpeg'
 * → 'WhatsApp Image 2026-10-22 at 10.46.40 AM'. Returns `fallback` for meaningless names
 * ('image001 (2)', '1757308325113', 'image_cropper_1741101618995').
 */
export function fileDisplayName(label, url, fallback = 'Attachment') {
    let name = (label ?? '').trim();
    if (!name || /^https?:/i.test(name))
        name = safeDecode(url.split(/[?#]/)[0].split('/').pop() ?? '');
    name = name
        .replace(/^[0-9a-f]{24,}-/i, '') // storage hash
        .replace(/^(?:qv_)?\d{10,}[_\s-]+/i, '') // upload timestamp
        .replace(/\.[a-z0-9]{1,5}$/i, '')
        .replace(/[_+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return !name || generic.test(name) || /^[0-9a-f-]{16,}$/i.test(name) ? fallback : name;
}
/** True when the date is in the past `days` days (never for future dates). */
export function isRecent(value, days, now = Date.now()) {
    if (!value)
        return false;
    const time = new Date(value).getTime();
    if (Number.isNaN(time))
        return false;
    return time <= now + 60_000 && now - time <= days * 86_400_000;
}
//# sourceMappingURL=presentation.js.map