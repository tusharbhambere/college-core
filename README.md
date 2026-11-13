# @college/core

The single source of truth for every Qviple college website: the public v3 API client, tenant (college) resolution, shared business rules, content adapters, React hooks, live-data UI components and the shared design system.

A college site installs this package from Git, supplies its own pages and brand colours, and gets every API integration and shared component from here. Fix or improve something once, release a new version, and every site picks it up by bumping one dependency.

| Entry point | Contents | Requires |
| --- | --- | --- |
| `@college/core` | API client (75 endpoint methods), models, `resolveTenant`, staff/department rules, `normalizeContent`, `loadWebsite`, `loadCollegePage` (all website modules), `collegeBrand` (identity + navigation), error/file/text helpers, host resolution, legacy URL mapping, brand-colour contrast utilities | Nothing (zero runtime dependencies; browser or Node ≥ 20) |
| `@college/core/react` | `CollegeProvider`, `CollegeUIProvider`, `useCollege`, `useCollegeQuery`, `useCollegeMutation`, `useWebsitePage`, `ExploreView` and ~25 live-data/UI components | React ≥ 19.2 |
| `@college/core/styles.css` | Design tokens derived from four brand inputs, utilities, animations and component styles | Tailwind CSS v4 |
| `@college/core/theme.css` | Default brand inputs (`--brand-primary`, `--brand-accent`, …) | — |

## Install

Add the package to a site from this Git repository, pinned to a release tag:

```sh
npm install "github:tusharbhambere/college-core#v1.1.0"
```

`package.json` then contains:

```json
"dependencies": {
  "@college/core": "github:tusharbhambere/college-core#v1.1.0"
}
```

The compiled `dist/` is committed for every release, so installation needs no build step, no registry and no access token. `package-lock.json` records the exact commit, so CI and Firebase builds are reproducible.

Then follow the [integration guide](INTEGRATION.md) (provider, router adapters, styles, explore route).

## Update an existing site

```sh
npm install "github:tusharbhambere/college-core#v1.2.0"   # pin to the new release
npm run lint && npm run build                             # verify, then deploy
```

To accept compatible releases automatically, depend on a semver range instead of a tag: `"github:tusharbhambere/college-core#semver:^1.1.0"`. `npm update @college/core` then moves to the newest `1.x` tag; the lockfile still pins the resolved commit until you update.

See [CHANGELOG.md](CHANGELOG.md) before upgrading across a major version.

## Quick start (any framework)

```ts
import { createCollegeClient, resolveTenant, loadCollegePage, errorMessage } from '@college/core';

const api = createCollegeClient({ baseUrl: 'https://test.qviple.com/api/v3/public' });
const tenant = await resolveTenant(api, 'pvgcer.in');

try {
  const notices = await loadCollegePage(api, tenant, 'notices', { page: 1, limit: 10 });
  // notices.title, notices.items (ContentItem[]), notices.hasMore
} catch (error) {
  console.error(errorMessage(error)); // readable, user-facing text
}
```

## Quick start (React)

```tsx
import { CollegeProvider, ExploreView, LiveModule } from '@college/core/react';

<CollegeProvider host={() => window.location.hostname}>
  <LiveModule module="notices" title="Latest notices" params={{ page: 1, limit: 6 }} />
  <ExploreView />            {/* on the /explore route: renders every module */}
</CollegeProvider>
```

```css
/* global stylesheet */
@import "tailwindcss";
@import "@college/core/theme.css";
@import "@college/core/styles.css";
```

## Website modules

`loadCollegePage(client, tenant, module, params)` (and `useWebsitePage` / `ExploreView`) serve every page family of the older college websites:

| Area | Modules |
| --- | --- |
| Institute | `about`, `society`, `administration`, `accreditation`, `governance`, `contact`, `home-about`, `principal-messages`, `flash-notice`, `institute-documents` |
| Academics | `courses`, `course`, `departments`, `department`, `faculty`, `staff`, `examinations`, `library`, `library-books`, `fees`, `mous`, `mou-batches`, `activities`, `activity`, `projects` |
| Admissions | `admissions`, `applications`, `application`, `scholarships`, `documents` |
| Quality & research | `iqac`, `naac`, `aqar`, `nirf`, `institutional`, `special`, `committee`, `rnd`, `research-papers`, `research-departments` |
| Campus & community | `notices`, `announcement`, `events`, `event`, `side-events`, `news`, `gallery`, `videos`, `student-corner`, `dynamic`, `module`, `alumni`, `alumni-departments`, `infrastructure`, `student-zone`, `institute-activities` |

