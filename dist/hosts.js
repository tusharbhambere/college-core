const defaultPreviewSuffixes = ['.web.app', '.firebaseapp.com'];
/** True for local development and hosting preview domains that have no backend mapping. */
export function isPreviewHost(hostname, previewSuffixes = defaultPreviewSuffixes) {
    const host = hostname.trim().toLowerCase().replace(/\.$/, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || previewSuffixes.some((suffix) => host.endsWith(suffix));
}
/**
 * Host used for tenant lookup. A real custom domain always selects its own college;
 * the override applies only on localhost and preview domains.
 */
export function resolveCollegeHost(hostname, options = {}) {
    const host = hostname.trim().toLowerCase().replace(/\.$/, '');
    if (isPreviewHost(host, [...defaultPreviewSuffixes, ...(options.previewSuffixes ?? [])]))
        return (options.override ?? '').trim().toLowerCase();
    return options.aliases?.[host] ?? host;
}
export const DEFAULT_FAVICON_FILES = [
    ['icon', 'icon-32.png', 32],
    ['icon', 'icon-192.png', 192],
    ['apple-touch-icon', 'apple-touch-icon.png', 180],
];
/**
 * Inline script that adds the served college's icons before first paint. Static exports serve
 * one HTML file to every domain, so the choice is made by hostname with `resolveCollegeHost` rules.
 */
export function faviconScript(options) {
    const data = JSON.stringify({
        hosts: options.hosts, aliases: options.aliases ?? {}, override: (options.override ?? '').trim().toLowerCase(),
        files: options.files ?? DEFAULT_FAVICON_FILES, base: options.basePath ?? '/favicons',
    });
    return `(function(d){var h=location.hostname.trim().toLowerCase().replace(/\\.$/,"");` +
        `h=/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$|\\.web\\.app$|\\.firebaseapp\\.com$/.test(h)?d.override:(d.aliases[h]||h);` +
        `if(d.hosts.indexOf(h)<0)return;d.files.forEach(function(f){var l=document.createElement("link");` +
        `l.rel=f[0];l.href=d.base+"/"+h+"/"+f[1];l.setAttribute("sizes",f[2]+"x"+f[2]);l.type="image/png";l.setAttribute("data-college-icon","");document.head.appendChild(l)})})(${data})`;
}
//# sourceMappingURL=hosts.js.map