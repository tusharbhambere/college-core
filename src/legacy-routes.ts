/** Translates URLs of the previous college websites (PVG route families) to `loadCollegePage` modules. */
/** Every public route family in the previous PVG export. */
export const legacyPaths: readonly string[] = [
  "institute", "society", "administration", "accrediation", "faculties", "department",
  "academic-course", "admission", "alumini", "library", "research-and-development",
  "examination", "notices", "events", "gallery", "video-gallery", "contact-us",
  "committee", "governing", "iqac", "naac", "aqar", "nirf", "institutional-distinctiveness",
  "special-status", "stcorner", "dynamic", "naac/view-pdf", "flipbook/from-url",
];

export interface LegacyRouteOptions { explorePath?: string; contactPath?: string }

/** Translate old bookmarks without losing their tenant-specific IDs or nested selection. */
export function resolveLegacyRoute(pathname: string, search = "", options: LegacyRouteOptions = {}): string | null {
  const explorePath = options.explorePath ?? "/explore";
  const contactPath = options.contactPath ?? "/contact";
  const segments = pathname.split("/").filter(Boolean);
  const path = segments[0];
  const old = new URLSearchParams(search);
  const modules: Record<string, string> = {
    institute: "about", society: "society", administration: "administration",
    accrediation: "accreditation", faculties: "staff", department: "departments", "academic-course": "courses",
    admission: "admissions", alumini: "alumni", library: "library", "research-and-development": "rnd",
    examination: "examinations", notices: "notices", events: "events", gallery: "gallery",
    "video-gallery": "videos", committee: "committee", governing: "governance", iqac: "iqac",
    naac: "naac", aqar: "aqar", nirf: "nirf", "institutional-distinctiveness": "institutional",
    "special-status": "special", stcorner: "student-corner", dynamic: "dynamic",
  };
  if (path === "contact-us") return contactPath + (old.toString() ? `?${old}` : "");
  const pdf = path === "pdf-viewer" || (path === "naac" && segments[1] === "view-pdf") ||
    (path === "flipbook" && segments[1] === "from-url");
  if (pdf) {
    const file = old.get("pdfKey") || old.get("file") || segments.slice(1).join("/");
    return `${explorePath}?${new URLSearchParams({ module: "viewer", file })}`;
  }
  let moduleName = path ? modules[path] : undefined;
  if (!moduleName) return null;
  const params = new URLSearchParams(old);
  const put = (key: string, value: string | null | undefined) => { if (value) params.set(key, value); };
  if (path === "department" && segments.length > 1) {
    moduleName = "department";
    const departmentId = segments[2] || segments[1];
    put("id", departmentId);
    const tab = old.get("tab");
    if (tab === "faculties") moduleName = "faculty";
    if (tab === "mou-collaboration") moduleName = "mou-batches";
    if (tab === "activities" || tab === "projects") {
      moduleName = tab; params.delete("id"); put("sid", departmentId); put("flow", "DEPARTMENT");
    }
  }
  if (path === "academic-course" && segments[1]) { moduleName = "course"; put("id", segments[1]); }
  if (path === "notices" && old.get("nid")) { moduleName = "announcement"; put("id", old.get("nid")); }
  if (path === "events" && old.get("eid")) { moduleName = "event"; put("id", old.get("eid")); }
  if (path === "faculties") put("category", old.get("active") || "teaching");
  if (path === "committee") { put("id", old.get("active")); put("view", old.get("n")); }
  if (path === "governing") put("categoryId", old.get("active"));
  if (["iqac", "naac", "aqar", "nirf", "institutional-distinctiveness", "special-status"].includes(path ?? "")) {
    put("id", old.get("iqdid")); put("node", old.get("d") || old.get("n") || old.get("active"));
  }
  if (path === "stcorner") put("id", old.get("active"));
  if (path === "dynamic") { put("id", old.get("parent")); put("parent_key", old.get("active")); }
  if (["gallery", "video-gallery"].includes(path ?? "")) {
    put("bid", old.get("active")); put("categoryId", old.get("category"));
  }
  if (path === "alumini") put("view", old.get("active"));
  if (path === "research-and-development") {
    const tab = old.get("tab");
    if (tab === "research-paper") put("view", "papers");
    if (tab === "meetings") put("view", "meetings");
    if (tab === "mou") moduleName = "mous";
    if (tab === "activities" || tab === "projects") { moduleName = "research-departments"; put("view", tab); }
  }
  if (path === "admission") {
    const tab = old.get("tab");
    if (tab === "new-admission") moduleName = "applications";
    if (tab === "admission-enquiry" || tab === "contact-us") return `${contactPath}#enquiry`;
    if (tab === "document-checklist") moduleName = "documents";
  }
  params.set("module", moduleName);
  return `${explorePath}?${params}`;
}