Mutations (enquiry, alumni registration, newsletter, event enquiry, publish counters, CV generation) are client methods that run only on explicit user actions; `AlumniRegistration`, `NewsletterSubscribe` and `useCollegeMutation` wrap them for React.

## Endpoint namespaces

| Namespace | Methods |
| --- | --- |
| `institutes` | `byHost`, `dashboard`, `announcements`, `announcement`, `departments`, `staff`, `staffDetail`, `batches`, `mergedDepartments` |
| `landing` | `profile`, `faculty`, `pinnedDepartments`, `pinnedDepartment`, `examinations` |
| `admissions` | `ongoing`, `application`, `dashboard`, `scholarships`, `documents`, `inquire` |
| `finance` | `structures`, `structure` |
| `library` | `books`, `opac` |
| `staff` | `generateCv` |
| `alumni` | `dashboard`, `prominent`, `feedback`, `register` |
| `events` | `list`, `one`, `posts`, `side`, `inquire`, `subscribe` |
| `site` | `admission`, `department`, `library`, `opener`, `batches`, `mous`, `activity`, `activities`, `activitiesByType`, `projects`, `dynamicTabs`, `dynamicChildren`, `moduleTabs`, `moduleChildren`, `studentCorner`, `governingCategories`, `governingBody`, `societyCategories`, `societyBody`, `homeAbout`, `principalMessages`, `otherModel`, `otherCategories`, `otherActivities`, `publishCounts`, `incrementPublishCounts` |
| `committees` | `dashboard`, `custom`, `compositions`, `sections`, `about`, `auditReports`, `naac`, `activities`, `iqacDetails`, `irins` |
| `gallery` | `imageCategories`, `images`, `videoCategories`, `videos` |

The full contract (paths, query names, bodies, response keys) is in [PUBLIC_API.md](PUBLIC_API.md).

## API behaviour

`baseUrl` accepts the API origin, its `/api` root, or its complete `/api/v3/public` path. Choose the backend explicitly for each deployment. `fetch` and a parent `signal` are injectable for tests, SSR, or cancellation. Do not put private keys in frontend configuration; the documented public API needs no credentials.

Methods return the original response envelopes with typed data keys, including additional tenant-defined fields. Methods reject with `CollegeApiError`; `kind` distinguishes `input`, `http`, `network`, `timeout`, `aborted`, `json`, `api`, `response`, and `tenant`. The package validates ObjectIds before requests, preserves real `announcemnt` and `alumini` spellings, checks required response data instead of relying on `access`, and accepts the deployed dashboard's omitted `access` field. Requests time out while fetching headers **and** reading the body. No requests are automatically retried, including writes and generated CVs.

Failed responses preserve a non-empty backend `message` in `error.message`, including HTTP errors and message-only responses with `access: true` but missing required data. `details.response` retains the original payload, `details.status` retains the HTTP error status, and `details.reason` retains contract diagnostics. Valid responses with an informational message remain successful. Frontends should show readable fallbacks for network, timeout, invalid JSON, or responses without a backend message, rather than displaying contract field names.

## Endpoint namespaces

