"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "./adapters.js";
import type { ContentItem } from "../index.js";
import { useWebsitePage } from "./hooks.js";
import { PageHero } from "./PageHero.js";
import { Section } from "./Section.js";
import { Lightbox } from "./Lightbox.js";
import { cn } from "./cn.js";
import { LiveEmpty, LiveError } from "./LiveState.js";
import { isUnpublishedPage } from "../index.js";

/**
 * Photo and video galleries. The CMS nests them as academic year → album → media and
 * albums carry no cover, so each album reads its own media: the first photo becomes the
 * cover and albums with nothing in them are left out instead of showing a blank tile.
 */
type GalleryModule = "gallery" | "videos";

const ALL = "all-gallery";
const labels = {
  gallery: { page: "Photo gallery", all: "All photographs", one: "photo", many: "photos" },
  videos: { page: "Video gallery", all: "All videos", one: "video", many: "videos" },
} as const;

const queryOf = (href?: string) => new URL(href ?? "", "https://college.invalid").searchParams;
const galleryHref = (module: GalleryModule, params: Record<string, string | undefined>) => {
  const search = new URLSearchParams({ module });
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  return `/explore?${search}`;
};

/* ── Media model ─────────────────────────────────────────────────────────── */

type Photo = { id: string; src: string };
type Video = { id: string; url: string; thumb?: string; embed?: string; source: string };

function photosOf(items: ContentItem[]): Photo[] {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const src = item.image ?? item.href;
    if (!src || seen.has(src)) return [];
    seen.add(src);
    return [{ id: item.id, src }];
  });
}

function youtubeId(url: URL): string | undefined {
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || undefined;
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return undefined;
  if (url.pathname === "/watch") return url.searchParams.get("v") ?? undefined;
  return url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/)?.[1];
}

function videoOf(item: ContentItem): Video | undefined {
  if (!item.href) return undefined;
  let url: URL;
  try {
    url = new URL(item.href);
  } catch {
    return undefined;
  }
  const yt = youtubeId(url);
  if (yt) return { id: item.id, url: item.href, source: "YouTube", thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, embed: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0` };
  const drive = url.hostname === "drive.google.com" ? url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get("id") : undefined;
  if (drive) return { id: item.id, url: item.href, source: "Google Drive", thumb: `https://drive.google.com/thumbnail?id=${drive}&sz=w640`, embed: `https://drive.google.com/file/d/${drive}/preview` };
  return { id: item.id, url: item.href, source: url.hostname.replace(/^www\./, "") };
}

function videosOf(items: ContentItem[]): Video[] {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const video = videoOf(item);
    if (!video || seen.has(video.url)) return [];
    seen.add(video.url);
    return [video];
  });
}
const countOf = (module: GalleryModule, items: ContentItem[]) => (module === "gallery" ? photosOf(items).length : videosOf(items).length);
const plural = (module: GalleryModule, n: number) => `${n} ${n === 1 ? labels[module].one : labels[module].many}`;

/** Starts a read once the element is near the viewport, so long album lists stay light. */
function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "600px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near] as const;
}

/* ── Shared bits ─────────────────────────────────────────────────────────── */

function PlayBadge({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex items-center justify-center rounded-full bg-white/95 text-primary-dark shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110", className)}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="ms-0.5 h-1/2 w-1/2"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>
    </span>
  );
}

