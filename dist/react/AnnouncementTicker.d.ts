type TickerItem = {
    text: string;
    href?: string;
    highlight?: boolean;
};
/**
 * Slim scrolling announcement strip under the header. Pure-CSS marquee
 * (content duplicated once for a seamless loop); pauses on hover/focus
 * and freezes for reduced-motion users.
 */
export declare function AnnouncementTicker({ items }: {
    items: TickerItem[];
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=AnnouncementTicker.d.ts.map