| Namespace | Methods |
| --- | --- |
| `institutes` | `byHost`, `dashboard`, `announcements`, `announcement`, `departments`, `staff`, `staffDetail`, `batches`, `mergedDepartments` |
| `landing` | `profile`, `faculty`, `pinnedDepartments`, `pinnedDepartment`, `examinations` |
| `admissions` | `ongoing`, `application`, `dashboard`, `scholarships`, `documents`, `inquire` |
| `finance` | `structures`, `structure` |
| `library` | `books`, `opac` |
| `staff` | `generateCv` |
| `alumni` | `dashboard`, `prominent`, `feedback`, `register` |
| `events` | `list`, `one`, `posts`, `side`, `inquire`, `subscribe` |
| `site` | `admission`, `department`, `library`, `opener`, `batches`, `mous`, `activity`, `activities`, `activitiesByType`, `projects`, `dynamicTabs`, `dynamicChildren`, `moduleTabs`, `moduleChildren`, `studentCorner`, `governingCategories`, `governingBody`, `societyCategories`, `societyBody`, `homeAbout`, `principalMessages`, `otherModel`, `otherCategories`, `otherActivities`, `publishCounts`, `incrementPublishCounts` |
| `committees` | `dashboard`, `custom`, `compositions`, `sections`, `about`, `auditReports`, `naac`, `activities`, `iqacDetails`, `irins` |
| `gallery` | `imageCategories`, `images`, `videoCategories`, `videos` |

Each ID-based method takes the ID first and its optional query object second. `governingBody` and `societyBody` take landing-control ID, category ID, then query. Mutation methods take ID then the exact typed body. Activity/project list methods take only their optional query. The full method signatures are available through the published TypeScript declarations.

`resolveTenant` follows host mapping → institute dashboard and website profile → role/module IDs. It keeps every valid admission administrator in `admissionAdminIds`, every event manager in `eventManagerIds`, and primary IDs for compatibility with existing sites. An unmapped host fails explicitly; it never silently renders another college. Keep each admission application associated with its owning administrator when loading multiple groups; an inquiry about a selected application must use that application's administrator rather than assuming the primary administrator shown in the generic inquiry example above.

## Presentation helpers

`assetUrl` resolves storage keys under the configured CDN, `safeUrl` validates link destinations, `plainText` creates text previews, `enabledModules` centralizes current/legacy visibility switches, and `paginate`/`normalizePagination` normalize pagination. Use these helpers inside adapters and render their output as text and safe attributes. Never treat `plainText` as an HTML sanitizer.

`filterStaff`, `partitionStaff`, `groupStaffByDesignation`, `staffFullName`, and `filterStaffByName` preserve the existing faculty classification, designation order, prefix, college type, and search rules. Select the explicit `bhavan` or `somani` staff policy for the source site being migrated; Somani's categories intentionally overlap. `groupDepartments` and `isSelfFinancingDepartment` preserve the configured Bhavan Senior College self-financing course split. These are data rules, so future UIs should consume the shared selectors rather than reimplement them inside components.

The website directory loader retains the existing staff request (`page: 1, limit: 1000`), applies category/name/department selectors, then paginates the filtered directory locally. Filtering a small server page first would otherwise hide matching staff on later pages. The lower-level staff API methods remain available for callers that need server pagination.

`loadWebsite` and the website view models provide the reusable snapshot/domain layer used by the example website. The example's explicit snapshot command refreshes public data; its offline build consumes the committed snapshot. It uses the same client for fresh reads and form submissions. A static host still needs the existing remote API and its CORS configuration for live features. Review the packaged [integration guide](INTEGRATION.md) for standalone setup; the source repository's `docs/INTEGRATION.md` also explains the reference app's snapshot and hosting workflow.

## Develop and release

```sh
npm ci
npm test            # build + 177 contract, business-rule, adapter and React render tests
```

Release (maintainers):

1. Make the change, add tests, update `CHANGELOG.md`.
2. `npm version minor` (or `patch` / `major`) — bumps `package.json`; then `npm run build` and commit `dist/` with it.
3. `git push --follow-tags`. CI verifies the build, tests and that the committed `dist/` matches the sources.
4. In each site: `npm install "github:tusharbhambere/college-core#vX.Y.Z"`, build, deploy.

Versioning follows [SemVer](https://semver.org): patch = fixes, minor = new modules/components/options (backwards compatible), major = removed or changed exports, changed CSS token names, or a raised React/Node minimum.

To test unreleased changes in a site, `npm pack` here and `npm install /path/to/college-core-x.y.z.tgz` there. Avoid `npm link`/`file:` links for React sites: they load a second copy of React from this repository's `node_modules`.
