# Changelog

All notable changes to `@college/core`. Versions follow [SemVer](https://semver.org).

## 1.1.1 — 2026-11-13

### Fixed
- `institute-documents` lists only document collections (with readable names) and no longer shows internal references such as `landing_control`.
- `side-events` treats the backend's empty answer ("No Main Event", `access: false`) as an empty list instead of an error.

## 1.1.0 — 2026-11-13

First release from the standalone Git repository. Fully backwards compatible with 1.0.x.

### Added
- `@college/core/react`: `CollegeProvider`, `CollegeUIProvider` (Link/Image/router adapters, explore/contact paths), hooks (`useCollege`, `useCollegeQuery`, `useCollegeMutation`, `useWebsitePage`, `usePrincipalMessages`, `useHomeAbout`) and the live-data UI previously duplicated in sites: `ExploreView`, `LiveModule`, `ContentList`/`ContentCard`/`ContentDetail`, `BoardItem`, attachment preview dialog, `MediaGallery`, `Lightbox`, `FacultyDirectory`, `LibrarySearch`, `AlumniRegistration`, `NewsletterSubscribe`, `TenantFlashNotice`, `LiveNoticesTicker`, `LivePrincipalMessages`, `LiveHomeAbout`, `DocumentViewer`, loading/error/empty states, and layout primitives (`Button`, `Section`, `SectionHeading`, `PageHero`, `Breadcrumbs`, `Reveal`, `AnnouncementTicker`).
- `@college/core/styles.css` and `@college/core/theme.css`: shared Tailwind v4 design system derived from brand inputs.
- `loadCollegePage`: every website module, including profile sections (about, society, administration, accreditation, courses), research papers/meetings, MOU batches, alumni feedback polls, committee members, and modules from the older Somani/HPT/PVG sites that were not exposed before: `infrastructure`, `student-zone`, `institute-activities`, `institute-documents`, `flash-notice`, `home-about`, `principal-messages`, `news`, `side-events`.
- `collegeBrand` (identity, home sections and module-aware navigation), presentation helpers (`cleanText`, `contentText`, `presentableItems`, `isUnpublishedPage`, `errorMessage`, `formatDate`, `fileKind`, `fileBadge`, `fileDisplayName`, `isRecent`, `splitStatement`, `findContentItem`), host helpers (`resolveCollegeHost`, `isPreviewHost`, `faviconScript`), `resolveLegacyRoute`, brand-colour utilities (`safePrimaryColor`, `resolveBrandPrimary`, `accentForegroundColor`, `applyBrandPrimary`, `applyLogoIcon`), `createDedupedFetch`, and `DEFAULT_API_BASE_URL` / `DEFAULT_ASSET_BASE_URL`.

### Changed
- Explore pagination uses real links instead of `router.push`, so it works with any router and is crawlable.

## 1.0.1

- Preserve backend error messages for HTTP failures and incomplete responses, including message-only responses with `access: true`.

## 1.0.0

- Framework-independent v3 public API client, models, tenant resolution, staff/department rules and website content adapters.