/** Remote image that removes itself (via `onFail`) instead of leaving a broken frame. */
function Thumb({ src, className, onFail }: { src: string; className?: string; onFail?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {/* Shimmer while the photo downloads (needs a positioned parent), never a flat grey box. */}
      {!loaded && <span aria-hidden className="skeleton-shimmer absolute inset-0" />}
      {/* Remote CDN images: plain <img> (static export, unoptimized images). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true);
        }}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={onFail}
        className={cn("relative h-full w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.04]", loaded ? "opacity-100" : "opacity-0", className)}
      />
    </>
  );
}

function GridSkeleton({ count = 6, aspect = "aspect-[4/3]", label }: { count?: number; aspect?: string; label: string }) {
  return (
    <div role="status" aria-live="polite" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("skeleton-shimmer rounded-lg", aspect)} />
      ))}
    </div>
  );
}

/* ── Year → albums ───────────────────────────────────────────────────────── */

function AlbumCard({ module, album, bid, onCount }: { module: GalleryModule; album: ContentItem; bid: string; onCount: (id: string, n: number) => void }) {
  const [ref, near] = useNearViewport<HTMLLIElement>();
  const id = album.id === ALL ? "all" : album.id;
  const query = useWebsitePage(module, { id, bid }, { skip: !near });
  const [failed, setFailed] = useState<string[]>([]);
  const items = query.data?.items ?? [];
  const count = countOf(module, items);
  const settled = query.status === "success" || query.status === "error";

  useEffect(() => {
    if (settled) onCount(album.id, query.status === "success" ? count : 0);
  }, [settled, query.status, count, album.id, onCount]);

  const covers = (module === "gallery" ? photosOf(items).map((p) => p.src) : videosOf(items).flatMap((v) => (v.thumb ? [v.thumb] : [])))
    .filter((src) => !failed.includes(src))
    .slice(0, 3);
  // Hidden once known to be empty or unreadable: an album without media is not worth a tile.
  if (settled && count === 0) return null;
  if (!settled) {
    return (
      <li ref={ref} className="min-w-0" aria-hidden>
        <div className="skeleton-shimmer aspect-[4/3] rounded-lg" />
        <div className="skeleton-shimmer mt-3 h-4 w-3/4 rounded" />
      </li>
    );
  }

  const href = galleryHref(module, { id, bid });
  return (
    <li ref={ref} className="min-w-0">
      <Link href={href} className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
        <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-primary-ink shadow-sm ring-1 ring-border transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-primary-deep/15">
          {covers.length > 0 ? (
            <span className={cn("grid h-full gap-0.5", covers.length === 2 && "grid-cols-2", covers.length >= 3 && "grid-cols-[2fr_1fr] grid-rows-2")}>
              {covers.map((src, i) => (
                <span key={src} className={cn("relative overflow-hidden bg-muted-light", covers.length >= 3 && i === 0 && "row-span-2")}>
                  <Thumb src={src} onFail={() => setFailed((f) => [...f, src])} />
                </span>
              ))}
            </span>
          ) : (
            // Media exist but offer no preview image (e.g. links to other video hosts).
            <span className="flex h-full items-center justify-center bg-gradient-to-br from-primary-dark to-primary-ink">
              <PlayBadge className="h-14 w-14" />
            </span>
          )}
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-ink/70 via-transparent to-transparent" />
          {module === "videos" && covers.length > 0 && <PlayBadge className="absolute start-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2" />}
          <span className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {plural(module, count)}
          </span>
        </span>
        <span className="mt-3 block text-[15px] font-semibold leading-snug text-slate line-clamp-2 [overflow-wrap:anywhere] group-hover:text-primary">
          {album.title}
        </span>
      </Link>
    </li>
  );
}

function YearNav({ module, years, active }: { module: GalleryModule; years: { bid: string; title: string }[]; active: string }) {
  if (years.length < 2) return null;
  return (
    <nav aria-label="Academic year" className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {years.map((year) => {
          const current = year.bid === active;
          return (
            <li key={year.bid}>
              <Link
                href={galleryHref(module, { bid: year.bid })}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors",
                  current ? "border-primary bg-primary text-on-primary shadow-md shadow-primary/20" : "border-border bg-white text-slate hover:border-primary/50 hover:text-primary",
                )}
              >
                {year.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AlbumBrowser({ module, bid: requested }: { module: GalleryModule; bid?: string }) {
  const yearsQuery = useWebsitePage(module, {});
  const years = (yearsQuery.data?.items ?? []).flatMap((y) => {
    const bid = queryOf(y.href).get("bid");
    return bid ? [{ bid, title: y.title }] : [];
  });
  const bid = requested ?? years[0]?.bid;
  const albumsQuery = useWebsitePage(module, { bid: bid ?? "" }, { skip: !bid });
  const albums = albumsQuery.data?.items ?? [];
  const named = albums.filter((a) => a.id !== ALL);
  // Only the catch-all album: show it as the single tile. Otherwise it becomes a header link.
  const tiles = named.length ? named : albums;
  const all = named.length ? albums.find((a) => a.id === ALL) : undefined;

  const [counts, setCounts] = useState<Record<string, number>>({});
  const onCount = useCallback((id: string, n: number) => setCounts((c) => (c[id] === n ? c : { ...c, [id]: n })), []);
  const resolved = tiles.length > 0 && tiles.every((a) => counts[a.id] !== undefined);
  const visible = tiles.filter((a) => counts[a.id] !== 0).length;
  const unpublished = isUnpublishedPage(yearsQuery.error, module) || isUnpublishedPage(albumsQuery.error, module);

  let body: React.ReactNode;
  if (unpublished || (yearsQuery.status === "success" && !years.length) || (albumsQuery.status === "success" && !tiles.length) || (resolved && visible === 0)) {
    body = <LiveEmpty actions>{`No ${labels[module].many} have been published${years.length > 1 ? " for this academic year" : ""} yet.`}</LiveEmpty>;
  } else if (yearsQuery.status === "error") body = <LiveError error={yearsQuery.error} onRetry={yearsQuery.refetch} />;
  else if (albumsQuery.status === "error") body = <LiveError error={albumsQuery.error} onRetry={albumsQuery.refetch} />;
  else if (!bid || albumsQuery.status !== "success") body = <GridSkeleton label={`Loading ${labels[module].page.toLowerCase()}…`} />;
  else {
    body = (
      <>
        {all && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-muted">{`${tiles.length} ${tiles.length === 1 ? "album" : "albums"}`}</p>
            <Link href={galleryHref(module, { id: "all", bid })} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-dark hover:text-primary hover:underline">
              {`View ${labels[module].all.toLowerCase()}`} <span aria-hidden>→</span>
            </Link>
          </div>
        )}
        <ul className="grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {tiles.map((album) => (
            <AlbumCard key={`${bid}:${album.id}`} module={module} album={album} bid={bid} onCount={onCount} />
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <PageHero title={labels[module].page} breadcrumbs={[{ label: labels[module].page }]} />
      <Section tone="white" reveal={false}>
        {bid && <YearNav module={module} years={years} active={bid} />}
        {body}
      </Section>
    </>
  );
}

/* ── Album → photos / videos ─────────────────────────────────────────────── */

const PAGE = 24;

function ShowMore({ shown, total, onMore, noun }: { shown: number; total: number; onMore: () => void; noun: string }) {
  if (shown >= total) return null;
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <button type="button" onClick={onMore} className="inline-flex min-h-11 items-center rounded-md border border-primary/40 bg-white px-5 text-sm font-semibold text-primary-dark transition-colors hover:border-primary hover:bg-muted-light">
        {`Show more ${noun}`}
      </button>
      <p className="text-xs text-slate-muted">{`Showing ${shown} of ${total}`}</p>
    </div>
  );
}

function PhotoWall({ photos, title }: { photos: Photo[]; title: string }) {
  const [failed, setFailed] = useState<string[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const usable = photos.filter((p) => !failed.includes(p.src));
  // Large albums (1,000+ originals) load a page at a time instead of all at once.
  const shown = usable.slice(0, limit);
  const items = shown.map((p, i) => ({ src: p.src, alt: `${title} — photo ${i + 1}`, caption: title }));
  if (!usable.length) return <LiveEmpty>None of the photographs in this album could be loaded.</LiveEmpty>;
  return (
    <>
      <ul className="grid grid-flow-dense grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {shown.map((photo, i) => (
          <li key={photo.src} className={cn("min-w-0", i === 0 && shown.length >= 5 && "col-span-2 row-span-2")}>
            <button
              type="button"
              onClick={() => setActive(i)}
              className="group relative block h-full w-full cursor-zoom-in overflow-hidden rounded-md bg-muted-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="relative block aspect-[4/3] h-full w-full">
                <Thumb src={photo.src} onFail={() => setFailed((f) => [...f, photo.src])} />
              </span>
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-primary-ink/0 transition-colors duration-300 group-hover:bg-primary-ink/20" />
              <span className="sr-only">{`Open ${items[i]!.alt}`}</span>
            </button>
          </li>
        ))}
      </ul>
      <ShowMore shown={shown.length} total={usable.length} onMore={() => setLimit((n) => n + PAGE)} noun="photos" />
      {active !== null && items[active] && <Lightbox items={items} index={active} onIndexChange={setActive} onClose={() => setActive(null)} zoomable />}
    </>
  );
}

function VideoPlayer({ video, title, onClose }: { video: Video; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    // No close() in cleanup: it fires `close` → onClose, which would unmount the player at once
    // under Strict Mode's double effect. Removing the element closes the modal anyway.
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[min(100%-2rem,64rem)] max-w-none overflow-visible bg-transparent p-0 backdrop:bg-primary-ink/90 backdrop:backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-4 pb-3 text-on-primary">
        <p className="min-w-0 truncate font-medium">{title}</p>
        <button type="button" onClick={onClose} aria-label="Close video" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/25">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black shadow-2xl">
        <iframe src={video.embed} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" className="h-full w-full border-0" />
      </div>
      <a href={video.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-on-primary hover:underline">
        {`Watch on ${video.source}`} <span aria-hidden>↗</span>
      </a>
    </dialog>
  );
}

function VideoWall({ videos, title }: { videos: Video[]; title: string }) {
  const [noThumb, setNoThumb] = useState<string[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  if (!videos.length) return <LiveEmpty>This album has no playable videos.</LiveEmpty>;
  const all = title === labels.videos.all;
  const name = (i: number) => (all ? `Video ${i + 1}` : videos.length > 1 ? `${title} — video ${i + 1}` : title);
  return (
    <>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-6 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {videos.slice(0, limit).map((video, i) => {
          const thumb = video.thumb && !noThumb.includes(video.url) ? video.thumb : undefined;
          const frame = (
            <>
              <span className="relative block aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-primary-dark to-primary-ink shadow-sm ring-1 ring-border transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-primary-deep/15">
                {thumb && <Thumb src={thumb} onFail={() => setNoThumb((t) => [...t, video.url])} />}
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-primary-ink/15 transition-colors group-hover:bg-primary-ink/5" />
                <PlayBadge className="absolute start-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2" />
              </span>
              <span className="mt-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate group-hover:text-primary">{name(i)}</span>
                <span className="shrink-0 text-xs text-slate-muted">{video.source}</span>
              </span>
            </>
          );
          const classes = "group block w-full text-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";
          return (
            <li key={video.url} className="min-w-0">
              {video.embed ? (
                <button type="button" onClick={() => setPlaying(i)} className={classes}>{frame}</button>
              ) : (
                <a href={video.url} target="_blank" rel="noopener noreferrer" className={classes}>{frame}<span className="sr-only"> (opens in a new tab)</span></a>
              )}
            </li>
          );
        })}
      </ul>
      <ShowMore shown={Math.min(limit, videos.length)} total={videos.length} onMore={() => setLimit((n) => n + PAGE)} noun="videos" />
      {playing !== null && videos[playing] && <VideoPlayer video={videos[playing]} title={name(playing)} onClose={() => setPlaying(null)} />}
    </>
  );
}

function AlbumView({ module, id, bid }: { module: GalleryModule; id: string; bid?: string }) {
  const query = useWebsitePage(module, { id, ...(bid ? { bid } : {}) });
  // The album list carries the album's name; the media list does not.
  const albums = useWebsitePage(module, { bid: bid ?? "" }, { skip: !bid || id === "all" });
  const title = id === "all" ? labels[module].all : albums.data?.items.find((a) => a.id === id)?.title ?? labels[module].page;
  const items = query.data?.items ?? [];

  let body: React.ReactNode;
  if (isUnpublishedPage(query.error, module) || (query.status === "success" && countOf(module, items) === 0)) {
    body = <LiveEmpty actions>{`No ${labels[module].many} have been added to this album yet.`}</LiveEmpty>;
  } else if (query.status === "error") body = <LiveError error={query.error} onRetry={query.refetch} />;
  else if (query.status !== "success") body = <GridSkeleton count={8} aspect={module === "gallery" ? "aspect-[4/3]" : "aspect-video"} label={`Loading ${labels[module].many}…`} />;
  else body = module === "gallery" ? <PhotoWall photos={photosOf(items)} title={title} /> : <VideoWall videos={videosOf(items)} title={title} />;

  const back = galleryHref(module, { bid });
  return (
    <>
      <PageHero title={title} breadcrumbs={[{ label: labels[module].page, href: back }, { label: title.length > 60 ? `${title.slice(0, 57).trimEnd()}…` : title }]} />
      <Section tone="white" reveal={false}>
        {query.status === "success" && countOf(module, items) > 0 && (
          <p className="mb-5 text-sm font-medium text-slate-muted">{plural(module, countOf(module, items))}</p>
        )}
        {body}
        <div className="mt-10">
          <Link href={back} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-dark hover:text-primary hover:underline">
            <span aria-hidden>←</span> {`Back to all albums`}
          </Link>
        </div>
      </Section>
    </>
  );
}

export function MediaGallery({ module, id, bid }: { module: GalleryModule; id?: string; bid?: string }) {
  return id ? <AlbumView module={module} id={id} bid={bid} /> : <AlbumBrowser module={module} bid={bid} />;
}

export const isGalleryModule = (module: string): module is GalleryModule => module === "gallery" || module === "videos";
