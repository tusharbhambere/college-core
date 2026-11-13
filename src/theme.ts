/* Brand colour utilities: contrast-safe runtime theming from a college's backend colour_theme. */
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(value: string): [number, number, number] | null {
  const match = HEX.exec(value.trim());
  if (!match) return null;
  let hex = match[1]!;
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const contrastWithWhite = (rgb: [number, number, number]) => 1.05 / (luminance(rgb) + 0.05);

const toHex = (rgb: [number, number, number]) =>
  `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/** Returns a primary with at least 5.5:1 contrast against white, or null for invalid hex. */
export function safePrimaryColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let rgb = parseHex(value);
  if (!rgb) return null;
  for (let i = 0; i < 20 && contrastWithWhite(rgb) < 5.5; i++) {
    // Test the same integer channels that will be rendered. Testing floats and
    // rounding only at the end can turn a passing result into a failing hex.
    rgb = rgb.map((c) => Math.round(c * 0.9)) as [number, number, number];
  }
  return toHex(rgb);
}

/** Returns the colour as #rrggbb, or null when it is not a hex colour (no contrast fix). */
export function safeHexColor(value: unknown): string | null {
  const rgb = typeof value === 'string' ? parseHex(value) : null;
  return rgb ? toHex(rgb) : null;
}

/** Returns the higher-contrast black or white label for an accent fill, or null for invalid hex. */
export function accentForegroundColor(value: unknown): string | null {
  const rgb = typeof value === 'string' ? parseHex(value) : null;
  if (!rgb) return null;
  const contrastWithBlack = (luminance(rgb) + 0.05) / 0.05;
  return contrastWithWhite(rgb) >= contrastWithBlack ? '#ffffff' : '#000000';
}

/** Resolves valid configured colours before optional backend colours; invalid values fall back. */
export function resolveBrandPrimary(
  configuredColor: unknown,
  tenantColor: unknown,
  tenantTheme: boolean,
): string | null {
  return safePrimaryColor(configuredColor) ?? (tenantTheme ? safePrimaryColor(tenantColor) : null);
}

/** Sets `--brand-primary` (or another property) on <html>; pass null to restore the stylesheet value. */
export function applyBrandPrimary(value: unknown, property = '--brand-primary') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const color = safePrimaryColor(value);
  if (color) root.style.setProperty(property, color);
  else root.style.removeProperty(property);
}

/** Adds the college's CMS logo as the page icon unless generated per-host icons are present. */
export function applyLogoIcon(logo: string | undefined) {
  if (typeof document === 'undefined' || !logo || document.querySelector('link[data-college-icon]')) return;
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = logo;
  link.dataset.collegeIcon = '';
  document.head.appendChild(link);
}
