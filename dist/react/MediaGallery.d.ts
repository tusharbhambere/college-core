/**
 * Photo and video galleries. The CMS nests them as academic year → album → media and
 * albums carry no cover, so each album reads its own media: the first photo becomes the
 * cover and albums with nothing in them are left out instead of showing a blank tile.
 */
type GalleryModule = "gallery" | "videos";
export declare function MediaGallery({ module, id, bid }: {
    module: GalleryModule;
    id?: string;
    bid?: string;
}): import("react").JSX.Element;
export declare const isGalleryModule: (module: string) => module is GalleryModule;
export {};
//# sourceMappingURL=MediaGallery.d.ts.map