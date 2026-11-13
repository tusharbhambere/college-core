"use client";

import { useCollegeNavigation, useCollegeUI } from "./adapters.js";
import type { WebsitePageParams } from "../index.js";
import { Section } from "./Section.js";
import { Button } from "./Button.js";
import { PageHero } from "./PageHero.js";
import { useWebsitePage } from "./hooks.js";
import { ContentList } from "./ContentList.js";
import { LiveEmpty, LiveError, LiveLoading } from "./LiveState.js";
import { AlumniRegistration } from "./AlumniRegistration.js";
import { LibrarySearch } from "./LibrarySearch.js";
import { FacultyDirectory } from "./FacultyDirectory.js";
import { DocumentViewer } from "./DocumentViewer.js";
import { ContentDetail } from "./ContentDetail.js";
import { useCollege } from "./CollegeProvider.js";
import { isGalleryModule, MediaGallery } from "./MediaGallery.js";
import { isUnpublishedPage } from "../index.js";

/** Single-record modules → their listing, for "Back to all …" and breadcrumbs. */
const parents: Record<string, { module: string; label: string }> = {
  announcement: { module: "notices", label: "Notices" },
  event: { module: "events", label: "Events" },
  application: { module: "applications", label: "Applications" },
  examination: { module: "examinations", label: "Examinations" },
  activity: { module: "activities", label: "Activities" },
  department: { module: "departments", label: "Departments" },
  course: { module: "courses", label: "Programmes" },
  staff: { module: "faculty", label: "Faculty & staff" },
};

const sectionTitles: Record<string, string> = {
  faculty: "Faculty & staff", staff: "Faculty & staff", admissions: "Admissions", admission: "Admissions",
  scholarships: "Scholarships", documents: "Admission documents", departments: "Academic departments",
  department: "Department", notices: "Notices", announcement: "Notice", events: "Events", event: "Event",
  applications: "Open admission applications", application: "Admission application", library: "Library",
  "library-books": "Library catalogue", fees: "Fee structures", courses: "Academic programmes", course: "Academic programme",
  administration: "Administration", accreditation: "Accreditation", governance: "Governance",
  iqac: "IQAC", naac: "NAAC", aqar: "AQAR", nirf: "NIRF", rnd: "Research and development",
  "research-papers": "Research papers", "student-corner": "Student Corner", dynamic: "Resources",
  alumni: "Alumni", committee: "Committees",
};
const cardGrids = new Set(["departments", "applications", "documents", "fees", "mous", "mou-batches"]);

/** Long notice titles stay readable in the hero heading; the breadcrumb only needs a hint. */
const crumb = (title: string) => (title.length > 60 ? `${title.slice(0, 57).trimEnd()}…` : title);

/** Notices are announcements: "New" for a week, and list rows read their attachments. */
const NOTICE_FRESH_DAYS = 7;

/**
 * Detail view for every link @college/core produces (`/explore?module=…&id=…`) —
 * the static-host replacement for HPTRYK's per-module routes
 * (/notices/:notice, /department/:name/:id, /committee/:name, …).
 */
export function ExploreView() {
  const search = useCollegeNavigation().searchParams;
  const moduleName = search.get("module") ?? "";
  if (isGalleryModule(moduleName)) {
    return <MediaGallery key={search.toString()} module={moduleName} id={search.get("id") ?? undefined} bid={search.get("bid") ?? undefined} />;
  }
  return <RecordView />;
}

function RecordView() {
  const { searchParams: search, pathname } = useCollegeNavigation();
  const { explorePath } = useCollegeUI();
  // Real links (not router.push) so paging works with any router and stays crawlable.
  const pageHref = (page: number) => {
    const next = new URLSearchParams(search);
    if (page > 1) next.set("page", String(page)); else next.delete("page");
    return `${pathname}?${next}`;
  };
  const { tenant } = useCollege();
  const params: WebsitePageParams = {};
  search.forEach((value, key) => {
    if (key !== "module") params[key] = value;
  });
  const moduleName = search.get("module") ?? "";
  const registration = moduleName === "alumni" && params.view === "registration";
  const directory = (moduleName === "faculty" || moduleName === "staff") && !params.id;
  const viewer = moduleName === "viewer";
  const query = useWebsitePage(moduleName, params, { skip: !moduleName || registration || directory || viewer });
  const parent = params.id ? parents[moduleName] : undefined;
  const empty = !moduleName || isUnpublishedPage(query.error, moduleName)
    || query.status === "success" && !query.data?.items.length;
  const pageTitle = viewer ? "Document viewer" : registration ? "Alumni registration" : directory ? "Faculty & staff"
    : query.data?.title ?? sectionTitles[moduleName] ?? (moduleName ? "College information" : "Explore the college");

  let body: React.ReactNode;
  if (viewer) body = <DocumentViewer file={String(params.file ?? "")} />;
  else if (registration) body = tenant?.alumniId ? <AlumniRegistration /> : <LiveEmpty>Alumni registration is not available for this college.</LiveEmpty>;
  else if (directory) body = <FacultyDirectory initialCategory={String(params.category ?? "teaching")} />;
  else if (empty) body = <LiveEmpty actions>{moduleName === "documents" ? "The college has not published a readable list of required admission documents yet." : undefined}</LiveEmpty>;
  else if (query.status === "error") body = <LiveError error={query.error} onRetry={query.refetch} />;
  else if (query.status !== "success" || !query.data) body = <LiveLoading />;
  else if (params.id && query.data.items.length === 1 && !query.data.items[0]!.children?.length) {
    // One record (a notice, event, …): show its document itself, not a list card.
    body = (
      <ContentDetail
        item={query.data.items[0]!}
        backHref={parent ? `${explorePath}?module=${parent.module}` : "/"}
        backLabel={parent ? `Back to all ${parent.label.toLowerCase()}` : "Back to home"}
        freshDays={moduleName === "announcement" ? NOTICE_FRESH_DAYS : undefined}
      />
    );
  } else {
    const notices = moduleName === "notices";
    body = (
      <ContentList
        items={query.data.items}
        layout={cardGrids.has(moduleName) && !params.id && !params.cid ? "grid" : "list"}
        preview={notices || moduleName === "events"}
        loadDetails={notices}
        freshDays={notices ? NOTICE_FRESH_DAYS : undefined}
      />
    );
  }
  const detail = viewer || Boolean(params.id) && query.status === "success" && query.data?.items.length === 1 && !query.data.items[0]!.children?.length;

  return (
    <>
      <PageHero title={pageTitle} breadcrumbs={[
        ...(parent ? [{ label: parent.label, href: `${explorePath}?module=${parent.module}` }] : []),
        { label: crumb(pageTitle) },
      ]} />
      <Section tone="white" reveal={false}>
        {body}
        {query.status === "success" && (query.data?.hasMore || Number(params.page ?? 1) > 1) && <nav aria-label="Results pages" className="mt-6 flex flex-wrap gap-3">
          {Number(params.page ?? 1) > 1 && <Button variant="secondary" href={pageHref(Number(params.page ?? 1) - 1)}>Previous page</Button>}
          {query.data?.hasMore && <Button href={pageHref(Number(params.page ?? 1) + 1)}>Next page</Button>}
        </nav>}
        {!detail && !empty && (
          <div className="mt-8">
            <Button href="/" variant="ghost">
              ← Back to home
            </Button>
          </div>
        )}
      </Section>
      {moduleName === "library" && params.view !== "opac" && <LibrarySearch />}
    </>
  );
}
