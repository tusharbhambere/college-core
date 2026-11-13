const controlCharacters = /[\u0000-\u001f\u007f-\u009f]/;
const encodedControlCharacters = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;
const scheme = /^[a-z][a-z\d+.-]*:/i;
/** Accepts navigable URLs without depending on a browser or DOM. */
export function safeUrl(value, options = {}) {
    if (typeof value !== 'string' || controlCharacters.test(value))
        return undefined;
    const text = value.trim();
    if (!text || text.includes('\\') || text.startsWith('//') || encodedControlCharacters.test(text))
        return undefined;
    if (scheme.test(text)) {
        let parsed;
        try {
            parsed = new URL(text);
        }
        catch {
            return undefined;
        }
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.username || parsed.password ? undefined : parsed.href;
        }
        if (options.allowMailto && parsed.protocol === 'mailto:' && parsed.pathname)
            return parsed.href;
        if (options.allowTel && parsed.protocol === 'tel:' && parsed.pathname)
            return parsed.href;
        return undefined;
    }
    if (options.baseUrl !== undefined) {
        const base = safeUrl(options.baseUrl);
        if (!base || !/^https?:/i.test(base))
            return undefined;
        try {
            return new URL(text, base).href;
        }
        catch {
            return undefined;
        }
    }
    // Preserve relative navigation when no base is supplied, including subdirectory sites.
    return text.replace(/ /g, '%20');
}
/** Resolves a storage key beneath its CDN base; absolute HTTP(S) assets remain absolute. */
export function assetUrl(key, baseUrl) {
    if (typeof key !== 'string' || controlCharacters.test(key))
        return undefined;
    const text = key.trim();
    if (!text || text.includes('\\') || text.startsWith('//') || encodedControlCharacters.test(text))
        return undefined;
    if (scheme.test(text))
        return /^https?:/i.test(text) ? safeUrl(text) : undefined;
    const base = safeUrl(baseUrl);
    if (!base || !/^https?:/i.test(base))
        return undefined;
    // Storage keys must not escape the configured base path, even through encoded dot segments.
    const keyPath = text.replace(/^\/+/, '');
    if (!keyPath)
        return undefined;
    const segments = keyPath.split('/');
    try {
        if (segments.some((segment) => {
            const decoded = decodeURIComponent(segment);
            return decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\');
        }))
            return undefined;
        const parsedBase = new URL(base);
        parsedBase.search = '';
        parsedBase.hash = '';
        if (!parsedBase.pathname.endsWith('/'))
            parsedBase.pathname += '/';
        const encodedKey = segments.map((segment) => encodeURIComponent(decodeURIComponent(segment))).join('/');
        return new URL(encodedKey, parsedBase).href;
    }
    catch {
        return undefined;
    }
}
const namedEntities = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', copy: '©', reg: '®',
};
/** Extracts a plain-text preview. Render the result as text, never as trusted HTML. */
export function plainText(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return String(value);
    if (typeof value !== 'string')
        return '';
    return value
        .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
        if (name.startsWith('#')) {
            const codePoint = name[1]?.toLowerCase() === 'x'
                ? Number.parseInt(name.slice(2), 16)
                : Number.parseInt(name.slice(1), 10);
            return codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
                ? String.fromCodePoint(codePoint) : ' ';
        }
        return namedEntities[name.toLowerCase()] ?? entity;
    })
        .replace(/\s+/g, ' ')
        .trim();
}
function positiveInteger(value, fallback) {
    if (typeof value !== 'number' && typeof value !== 'string')
        return fallback;
    if (typeof value === 'string' && !value.trim())
        return fallback;
    const parsed = Number(value);
    return Number.isSafeInteger(Math.floor(parsed)) && parsed >= 1 ? Math.floor(parsed) : fallback;
}
/** Matches the public API's default page and limit without silently capping list sizes. */
export function normalizePagination(page = 1, limit = 10) {
    return { page: positiveInteger(page, 1), limit: positiveInteger(limit, 10) };
}
export function paginate(items, page = 1, limit = 10) {
    const pagination = normalizePagination(page, limit);
    const start = (pagination.page - 1) * pagination.limit;
    return {
        ...pagination,
        items: items.slice(start, start + pagination.limit),
        total: items.length,
        totalPages: Math.ceil(items.length / pagination.limit),
    };
}
const moduleKeys = [
    'home', 'about', 'academic_course', 'department', 'admission', 'new_admission',
    'examination', 'rnd', 'iqac', 'committee', 'notice', 'alumni', 'library',
    'contact_us', 'image_gallery', 'video_gallery', 'events',
];
const moduleAliases = { alumni: ['alumini'], rnd: ['rnd_cell'], events: ['event'] };
/** Missing switches are enabled; only explicit false disables a module. */
export function enabledModules(profile) {
    const legacy = profile.website_active_tab ?? {};
    const current = profile.landing_control?.tab_toggle ?? {};
    const keys = new Set([...moduleKeys, ...Object.keys(legacy), ...Object.keys(current)]);
    const result = {};
    for (const key of keys) {
        const candidates = [key, ...(moduleAliases[key] ?? [])];
        const currentKey = candidates.find((candidate) => typeof current[candidate] === 'boolean');
        const legacyKey = candidates.find((candidate) => typeof legacy[candidate] === 'boolean');
        result[key] = currentKey !== undefined ? current[currentKey] !== false
            : legacyKey !== undefined ? legacy[legacyKey] !== false : true;
    }
    // Existing menus place these sections beneath the IQAC switch.
    for (const key of ['naac', 'aqar', 'nirf', 'institutional', 'student_corner', 'special']) {
        result[key] = result.iqac !== false && current[key] !== false && legacy[key] !== false;
    }
    return result;
}
//# sourceMappingURL=helpers.js.map