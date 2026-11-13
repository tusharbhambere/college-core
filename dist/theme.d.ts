/** Returns a primary with at least 5.5:1 contrast against white, or null for invalid hex. */
export declare function safePrimaryColor(value: unknown): string | null;
/** Returns the colour as #rrggbb, or null when it is not a hex colour (no contrast fix). */
export declare function safeHexColor(value: unknown): string | null;
/** Returns the higher-contrast black or white label for an accent fill, or null for invalid hex. */
export declare function accentForegroundColor(value: unknown): string | null;
/** Resolves valid configured colours before optional backend colours; invalid values fall back. */
export declare function resolveBrandPrimary(configuredColor: unknown, tenantColor: unknown, tenantTheme: boolean): string | null;
/** Sets `--brand-primary` (or another property) on <html>; pass null to restore the stylesheet value. */
export declare function applyBrandPrimary(value: unknown, property?: string): void;
/** Adds the college's CMS logo as the page icon unless generated per-host icons are present. */
export declare function applyLogoIcon(logo: string | undefined): void;
//# sourceMappingURL=theme.d.ts.map