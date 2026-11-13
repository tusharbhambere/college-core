# Integrate @college/core in a college website

This guide adds the shared package to a new (or existing) college site. The reference integration is the `templete_web_first` site (Next.js 16, static export, Firebase Hosting).

## 1. Install

```sh
npm install "github:tusharbhambere/college-core#v1.1.1"
```

Requirements: Node ≥ 20 for builds and scripts, ESM imports. The React entry needs React ≥ 19.2; the stylesheet needs Tailwind CSS v4. The core entry has no dependencies and works in any framework (Vue, Svelte, Astro, plain scripts) or in Node build steps.

## 2. Configuration

Keep these values in your site configuration (public, never secrets):

| Setting | Default | Notes |
| --- | --- | --- |
| API base URL | `DEFAULT_API_BASE_URL` (`https://test.qviple.com/api/v3/public`) | Origin, `/api` root or full `/api/v3/public` URL |
| Asset (CDN) base URL | `DEFAULT_ASSET_BASE_URL` | Storage keys resolve beneath it |
| College host | the browser hostname | The domain registered for the college in the backend. On localhost/preview domains use `resolveCollegeHost(hostname, { override })` so a real custom domain can never be overridden |

## 3. Providers (React)

Wrap the app once. `CollegeUIProvider` plugs your router and image components into every package component; `CollegeProvider` creates the shared API client and resolves the college.

### Next.js (App Router)

```tsx
// src/components/college/Providers.tsx
"use client";
import NextImage from "next/image";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CollegeProvider, CollegeUIProvider, type CollegeNavigation, type ImageComponentProps, type LinkComponentProps } from "@college/core/react";
import { resolveCollegeHost } from "@college/core";

const Link = ({ href, ...props }: LinkComponentProps) => <NextLink href={href} {...props} />;
const Image = ({ src, alt, width, height, fill, ...props }: ImageComponentProps) => fill
  ? <NextImage src={src} alt={alt} fill unoptimized {...props} />
  : <NextImage src={src} alt={alt} width={width ?? 800} height={height ?? 600} unoptimized {...props} />;
function useNavigation(): CollegeNavigation {
  const searchParams = useSearchParams();
  return { searchParams: new URLSearchParams(searchParams), pathname: usePathname(), push: useRouter().push };
}
const host = () => resolveCollegeHost(window.location.hostname, { override: process.env.NEXT_PUBLIC_COLLEGE_HOST });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CollegeUIProvider Link={Link} Image={Image} useNavigation={useNavigation}>
      <CollegeProvider apiBaseUrl={process.env.NEXT_PUBLIC_API_BASE_URL} assetBaseUrl={process.env.NEXT_PUBLIC_ASSET_BASE_URL} host={host}>
        {children}
      </CollegeProvider>
    </CollegeUIProvider>
  );
}
```

Use `<Providers>` in `app/layout.tsx`. For `output: "export"`, set `images.unoptimized: true`.

### Vite / other React apps

