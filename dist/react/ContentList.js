"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { Link, useLocalHref } from "./adapters.js";
import { Image } from "./adapters.js";
import { formatDate, isRecent } from "../index.js";
import { cn } from "./cn.js";
import { ContentText } from "./ContentText.js";
import { actionStyles, AttachmentThumb, DateTile, DownloadLink, FileBadge, isPreviewable, itemAttachments, NewBadge, PreviewDialog, PreviewGlyph, useItemWithAttachments, } from "./AttachmentPreview.js";
function ItemLink({ href, className, children }) {
    const target = useLocalHref()(href);
    if (target.startsWith("/")) {
        return (_jsx(Link, { href: target, className: className, children: children }));
    }
    return (_jsx("a", { href: target, className: className, target: "_blank", rel: "noopener noreferrer", children: children }));
}
/** Renders normalized API content as text in Gosavi card styling. Never trusts backend HTML. */
const isoTimestamp = /^\d{4}-\d{2}-\d{2}T/;
export function ContentList({ items, layout = "grid", className, ...options }) {
    if (layout === "people") {
        return (_jsx("ul", { className: cn("grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3", className), children: items.map((item) => (_jsx("li", { className: "min-w-0", children: _jsx(PersonCard, { item: item }) }, item.id))) }));
    }
    return (_jsx("ul", { className: cn(layout === "grid" ? "grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "min-w-0 space-y-4", className), children: items.map((item) => (_jsx("li", { className: "min-w-0", children: _jsx(ContentCard, { item: item, horizontal: layout === "list", ...options }) }, item.id))) }));
}
function PersonCard({ item }) {
    const meta = item.meta?.filter((m) => !isoTimestamp.test(m)).slice(0, 2) ?? [];
    const body = (_jsxs(_Fragment, { children: [item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            _jsx("img", { src: item.image, alt: "", loading: "lazy", className: "h-14 w-14 shrink-0 rounded-full bg-muted-light object-cover" })) : (_jsx("span", { "aria-hidden": true, className: "flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted-light font-semibold text-primary", children: item.title.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "").charAt(0) })), _jsxs("span", { className: "min-w-0 [overflow-wrap:anywhere]", children: [_jsx("span", { className: "block font-semibold text-slate group-hover:text-primary", children: item.title }), meta.map((m) => (_jsx("span", { className: "mt-0.5 block text-xs text-slate-muted", children: m }, m)))] })] }));
    const classes = "group flex h-full min-w-0 items-start gap-3 rounded-lg border border-border bg-white p-3 transition-colors hover:border-primary/50";
    return item.href ? (_jsx(ItemLink, { href: item.href, className: classes, children: body })) : (_jsx("div", { className: classes, children: body }));
}
export function ContentCard({ item: listed, horizontal, preview, freshDays, loadDetails, }) {
    const localHref = useLocalHref();
    const { item, loading } = useItemWithAttachments(listed, Boolean(preview && loadDetails));
    const [previewing, setPreviewing] = useState(false);
    const previewButton = useRef(null);
    const opener = useRef(null);
    const openPreview = (trigger) => {
        opener.current = trigger;
        setPreviewing(true);
    };
    const date = formatDate(item.date);
    const meta = item.meta?.filter((m) => !isoTimestamp.test(m)) ?? [];
    const attachments = itemAttachments(item);
    const files = attachments.filter((a) => item.files?.some((f) => f.url === a.url));
    const previewable = attachments.some(isPreviewable);
    const fresh = freshDays !== undefined && isRecent(item.date, freshDays);
    const detailsHref = item.href && !item.files?.some((f) => f.url === item.href) ? item.href : undefined;
    // Media-forward cards: rows with a photo get a wide thumbnail; documents and dated records get a
    // small file-type or date tile instead of a large grey panel that only holds an icon.
    const media = preview && horizontal;
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = !media && item.image && !imageFailed;
    const photo = media && !loading && attachments.some((a) => a.kind === "image") && !imageFailed;
    // Thumbnails fill the row instead of sizing it, so every row keeps its text height.
    const fill = "absolute inset-0 h-full w-full";
    const tile = "h-16 w-16 rounded-lg ring-1 ring-border sm:h-[4.5rem] sm:w-[4.5rem]";
    const thumb = media ? (loading ? (_jsx("span", { "aria-hidden": true, className: cn(tile, "animate-pulse bg-muted-light") })) : photo ? (_jsx(AttachmentThumb, { attachments: attachments.filter((a) => a.kind === "image"), className: fill, onFail: () => setImageFailed(true) })) : attachments.length ? (_jsx(AttachmentThumb, { attachments: attachments.filter((a) => a.kind !== "image"), compact: true, className: tile })) : (_jsx(DateTile, { date: item.date, compact: true, className: tile }))) : null;
    const thumbFrame = photo
        ? "relative block aspect-[16/10] w-full min-w-0 overflow-hidden border-b border-border bg-muted-light sm:aspect-auto sm:h-full sm:min-h-44 sm:border-e sm:border-b-0"
        : "relative hidden min-w-0 justify-center pt-5 sm:flex";
    return (_jsxs("article", { className: cn("glow-card group relative h-full min-w-0 overflow-hidden rounded-lg border border-border bg-white transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary-deep/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary", horizontal && (showImage || media) && "sm:grid sm:grid-cols-[180px_minmax(0,1fr)]", media && (photo ? "sm:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]" : "sm:grid-cols-[6.5rem_minmax(0,1fr)]")), children: [showImage && (
            // Remote CDN images: plain <img> (static export, unoptimized images).
            // eslint-disable-next-line @next/next/no-img-element
            _jsx("img", { src: item.image, alt: "", loading: "lazy", onError: () => setImageFailed(true), className: cn("w-full bg-muted-light object-cover", horizontal ? "aspect-[16/10] sm:h-full sm:max-h-56 sm:aspect-auto" : "aspect-[16/10]") })), thumb &&
                (previewable ? (_jsxs("button", { type: "button", tabIndex: -1, "aria-hidden": true, onClick: () => openPreview(previewButton.current), className: cn(thumbFrame, "z-10 cursor-zoom-in", !photo && "items-start"), children: [thumb, photo && _jsxs("span", { className: "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-primary-ink/75 py-1.5 text-xs font-semibold text-on-primary opacity-0 transition-opacity group-hover:opacity-100", children: [_jsx(PreviewGlyph, { className: "h-3.5 w-3.5" }), " Quick preview"] })] })) : (_jsx("div", { className: thumbFrame, children: thumb }))), _jsxs("div", { className: "min-w-0 p-4 [overflow-wrap:anywhere] sm:p-5", children: [(date || meta.length > 0 || fresh || (media && attachments.length > 0)) && (_jsxs("p", { className: "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary", children: [fresh && _jsx(NewBadge, {}), date && _jsx("time", { dateTime: item.date, children: date }), media && attachments.length > 0 && (_jsxs("span", { className: "flex flex-wrap gap-1 tracking-normal", children: [[...new Map(attachments.map((a) => [a.badge, a])).values()].map((a) => (_jsx(FileBadge, { attachment: a }, a.badge))), attachments.length > 1 && (_jsxs("span", { className: "text-[11px] font-medium normal-case text-slate-muted", children: [attachments.length, " files"] }))] })), meta.slice(0, 3).map((m) => (_jsx("span", { className: "min-w-0 normal-case tracking-normal text-slate-muted", children: m }, m)))] })), _jsx("h3", { className: "mt-1 text-base font-semibold text-slate", children: item.href ? (_jsx(ItemLink, { href: item.href, className: cn("hover:text-primary", !item.children?.length && "after:absolute after:inset-0 after:rounded-lg"), children: item.title })) : (item.title) }), item.description && (_jsx(ContentText, { text: item.description, linkUrls: !item.href, className: cn("mt-2", item.href && (media ? "line-clamp-3" : "line-clamp-4")) })), media ? ((previewable || detailsHref || (attachments.length > 0 && !previewable)) && (_jsxs("div", { className: "relative z-10 mt-4 flex flex-wrap gap-2", children: [previewable && (_jsxs("button", { ref: previewButton, type: "button", onClick: (e) => openPreview(e.currentTarget), className: actionStyles.secondary, children: [_jsx(PreviewGlyph, {}), " Preview", _jsxs("span", { className: "sr-only", children: [": ", item.title] })] })), !previewable && attachments[0] && (_jsxs(DownloadLink, { attachment: attachments[0], children: ["Download ", attachments[0].badge] })), detailsHref && (_jsxs(ItemLink, { href: detailsHref, className: actionStyles.quiet, children: ["View details ", _jsx("span", { "aria-hidden": true, children: "\u2192" }), _jsxs("span", { className: "sr-only", children: [": ", item.title] })] }))] }))) : ((files.length > 0 || item.href) && (_jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold", children: [files.map((file) => (_jsxs("span", { className: "inline-flex min-w-0 items-center gap-1.5", children: [file.badge !== "File" && _jsx(FileBadge, { attachment: file }), _jsxs("a", { href: file.url, target: "_blank", rel: "noopener noreferrer", className: "relative z-10 inline-flex min-h-11 min-w-0 items-center text-accent-foreground hover:underline", children: [files.length === 1 && file.name === item.title ? "Open attachment" : file.name, " ", _jsx("span", { "aria-hidden": true, children: "\u2197" })] }), isPreviewable(file) && (_jsxs("button", { type: "button", onClick: (e) => openPreview(e.currentTarget), className: "relative z-10 inline-flex min-h-11 items-center gap-1 rounded px-1.5 text-xs font-semibold text-primary hover:bg-muted-light", children: [_jsx(PreviewGlyph, { className: "h-3.5 w-3.5" }), " Preview", _jsxs("span", { className: "sr-only", children: [": ", file.name] })] }))] }, file.url))), detailsHref && (item.children?.length ? (_jsxs(ItemLink, { href: detailsHref, className: "relative z-10 inline-flex min-h-11 items-center text-primary hover:underline", children: ["View details ", _jsx("span", { "aria-hidden": true, children: "\u2192" }), _jsxs("span", { className: "sr-only", children: [": ", item.title] })] })) : _jsxs("span", { "aria-hidden": true, className: "inline-flex min-h-11 items-center gap-1 text-primary", children: ["View details ", _jsx("span", { children: "\u2192" })] }))] }))), item.children && item.children.length > 0 && _jsx(NestedContent, { items: item.children })] }), previewing && (_jsx(PreviewDialog, { title: item.title, date: item.date, attachments: media ? attachments : files.length ? files : attachments, detailsHref: detailsHref && localHref(detailsHref)?.startsWith("/") ? localHref(detailsHref) : undefined, onClose: () => setPreviewing(false), returnFocusRef: opener }))] }));
}
/** CMS document trees can be many levels deep; every leaf remains reachable. */
function NestedContent({ items }) {
    return _jsx("ul", { className: "mt-3 min-w-0 space-y-3 border-s border-border ps-3 text-sm sm:ps-4", children: items.map(item => _jsx("li", { className: "min-w-0 [overflow-wrap:anywhere]", children: item.children?.length ? _jsxs("details", { children: [_jsx("summary", { className: "min-h-11 cursor-pointer py-2 font-semibold text-primary", children: item.title }), item.description && _jsx(ContentText, { text: item.description }), item.meta?.length ? _jsx("p", { className: "my-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-muted", children: item.meta.map(m => _jsx("span", { children: m }, m)) }) : null, item.image && _jsx(Image, { src: item.image, alt: "", width: 800, height: 600, unoptimized: true, className: "my-2 h-auto max-h-80 max-w-full object-contain" }), item.files?.map(f => _jsx("a", { href: f.url, target: "_blank", rel: "noopener noreferrer", className: "me-4 inline-block py-2 text-primary underline", children: f.label }, f.url)), _jsx(NestedContent, { items: item.children })] }) : _jsxs(_Fragment, { children: [item.href ? _jsx(ItemLink, { href: item.href, className: "inline-block py-2 font-semibold text-primary hover:underline", children: item.title }) : _jsx("p", { className: "font-semibold text-slate", children: item.title }), item.description && _jsx(ContentText, { text: item.description }), item.meta?.length ? _jsx("p", { className: "my-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-muted", children: item.meta.map(m => _jsx("span", { children: m }, m)) }) : null, item.image && _jsx(Image, { src: item.image, alt: "", width: 800, height: 600, unoptimized: true, className: "my-2 h-auto max-h-80 max-w-full object-contain" }), item.files?.map(f => _jsx("a", { href: f.url, target: "_blank", rel: "noopener noreferrer", className: "me-4 inline-block py-2 text-primary underline", children: f.label }, f.url))] }) }, item.id)) });
}
//# sourceMappingURL=ContentList.js.map