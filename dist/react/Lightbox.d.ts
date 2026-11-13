export type LightboxItem = {
    src: string;
    alt: string;
    caption?: string;
    category?: string;
};
type LightboxProps = {
    items: readonly LightboxItem[];
    index: number;
    onClose: () => void;
    onIndexChange: (index: number) => void;
    /** Adds a zoom toggle (button, double-click, +/- keys) for reading dense notices and posters. */
    zoomable?: boolean;
};
/**
 * Full-screen viewer shared by every photo grid on the site.
 * Blurred primary backdrop, zoom-in entrance, prev/next navigation,
 * keyboard support (Esc / ← / →, Tab stays inside), body scroll lock while open,
 * and focus returns to the opener on close.
 */
export declare function Lightbox({ items, index, onClose, onIndexChange, zoomable }: LightboxProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=Lightbox.d.ts.map