No adapters are required: the defaults render `<a>` and lazy `<img>` and read `window.location`. Supply `Link`/`useNavigation` from your router (e.g. React Router's `<Link to>` and `useLocation`/`useNavigate`) for client-side navigation.

```tsx
<CollegeProvider host={() => window.location.hostname}>
  <App />
</CollegeProvider>
```

`CollegeUIProvider` options: `Link`, `Image`, `useNavigation`, `explorePath` (default `/explore`), `contactPath` (default `/contact`), `legacyRoutes` (translate old PVG-style URLs, default `true`).

## 4. Styles

```css
@import "tailwindcss";
@import "@college/core/theme.css";   /* or a local file that sets the --brand-* inputs */
@import "@college/core/styles.css";
```

`styles.css` contains the design tokens (derived from `--brand-primary`, `--brand-accent`, `--brand-text`, `--brand-surface`, `--brand-on-accent` and status colours), Tailwind theme mappings (`bg-primary`, `text-accent-foreground`, `shadow-elev-1`, …), utilities and animations, and an `@source` for the package's components. Re-skin a college by changing only the brand inputs. At runtime, `applyBrandPrimary(color)` applies a backend `color_theme` with contrast correction (`resolveBrandPrimary(configured, tenantColor, enabled)` decides precedence). Set `--font-heading` and `--font-body` (e.g. with `next/font`).

## 5. Pages

Add one route that renders every module (the static-host replacement for per-module routes):

```tsx
// app/explore/page.tsx
import { Suspense } from "react";
import { ExploreView, LiveLoading } from "@college/core/react";
export default function Explore() {
  return <Suspense fallback={<LiveLoading />}><ExploreView /></Suspense>;
}
```

Package links point to `/explore?module=…&id=…` (or your `explorePath`). Build the rest of the site from the components:

| Component | Use |
| --- | --- |
| `LiveModule` | Any module as a section: `<LiveModule module="events" title="Events" paginate />` |
| `ContentList`, `ContentCard`, `ContentDetail`, `BoardItem` | Render `ContentItem[]` with attachments, previews and "New" badges |
| `MediaGallery`, `Lightbox` | Photo/video galleries by academic year and category |
| `FacultyDirectory`, `LibrarySearch` | Staff directory with category/name filters; OPAC search |
| `AlumniRegistration`, `NewsletterSubscribe` | Forms wired to the API mutations |
| `TenantFlashNotice`, `LiveNoticesTicker`, `LivePrincipalMessages`, `LiveHomeAbout` | Home-page live blocks |
| `Button`, `Section`, `SectionHeading`, `PageHero`, `Breadcrumbs`, `Reveal`, `AnnouncementTicker` | Shared layout primitives |
| `LiveLoading`, `LiveError`, `LiveEmpty` | Consistent loading / retry / empty states |

Navigation and identity come from `collegeBrand(tenant, { assetBaseUrl })`: name, logo, contact details, hero images, courses, quick/footer links, home-section switches and a module-aware `nav` tree. Hooks: `useCollege()` (client, tenant, status, retry), `useWebsitePage(module, params)`, `useCollegeQuery(key, read)`, `useCollegeMutation(send)`.

## 6. Without React

```ts
import { createCollegeClient, resolveTenant, loadCollegePage, collegeBrand } from '@college/core';

const api = createCollegeClient({ baseUrl: 'https://test.qviple.com/api/v3/public' });
const tenant = await resolveTenant(api, 'pvgcer.in');
const brand = collegeBrand(tenant);
const page = await loadCollegePage(api, tenant, 'departments');
```

Low-level methods (`api.institutes.announcements(...)` etc.) return the backend's original typed envelopes. `loadWebsite(api, host)` builds a full snapshot for static pre-rendering and keeps per-section `warnings`. Shared rules — `filterStaff`, `groupStaffByDesignation`, `groupDepartments`, `enabledModules`, `normalizeContent` — must be used instead of re-implementing them in a site. Render returned text as text, never as HTML.

## 7. Upgrading

1. Read [CHANGELOG.md](CHANGELOG.md).
2. `npm install "github:tusharbhambere/college-core#vX.Y.Z"`.
3. Run the site's lint, tests and build; deploy.

## Mutations remain explicit user actions

Call enquiry, subscription, registration, CV generation and counter methods only when their corresponding user action occurs. Do not call them during static rendering or automatically on mount. Transport errors reject with `CollegeApiError`; there are no automatic retries.

For an enquiry about a selected application, use its owning `admissionAdminId` as the route ID and its application ID in the `inquiry_application` body field. `loadWebsite().applications` preserves this association. Keep the exact documented body field names when wiring a new form. Backend rejection, including `Already Subscribed`, must remain an error rather than a success message.

## Static deployment

This package does not impose a rendering framework. For initial static HTML, call read-only loaders at build time, store/review a public snapshot, and render it through your chosen static renderer. Keep each snapshot tied to its college and API/CDN configuration. To make builds independent of backend availability, build from the reviewed snapshot and refresh it through a separate explicit operation.

Live browser searches, updates and forms still call the existing external API and require JavaScript, network access, and a permitted browser origin. Static hosting does not bypass CORS: the backend must allow the new site's origin and required methods. A successful Node/build-time API call alone does not prove browser CORS will work. A local development proxy can forward to the original API without changing its endpoint contract.

Keep presentation in the new site and API paths, tenant resolution, models and shared data rules in this package. Another college can then replace its entire UI while reusing this same dependency.
