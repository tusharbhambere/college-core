import type { CollegeClient } from './client.js';
import { CollegeApiError, invalidApiResponse, isId } from './errors.js';
import { filterStaff, filterStaffByName, groupDepartments, staffFullName, type StaffCategory } from './domain.js';
import { assetUrl, enabledModules, normalizePagination, paginate, plainText, safeUrl } from './helpers.js';
import type { JsonRecord, Query } from './models.js';
import { resolveTenant, type TenantContext } from './tenant.js';
import { DEFAULT_ASSET_BASE_URL } from './config.js';

/** A framework-neutral presentation model. API field aliases stay inside this package. */
export interface ContentItem {
  id: string;
  title: string;
  description: string;
  date?: string;
  image?: string;
  href?: string;
  files?: { label: string; url: string }[];
  children?: ContentItem[];
  meta?: string[];
  /** The inquiry route uses the application's admission administrator, not the institute ID. */
  admissionAdminId?: string;
}

export interface WebsiteSnapshot {
  schemaVersion: 1;
  host: string;
  capturedAt: string;
  tenant: TenantContext;
  brand: {
    name: string; fullName: string; address: string; email: string; phone: string;
    affiliation: string; accreditation: string; logo: string; heroImages: string[];
    about: string; vision: string; mission: string;
  };
  modules: { key: string; label: string; href: string }[];
  notices: ContentItem[];
  departments: ContentItem[];
  events: ContentItem[];
  applications: ContentItem[];
  studentCorner: ContentItem[];
  dynamicTabs: ContentItem[];
  gallery: ContentItem[];
  governance: ContentItem[];
  warnings: string[];
}

export interface ContentOptions {
  assetBaseUrl?: string;
  /** The explore module used for links to full API records. */
  module?: string;
  defaultTitle?: string;
  admissionAdminId?: string;
  /** Defaults to /explore/, a path that works on a static host. */
  pagePath?: string;
}

export interface WebsitePage {
  title: string;
  items: ContentItem[];
  hasMore?: boolean;
  total?: number;
  warnings?: string[];
}

export type WebsitePageParams = Record<string, string | number | undefined>;
const defaultCdn = DEFAULT_ASSET_BASE_URL;
const titleKeys = [
  'insAnnTitle', 'event_name', 'dName', 'department_name', 'departmentName', 'applicationName',
  'application_name', 'applicationTitle', 'custom_head_name', 'body_name', 'sub_head_title',
  'activity_name', 'activity_title', 'act_name', 'act_title', 'bookName', 'book_title',
  'category_name', 'gallery_name', 'image_name', 'video_name', 'tab_name', 'tab_title',
  'title', 'name', 'heading', 'category', 'org_name', 'scholarship_name', 'scholar_name',
  'document_name', 'structure_name', 'fee_structure_name', 'batchName', 'userLegalName',
  'leading_person_name', 'library_name', 'ins_name', 'contact_person_name', 'contact_department_name',
];
const descriptionKeys = [
  'insAnnDescription', 'event_description', 'dAbout', 'department_about', 'applicationAbout',
  'application_about', 'activity_description', 'act_description', 'sub_head_body',
  'body_description', 'description', 'about', 'message', 'content', 'body', 'info',
  'admission_about', 'custom_head_about', 'leading_person_message', 'founder_message_message',
];
const fileKeys = [
  'pdf_key', 'attach', 'attachment', 'file', 'file_key', 'document', 'document_key',
  'applicationPhoto', 'event_banner', 'notice_attach', 'report', 'report_pdf',
  'permission_letter', 'activity_report', 'attendance', 'org_structure', 'organisation_structure',
];
const imageKeys = [
  'insAnnPhoto', 'staffProfilePhoto', 'staff_profile_photo', 'userProfilePhoto', 'body_photo',
  'sub_heading_image', 'image', 'image_key', 'photo', 'photo_key', 'image_url', 'gallery_image',
  'event_banner', 'library_image', 'about_photo', 'leading_person_photo', 'founder_message_image',
];
const childKeys = [
  'children', 'data_list', 'second_level', 'third_level', 'fourth_level', 'inner_card',
  'nested_inner_card', 'nested_nested_card', 'nested_nested_nested_card', 'outer_tab_nested',
  'ss_outer_tab_nested', 'naac_outer_tab_nested', 'aqar_outer_tab_nested', 'nirf_outer_tab_nested',
  'governing_body', 'society_governing_body', 'all_depart', 'departments', 'department', 'apps',
];
const sectionLabels: Record<string, string> = {
  about: 'About', admission_about: 'About admissions', vision: 'Vision', mission: 'Mission',
  department_vision: 'Vision', department_mission: 'Mission', po_pso: 'Programme outcomes',
  department_vission: 'Vision', department_hod_message: 'Head of department',
  hod_message: 'Head of department', hod_message_message: 'Head of department',
  syllabus: 'Syllabus', laboratory: 'Laboratory', student_achievements: 'Student achievements',
  department_contact: 'Department contacts', library_contact: 'Library contacts',
  library_message: 'Librarian’s message', library_rule: 'Library rules', library_timing: 'Library hours',
  library_mission: 'Library mission', library_vision: 'Library vision', eresources: 'Electronic resources',
  digital_library: 'Digital library', admission_process: 'Admission process',
  admission_document: 'Admission documents', admission_documents: 'Admission documents',
  admission_contact: 'Admission contacts', manual_examination: 'Examination manual',
  examination_schedule: 'Examination schedule', examination_timetable: 'Examination timetable',
  examination_notification: 'Examination notifications', hall_ticket: 'Hall tickets',
  composition: 'Composition', meetings: 'Meetings', meeting: 'Meetings', audit_reports: 'Audit reports',
  outer_tab_nested: 'Documents', authority: 'Committees', contact: 'Contact',
  professional_body: 'Professional bodies', student_associations: 'Student associations',
  innovative_practices: 'Innovative practices', projects: 'Projects', sops: 'Standard procedures',
  e_pedagogy: 'Electronic pedagogy', rnd_mou: 'Research collaborations', rnd_paper: 'Research papers',
  rnd_activities: 'Research activities', rnd_projects: 'Research projects',
};

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}
function textAt(value: JsonRecord, keys: readonly string[]): string {
  for (const key of keys) {
    const text = plainText(value[key]);
    if (text) return text;
  }
  return '';
}
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function refId(value: unknown): string | undefined {
  const id = typeof value === 'string' ? value : record(value)._id;
  return isId(id) ? id : undefined;
}
function stableId(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `content-${(hash >>> 0).toString(36)}`;
}
function unique(items: ContentItem[]): ContentItem[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
function explore(module: string, id?: string, query: Query = {}, pagePath = '/explore/'): string {
  const params = new URLSearchParams({ module });
  if (id) params.set('id', id);
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  return `${pagePath}?${params}`;
}
function imageUrl(value: unknown, base: string): string | undefined {
  const url = assetUrl(value, base);
  // Public uploads also use opaque extensionless keys; the CDN supplies their MIME type.
  return url && !/\.(?:pdf|docx?|xlsx?|pptx?|csv|zip|rar|mp[34]|webm|mov|avi)(?:[?#]|$)/i.test(url) ? url : undefined;
}

/** Normalizes public content recursively without modifying API objects or trusting backend HTML. */
export function normalizeContent(value: unknown, options: ContentOptions = {}): ContentItem[] {
  const base = options.assetBaseUrl ?? defaultCdn;
  const visit = (input: unknown, depth: number, path: string): ContentItem[] => {
    if (depth > 12 || input === null || input === undefined) return [];
    if (Array.isArray(input)) return input.flatMap((entry, index) => visit(entry, depth + 1, `${path}.${index}`));
    if (typeof input === 'string') {
      const description = plainText(input);
      return description ? [{ id: stableId(`${path}:${description}`), title: options.defaultTitle ?? 'Information', description }] : [];
    }
    if (typeof input !== 'object') return [];
    const item = record(input);
    const staffName = plainText(staffFullName({
      staffFirstName: typeof item.staffFirstName === 'string' ? item.staffFirstName : undefined,
      staffMiddleName: typeof item.staffMiddleName === 'string' ? item.staffMiddleName : undefined,
      staffLastName: typeof item.staffLastName === 'string' ? item.staffLastName : undefined,
      staff_dynamic_field: list(item.staff_dynamic_field).map((raw) => ({ key: plainText(record(raw).key), value: record(raw).value })),
    }));
    const title = staffName || textAt(item, titleKeys) || textAt(record(item.title_master), ['name'])
      || textAt(record(item.leading_person), ['userLegalName']) || options.defaultTitle || 'Information';
    const description = textAt(item, descriptionKeys);
    const id = textAt(item, ['_id', 'id']) || stableId(`${path}:${title}:${description}`);
    const files: { label: string; url: string }[] = [];
    const seen = new Set<string>();
    const addFile = (file: unknown, label: string) => {
      if (Array.isArray(file)) { for (const entry of file) addFile(entry, label); return; }
      if (file && typeof file === 'object') {
        const attachment = record(file);
        const key = attachment.url ?? attachment.documentKey ?? attachment.pdf_key ?? attachment.attach ?? attachment.attachment ?? attachment.file_key ?? attachment.key;
        addFile(key, textAt(attachment, ['name', 'title', 'label', 'documentName']) || label);
        return;
      }
      const url = assetUrl(file, base);
      if (url && !seen.has(url)) { seen.add(url); files.push({ label, url }); }
    };
    for (const key of fileKeys) addFile(item[key], key === 'applicationPhoto' ? 'Application brochure' : title === 'Information' ? 'View document' : title);
    for (const key of ['attachments', 'files', 'documents', 'announcementDocument']) addFile(item[key], 'View document');
    let image: string | undefined;
    for (const key of imageKeys) { image = imageUrl(item[key], base); if (image) break; }
    if (!image) image = imageUrl(record(item.leading_person).userProfilePhoto, base);
    if (!image) for (const entry of list(item.activity_images ?? item.images)) { image = imageUrl(entry, base); if (image) break; }
    const href = safeUrl(textAt(item, ['application_link', 'link_url', 'link', 'url', 'href', 'link_images', 'video_link', 'video_url', 'video']));
    const children = childKeys.flatMap((key) => visit(item[key], depth + 1, `${path}.${key}`));
    const meta = [
      textAt(item, ['staffDesignation', 'staff_designation', 'current_designation', 'designation', 'body_designation', 'leading_person_position', 'founder_message_designation']),
      textAt(item, ['event_location', 'event_place', 'location', 'company_name', 'institution_industry']),
      textAt(item, ['event_time']), textAt(item, ['bookAuthor', 'author']) || list(item.author_master).map((author) => textAt(record(author), ['name'])).filter(Boolean).join(', '),
      textAt(item, ['bookSubject', 'subject']) || textAt(record(item.subject_master), ['name']),
      textAt(item, ['durations']), textAt(item, ['staffEmail', 'staff_email', 'email', 'contact_email', 'contact_person_email']),
      textAt(item, ['staffMobileNo', 'staffPhoneNumber', 'phone', 'phone_number', 'contact_number', 'contact_person_mobile']),
    ].filter(Boolean);
    const date = textAt(item, ['event_date', 'activity_date', 'date', 'createdAt', 'application_start_date']);
    const result: ContentItem = { id, title, description };
    if (date) result.date = date;
    if (image) result.image = image;
    if (files.length) result.files = files;
    if (href) result.href = href;
    else if (options.module && isId(id)) result.href = explore(options.module, id, {}, options.pagePath);
    if (children.length) result.children = unique(children);
    if (meta.length) result.meta = [...new Set(meta)];
    if (options.admissionAdminId) result.admissionAdminId = options.admissionAdminId;
    if (!description && title === 'Information' && !image && !files.length && !children.length && !href && !meta.length) return [];
    return [result];
  };
  return unique(visit(value, 0, 'root'));
}

/** Converts structured department/library/examination sections into labelled content groups. */
function sections(value: unknown, options: ContentOptions = {}): ContentItem[] {
  const source = record(value);
  const result: ContentItem[] = [];
  for (const [key, label] of Object.entries(sectionLabels)) {
    const raw = source[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const items = normalizeContent(raw, { ...options, defaultTitle: label, module: undefined });
    if (!items.length) continue;
    if (typeof raw === 'string') result.push(...items);
    else result.push({ id: `section-${key}`, title: label, description: '', children: items });
  }
  // Tenant-defined document trees have varied prefixes, but all use the same nested card schema.
  for (const [key, raw] of Object.entries(source)) {
    if (!(key.endsWith('_outer_tab_nested') || key === 'outer_tab_nested') || sectionLabels[key]) continue;
    result.push(...normalizeContent(raw, { ...options, module: undefined }));
  }
  const basic = normalizeContent(source, { ...options, module: undefined });
  if (basic[0] && (basic[0].description || basic[0].files?.length || basic[0].image)) result.unshift(...basic.map(({ children: _children, ...item }) => item));
  return unique(result);
}

function required(value: string | undefined, label: string): string {
  if (!isId(value)) throw new CollegeApiError('input', `${label} is not configured for this college.`);
  return value;
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'The API request failed.'; }
function contentOptions(client: CollegeClient, module?: string): ContentOptions {
  return { assetBaseUrl: client.assetBaseUrl ?? defaultCdn, module };
}

/** Snapshot readers retain successful siblings; page readers surface a failed dependency. */
async function collectItems(
  reads: [string, () => Promise<ContentItem[]>][],
  onWarning?: (message: string) => void,
): Promise<ContentItem[]> {
  const results = await Promise.allSettled(reads.map(([, read]) => read()));
  const items: ContentItem[] = [];
  let failed = false;
  let firstError: unknown;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') items.push(...result.value);
    else {
      if (!failed) firstError = result.reason;
      failed = true;
      onWarning?.(`${reads[index]![0]}: ${errorMessage(result.reason)}`);
    }
  });
  if (failed && !onWarning) throw firstError;
  return unique(items);
}

/** Loads dependent type names, then their departments, together with independent departments. */
async function departmentItems(client: CollegeClient, tenant: TenantContext, onWarning?: (message: string) => void): Promise<ContentItem[]> {
  const options = contentOptions(client, 'department');
  const dependent = async () => {
    const rows = list((await client.landing.pinnedDepartments(tenant.instituteId, { flow: 'DEPENDENT' })).ins);
    const types = rows.filter((item): item is string => typeof item === 'string');
    const children = await collectItems(types.map((type) => [type, async () => {
      const response = await client.landing.pinnedDepartment(tenant.instituteId, { type });
      const groups = groupDepartments(list(response.ins).map(record), { host: tenant.host, dependentType: type });
      return [
        ...normalizeContent(groups.regular, options).map((item) => ({ ...item, meta: [...(item.meta ?? []), type] })),
        ...normalizeContent(groups.selfFinancing, options).map((item) => ({ ...item, meta: [...(item.meta ?? []), type, 'Self-financing'] })),
      ];
    }]), onWarning);
    return [...normalizeContent(rows.filter((item) => typeof item !== 'string'), options), ...children];
  };
  return collectItems([
    ['Independent departments', async () => normalizeContent(list((await client.landing.pinnedDepartments(tenant.instituteId, { flow: 'INDEPENDENT' })).ins), options)],
    ['Dependent departments', dependent],
  ], onWarning);
}

async function applicationItems(client: CollegeClient, tenant: TenantContext, onWarning?: (message: string) => void): Promise<ContentItem[]> {
  const ids = tenant.admissionAdminIds ?? (tenant.admissionAdminId ? [tenant.admissionAdminId] : []);
  return collectItems(ids.map((admissionAdminId, index) => [`Admission office ${index + 1}`, async () => {
    const response = await client.admissions.ongoing(admissionAdminId);
    const ongoing = record(response.ads_obj).ongoing;
    if (!Array.isArray(ongoing)) throw invalidApiResponse('Missing or invalid response data: ads_obj.ongoing.', response);
    return ongoing.flatMap((group: unknown) => {
      const groupRecord = record(group);
      return normalizeContent(list(groupRecord.apps).filter((app) => record(app).visible_to_site === 'Open'), {
        ...contentOptions(client), admissionAdminId,
      }).map((item) => ({
        ...item,
        href: item.href ?? `https://qvipleweb.web.app/application-form/${encodeURIComponent(item.id)}`,
        meta: [...(item.meta ?? []), plainText(groupRecord.group_name)].filter(Boolean),
      }));
    });
  }]), onWarning);
}

const moduleDefinitions: [string, string, string, string?][] = [
  ['about', 'Our college', 'about'], ['academic_course', 'Courses', 'courses'],
  ['department', 'Departments', 'departments'], ['admission', 'Admissions', 'admissions'],
  ['examination', 'Examinations', 'examinations'], ['notice', 'Notices', 'notices'],
  ['events', 'Events', 'events'], ['library', 'Library', 'library'],
  ['iqac', 'IQAC', 'iqac'], ['committee', 'Committees', 'committee'], ['naac', 'NAAC', 'naac'],
  ['aqar', 'AQAR', 'aqar'], ['nirf', 'NIRF', 'nirf'], ['institutional', 'Institutional documents', 'institutional'], ['special', 'Special documents', 'special'],
  ['rnd', 'Research', 'rnd'], ['student_corner', 'Student corner', 'student-corner'],
  ['image_gallery', 'Photo gallery', 'gallery'], ['video_gallery', 'Video gallery', 'videos'],
  ['alumni', 'Alumni', 'alumni'], ['contact_us', 'Contact', 'contact'],
  ['faculty', 'Faculty and staff', 'faculty', 'about'],
  ['applications', 'Open applications', 'applications', 'new_admission'],
  ['scholarships', 'Scholarships', 'scholarships', 'admission'],
  ['documents', 'Admission documents', 'documents', 'admission'],
  ['activities', 'Activities', 'activities', 'department'],
  ['projects', 'Student projects', 'projects', 'student_projects'],
  ['governance', 'College governance', 'governance', 'about'],
  ['society', 'Our society', 'society', 'about'],
];

/** Resolves a host, then settles optional public reads independently. No mutation is sent. */
export async function loadWebsite(client: CollegeClient, host = 'bhavanschowpatty.ac.in'): Promise<WebsiteSnapshot> {
  const tenant = await resolveTenant(client, host);
  const profile = record(tenant.profile);
  const control = record(profile.landing_control);
  const header = record(control.home_header_object);
  const about = record(control.about_us_institute_object);
  const shortName = textAt(profile, ['name']);
  const fullName = textAt(header, ['ins_name']) || textAt(about, ['ins_name']) || textAt(profile, ['insName']) || tenant.host;
  const snapshot: WebsiteSnapshot = {
    schemaVersion: 1, host: tenant.host, capturedAt: new Date().toISOString(), tenant,
    brand: {
      name: shortName || fullName, fullName,
      address: textAt(header, ['ins_address']) || textAt(profile, ['insAddress']),
      email: textAt(header, ['ins_email']) || textAt(profile, ['insEmail']),
      phone: textAt(header, ['ins_phone_number']) || textAt(profile, ['insPhoneNumber']),
      affiliation: textAt(header, ['affiliation_with']), accreditation: textAt(header, ['accreditations']),
      logo: assetUrl(header.ins_logo ?? profile.insProfilePhoto ?? tenant.dashboard.insProfilePhoto, client.assetBaseUrl ?? defaultCdn) ?? '',
      heroImages: list(record(control.home_background_object).images).flatMap((key) => {
        const url = assetUrl(key, client.assetBaseUrl ?? defaultCdn); return url ? [url] : [];
      }),
      about: textAt(record(control.home_about_institute_object), ['about']) || textAt(about, ['ins_about']),
      vision: textAt(about, ['vision']), mission: textAt(about, ['mission']),
    },
    modules: [], notices: [], departments: [], events: [], applications: [], studentCorner: [],
    dynamicTabs: [], gallery: [], governance: [], warnings: [],
  };
  const switches = enabledModules(tenant.profile);
  const aboutSwitches = record(control.about_us_toggle);
  const aboutKeys: Record<string, string> = { faculty: 'faculties', governance: 'governing_body', society: 'about_society' };
  snapshot.modules = moduleDefinitions.filter(([key, , , parent]) => switches[key] !== false
    && (!parent || switches[parent] !== false)
    && (key !== 'institutional' || switches.iqac !== false)
    && (!aboutKeys[key] || aboutSwitches[aboutKeys[key]!] !== false))
    .map(([key, label, module]) => ({ key, label, href: explore(module) }));
  type Collection = 'notices' | 'departments' | 'events' | 'applications' | 'studentCorner' | 'dynamicTabs' | 'gallery' | 'governance';
  const jobs: [Collection, string, () => Promise<ContentItem[]>][] = [
    ['notices', 'Notices', async () => normalizeContent((await client.institutes.announcements(tenant.instituteId, { page: 1, limit: 6 })).announcement, contentOptions(client, 'announcement'))],
    ['departments', 'Departments', () => departmentItems(client, tenant, (message) => snapshot.warnings.push(`Departments — ${message}`))],
    ['applications', 'Admissions', () => applicationItems(client, tenant, (message) => snapshot.warnings.push(`Admissions — ${message}`))],
    ['events', 'Events', async () => {
      const ids = tenant.eventManagerIds ?? (tenant.eventManagerId ? [tenant.eventManagerId] : []);
      return collectItems(ids.map((id, index) => [`Event manager ${index + 1}`, async () => normalizeContent((await client.events.list(id, { page: 1, limit: 4 })).all_events, contentOptions(client, 'event'))]), (message) => snapshot.warnings.push(`Events — ${message}`));
    }],
  ];
  if (tenant.landingControlId) {
    const id = tenant.landingControlId;
    jobs.push(
      ['studentCorner', 'Student corner', async () => normalizeContent((await client.site.studentCorner(id)).student_corner, contentOptions(client, 'student-corner'))],
      ['dynamicTabs', 'Custom tabs', async () => normalizeContent((await client.site.dynamicTabs(id)).dynamic_tab, contentOptions(client, 'dynamic'))],
      ['governance', 'Governance', async () => normalizeContent((await client.site.governingCategories(id, { page: 1, limit: 20 })).category_list, contentOptions(client, 'governance'))],
    );
  }
  jobs.push(['gallery', 'Photo gallery', async () => {
    const batches = (await client.institutes.batches(tenant.instituteId, { page: 1, limit: 20 })).all_batch;
    const bid = refId(batches[0]);
    if (!bid) return [];
    return normalizeContent((await client.gallery.imageCategories(tenant.instituteId, { bid })).gallery_category, contentOptions(client, 'gallery')).map((item) => ({ ...item, href: explore('gallery', item.id, { bid }) }));
  }]);
  const results = await Promise.allSettled(jobs.map(([, , read]) => read()));
  results.forEach((result, index) => {
    const job = jobs[index]!;
    if (result.status === 'fulfilled') snapshot[job[0]] = result.value;
    else snapshot.warnings.push(`${job[1]}: ${errorMessage(result.reason)}`);
  });
  return snapshot;
}

function findItem(items: ContentItem[], id: string): ContentItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = findItem(item.children ?? [], id);
    if (child) return child;
  }
  return undefined;
}

/** Reads pages through the same client and domain IDs used by the original sites.
 * Failures are propagated so callers can show retryable errors separately from empty content.
 */
export async function loadWebsitePage(
  client: CollegeClient,
  tenant: TenantContext,
  module: string,
  params: WebsitePageParams = {},
): Promise<WebsitePage> {
  const id = typeof params.id === 'string' ? params.id : undefined;
  const categoryId = typeof params.categoryId === 'string' ? params.categoryId : undefined;
  const pagination = normalizePagination(params.page, params.limit);
  const query: Query = { ...params, ...pagination };
  delete query.id;
  delete query.categoryId;
  const options = contentOptions(client);
  const normalize = (value: unknown, target?: string) => normalizeContent(value, { ...options, module: target });
  const page = (title: string, value: unknown, target?: string, total?: number, paginated = false): WebsitePage => {
    const items = normalize(value, target);
    return { title, items, ...(total === undefined ? {} : { total }),
      ...(paginated ? { hasMore: total === undefined ? list(value).length >= pagination.limit : pagination.page * pagination.limit < total } : {}) };
  };
  const landingId = () => required(tenant.landingControlId, 'Website configuration');
  const admissionIds = () => id ? [required(id, 'Admission office')] : tenant.admissionAdminIds ?? (tenant.admissionAdminId ? [tenant.admissionAdminId] : []);
  const admissionReads = async (read: (adminId: string) => Promise<ContentItem[]>): Promise<ContentItem[]> => {
    const ids = admissionIds();
    if (!ids.length) throw new CollegeApiError('input', 'An admission office is not configured for this college.');
    return unique((await Promise.all(ids.map(read))).flat());
  };
  const selectStaff = <T extends JsonRecord>(people: T[], defaultCategory?: StaffCategory): T[] => {
    const category = ['teaching', 'non-teaching', 'other'].includes(String(params.category))
      ? params.category as StaffCategory : defaultCategory;
    const selected = category ? filterStaff(people, category, {
      policy: tenant.host.toLowerCase().includes('somani') ? 'somani' : 'bhavan',
      active: typeof params.active === 'string' ? params.active : undefined,
    }) : people;
    return filterStaffByName(selected, typeof params.search === 'string' ? params.search : '', {
      departmentName: typeof params.departmentName === 'string' ? params.departmentName : undefined,
    });
  };

  switch (module) {
    case 'notices':
      return page('Notices and circulars', (await client.institutes.announcements(tenant.instituteId, query)).announcement, 'announcement', undefined, true);
    case 'announcement': {
      const announcement = (await client.institutes.announcement(required(id, 'Announcement'))).announcement;
      return page(textAt(announcement, titleKeys) || 'Announcement', announcement);
    }
    case 'departments':
      return { title: 'Academic departments', items: await departmentItems(client, tenant) };
    case 'department': {
      if (!id) return { title: 'Academic departments', items: await departmentItems(client, tenant) };
      const departmentId = required(id, 'Department');
      const response = (await client.site.department(departmentId)).department_site;
      const items = sections(response, { ...options, defaultTitle: 'About the department' });
      items.push(
        { id: 'department-faculty', title: 'Faculty', description: 'Meet the department’s faculty.', href: explore('faculty', departmentId) },
        { id: 'department-activities', title: 'Activities', description: 'Department activities and reports.', href: explore('activities', undefined, { sid: departmentId, flow: 'DEPARTMENT' }) },
        { id: 'department-mous', title: 'Collaborations and MOUs', description: '', href: explore('mous', departmentId) },
        { id: 'department-fees', title: 'Fee structures', description: '', href: explore('fees', departmentId) },
      );
      return { title: textAt(response, ['department_name', 'dName']) || 'Department', items };
    }
    case 'faculty': {
      // Source college sites fetch their complete published directory before local classification/search.
      const directoryQuery = { page: 1, limit: 1000 };
      const staff = id
        ? (await client.landing.faculty(required(id, 'Department'), directoryQuery)).all_staff
        : (await client.institutes.staff(tenant.instituteId, directoryQuery)).staffIns;
      const result = paginate(normalize(selectStaff(staff, id ? undefined : 'teaching'), 'staff'), pagination.page, pagination.limit);
      return { title: 'Faculty and staff', items: result.items, total: result.total, hasMore: result.page < result.totalPages };
    }
    case 'staff': {
      if (!id) {
        const staff = (await client.institutes.staff(tenant.instituteId, { page: 1, limit: 1000 })).staffIns;
        const result = paginate(normalize(selectStaff(staff), 'staff'), pagination.page, pagination.limit);
        return { title: 'Faculty and staff', items: result.items, total: result.total, hasMore: result.page < result.totalPages };
      }
      const staff = (await client.institutes.staffDetail(required(id, 'Staff member'))).staff_detail;
      const items = normalize(staff);
      // Dynamic CV fields are data, never executable markup or CSS.
      const extra = list(staff.staff_dynamic_field).flatMap((raw) => {
        const field = record(raw);
        const value = plainText(field.value);
        if (!value) return [];
        const label = plainText(field.key).replace(/\d{10,}$/g, '').replace(/_/g, ' ');
        return [{ id: refId(field) ?? stableId(label), title: label || 'Professional details', description: value }];
      });
      return { title: items[0]?.title ?? 'Staff profile', items: [...items, ...extra] };
    }
    case 'admissions':
    case 'admission': {
      const items = await admissionReads(async (adminId) => sections((await client.site.admission(adminId)).admission_site, options));
      // This route makes the application read separately, so its failure never hides published instructions.
      items.push({ id: 'open-applications', title: 'Open applications', description: 'View the current applications published by the admission offices.', href: explore('applications') });
      items.push({ id: 'admission-scholarships', title: 'Scholarships', description: '', href: explore('scholarships') });
      items.push({ id: 'admission-documents', title: 'Required documents', description: '', href: explore('documents') });
      return { title: 'Admissions', items };
    }
    case 'applications':
      return { title: 'Open admission applications', items: await applicationItems(client, tenant) };
    case 'application': {
      const applicationId = required(id, 'Admission application');
      const application = (await client.admissions.application(applicationId)).oneApply;
      const items = normalize(application).map((item) => ({ ...item, href: item.href ?? `https://qvipleweb.web.app/application-form/${applicationId}` }));
      return { title: items[0]?.title ?? 'Admission application', items };
    }
    case 'scholarships': {
      let hasMore = false;
      const items = await admissionReads(async (adminId) => {
        const response = await client.admissions.scholarships(adminId, query);
        if (response.all_scholar.length >= pagination.limit) hasMore = true;
        return normalize(response.all_scholar);
      });
      return { title: 'Scholarships', items, hasMore };
    }
    case 'documents': {
      let total = 0;
      let hasMore = false;
      const items = await admissionReads(async (adminId) => {
        const response = await client.admissions.documents(adminId, query);
        total += response.count;
        if (pagination.page * pagination.limit < response.count) hasMore = true;
        return normalize(response.all_docs);
      });
      return { title: 'Admission documents', items, total, hasMore };
    }
    case 'fees': {
      if (params.structureId) return page('Fee structure', (await client.finance.structure(required(String(params.structureId), 'Fee structure'))).structure);
      if (!id) return { title: 'Fee structures', items: (await departmentItems(client, tenant)).map((item) => ({ ...item, href: explore('fees', item.id) })) };
      const rows = (await client.finance.structures(required(id, 'Department'), query)).all_structures;
      return { ...page('Fee structures', rows, undefined, undefined, true), items: normalize(rows).map((item) => ({ ...item, href: explore('fees', id, { structureId: item.id }) })) };
    }
    case 'events': {
      const ids = id ? [required(id, 'Event manager')] : tenant.eventManagerIds ?? (tenant.eventManagerId ? [tenant.eventManagerId] : []);
      if (!ids.length) return { title: 'Events', items: [] };
      const responses = await Promise.all(ids.map((managerId) => client.events.list(managerId, query)));
      const items = unique(responses.flatMap((response) => normalize(response.all_events, 'event')));
      const total = responses.reduce((sum, response) => sum + response.count, 0);
      return { title: 'Events', items, total, hasMore: responses.some((response) => pagination.page * pagination.limit < response.count) };
    }
    case 'event': {
      const event = (await client.events.one(required(id, 'Event'))).one_event;
      return page(textAt(event, titleKeys) || 'Event', event);
    }
    case 'examinations':
    case 'examination': {
      const landing = (await client.landing.examinations(landingId())).landing;
      return { title: 'Examinations', items: sections(landing, options) };
    }
    case 'library':
    case 'library-books': {
      const libraryId = required(id ?? tenant.libraryId, 'Library');
      if (module === 'library-books' || params.view === 'books') {
        return page('Library catalogue', (await client.library.books(libraryId, query)).books, undefined, undefined, true);
      }
      if (Object.hasOwn(params, 'search') || params.view === 'opac') {
        return page('Library catalogue search', (await client.library.opac(libraryId, query)).books, undefined, undefined, true);
      }
      const items = sections((await client.site.library(libraryId)).library_site, { ...options, defaultTitle: 'Library' });
      items.push({ id: 'library-catalogue', title: 'Library catalogue', description: 'Browse the published book catalogue, or search by title, author or subject.', href: explore('library-books', libraryId) });
      return { title: 'Library', items };
    }
    case 'dynamic': {
      const value = id
        ? (await client.site.dynamicChildren(required(id, 'Custom tab'), query)).data_list
        : (await client.site.dynamicTabs(landingId())).dynamic_tab;
      const link = (items: ContentItem[], rootId?: string): ContentItem[] => items.map((item) => ({
        ...item,
        href: item.href ?? item.files?.[0]?.url ?? explore('dynamic', rootId ?? item.id, rootId ? { ...query, parent_key: item.id } : {}),
        ...(item.children ? { children: link(item.children, rootId ?? item.id) } : {}),
      }));
      return { title: 'College resources', items: link(normalize(value), id) };
    }
    case 'module': {
      const value = id
        ? (await client.site.moduleChildren(required(id, 'Module tab'), query)).data_list
        : (await client.site.moduleTabs(landingId(), query)).dynamic_tab;
      const link = (items: ContentItem[], rootId?: string): ContentItem[] => items.map((item) => ({
        ...item,
        href: item.href ?? item.files?.[0]?.url ?? explore('module', rootId ?? item.id, { ...query, ...(rootId ? { parent_key: item.id } : {}) }),
        ...(item.children ? { children: link(item.children, rootId ?? item.id) } : {}),
      }));
      return { title: 'College resources', items: link(normalize(value), id) };
    }
    case 'student-corner': {
      const items = normalize((await client.site.studentCorner(landingId())).student_corner);
      if (!id) return { title: 'Student corner', items };
      const selected = findItem(items, id);
      if (!selected) throw new CollegeApiError('response', 'This student resource was not found.');
      return { title: selected.title, items: selected.children?.length ? selected.children : [selected] };
    }
    case 'governance':
    case 'society': {
      const cid = categoryId ?? id;
      const lcid = landingId();
      if (cid) {
        const value = module === 'society'
          ? (await client.site.societyBody(lcid, required(cid, 'Governing category'), query)).category_body_list
          : (await client.site.governingBody(lcid, required(cid, 'Governing category'), query)).category_body_list;
        return page(module === 'society' ? 'Society governing body' : 'Governing body', value, undefined, undefined, true);
      }
      const value = module === 'society'
        ? (await client.site.societyCategories(lcid, query)).category_list
        : (await client.site.governingCategories(lcid, query)).category_list;
      return page(module === 'society' ? 'Our society' : 'College governance', value, module, undefined, true);
    }
    case 'committee': {
      if (!id) {
        const dashboard = (await client.committees.dashboard(required(tenant.iqacId, 'Committee module'))).iqac;
        const authorities = list(dashboard.authority).filter((authority) => !['IQAC', 'NAAC', 'RND'].includes(plainText(record(authority).custom_head_name)));
        return page('College committees', authorities, 'committee');
      }
      const committeeId = required(id, 'Committee');
      if (params.view === 'composition') return page('Committee composition', (await client.committees.compositions(committeeId, query)).all_com, undefined, undefined, true);
      if (params.view === 'activities') return page('Committee activities', (await client.committees.activities(committeeId, query)).activity, 'activity', undefined, true);
      if (params.view === 'audit') return page('Audit reports', (await client.committees.auditReports(committeeId, query)).all_com, undefined, undefined, true);
      if (params.view === 'sections') return page('Committee sections', (await client.committees.sections(committeeId, query)).all, undefined, undefined, true);
      const custom = (await client.committees.custom(committeeId)).custom;
      const items = sections(custom, options);
      items.push({ id: 'committee-composition', title: 'Composition', description: '', href: explore('committee', committeeId, { view: 'composition' }) });
      items.push({ id: 'committee-activities', title: 'Activities', description: '', href: explore('committee', committeeId, { view: 'activities' }) });
      items.push({ id: 'committee-audits', title: 'Audit reports', description: '', href: explore('committee', committeeId, { view: 'audit' }) });
      items.push({ id: 'committee-sections', title: 'Sections', description: '', href: explore('committee', committeeId, { view: 'sections' }) });
      return { title: textAt(custom, titleKeys) || 'Committee', items };
    }
    case 'rnd': {
      let authorityId = id;
      let legacyDetailId: string | undefined;
      if (!authorityId) {
        const dashboard = (await client.committees.dashboard(required(tenant.iqacId, 'Research module'))).iqac;
        const authority = list(dashboard.authority).find((item) => record(item).custom_head_name === 'RND');
        authorityId = refId(authority);
        legacyDetailId = refId(record(authority).iqac_detail);
        if (!authorityId) return { title: 'Research and development', items: [] };
      }
      const rndId = required(authorityId, 'Research authority');
      if (params.view === 'irins') return page('IRINS', (await client.committees.irins(rndId)).irins_list);
      if (params.view === 'composition') return page('Research committee composition', (await client.committees.compositions(rndId, query)).all_com, undefined, undefined, true);
      if (params.view === 'documents') {
        const detailId = typeof params.detailId === 'string' ? params.detailId : legacyDetailId ?? rndId;
        const detail = (await client.committees.iqacDetails(required(detailId, 'Research document detail'))).q_detail;
        return page('Research documents', detail.outer_tab_nested);
      }
      const custom = (await client.committees.custom(rndId)).custom;
      const items = sections(custom, { ...options, defaultTitle: 'Research and development' });
      items.push({ id: 'research-composition', title: 'Research committee composition', description: '', href: explore('rnd', rndId, { view: 'composition' }) });
      items.push({ id: 'research-irins', title: 'IRINS', description: '', href: explore('rnd', rndId, { view: 'irins' }) });
      if (legacyDetailId) items.push({ id: 'research-documents', title: 'Research documents', description: '', href: explore('rnd', rndId, { view: 'documents', detailId: legacyDetailId }) });
      return { title: 'Research and development', items };
    }
    case 'iqac':
    case 'naac':
    case 'aqar':
    case 'nirf':
    case 'institutional':
    case 'special': {
      let detailId = id;
      if (!detailId) {
        const dashboard = (await client.committees.dashboard(required(tenant.iqacId, 'Quality assurance module'))).iqac;
        const authorityName = 'IQAC';
        const authority = list(dashboard.authority).find((item) => record(item).custom_head_name === authorityName);
        detailId = refId(record(authority).iqac_detail);
        if (!detailId) return { title: module.toUpperCase(), items: [] };
      }
      const detail = (await client.committees.iqacDetails(required(detailId, 'Quality assurance detail'))).q_detail;
      const keys: Record<string, string> = { iqac: 'outer_tab_nested', rnd: 'outer_tab_nested', naac: 'naac_outer_tab_nested', aqar: 'aqar_outer_tab_nested', nirf: 'nirf_outer_tab_nested', institutional: 'indi_outer_tab_nested', special: 'ss_outer_tab_nested' };
      const items = normalize(detail[keys[module]!]);
      return { title: module.toUpperCase(), items };
    }
    case 'gallery':
    case 'videos': {
      const cid = categoryId ?? id;
      let bid = typeof params.bid === 'string' ? params.bid : undefined;
      if (!bid) {
        const batches = (await client.institutes.batches(tenant.instituteId, { page: 1, limit: 20 })).all_batch;
        if (!cid) return {
          title: module === 'gallery' ? 'Photo gallery' : 'Video gallery',
          items: normalize(batches).map((batch) => ({ ...batch, href: explore(module, undefined, { bid: batch.id }) })),
        };
        bid = refId(batches[0]);
      }
      if (!bid) return { title: module === 'gallery' ? 'Photo gallery' : 'Video gallery', items: [] };
      required(bid, 'Academic year');
      if (cid) {
        const all = cid === 'all' || (cid === tenant.instituteId && params.flow === 'INSTITUTE');
        const galleryId = all ? tenant.instituteId : required(cid, 'Gallery category');
        const galleryQuery = { ...query, batchId: typeof params.batchId === 'string' ? params.batchId : bid, flow: typeof params.flow === 'string' ? params.flow : all ? 'INSTITUTE' : 'CATEGORY' };
        const value = module === 'gallery'
          ? (await client.gallery.images(galleryId, galleryQuery)).image_list
          : (await client.gallery.videos(galleryId, galleryQuery)).video_list;
        const entries = list(value).map((entry, index) => typeof entry !== 'string' ? entry : module === 'gallery'
          ? { _id: stableId(entry), title: `Campus photograph ${index + 1}`, image: entry, link: assetUrl(entry, options.assetBaseUrl ?? defaultCdn) }
          : { _id: stableId(entry), title: `College video ${index + 1}`, video_link: entry });
        return page(module === 'gallery' ? 'Photo gallery' : 'Video gallery', entries);
      }
      const value = module === 'gallery'
        ? (await client.gallery.imageCategories(tenant.instituteId, { bid })).gallery_category
        : (await client.gallery.videoCategories(tenant.instituteId, { bid })).gallery_category;
      const items = normalize(value).map((item) => ({ ...item, href: explore(module, item.id, { bid }) }));
      items.unshift({ id: 'all-gallery', title: module === 'gallery' ? 'All photographs' : 'All videos', description: '', href: explore(module, 'all', { bid }) });
      return { title: module === 'gallery' ? 'Photo gallery' : 'Video gallery', items };
    }
    case 'activity': {
      const activity = (await client.site.activity(required(id, 'Activity'))).act;
      return page(textAt(activity, titleKeys) || 'Activity', activity);
    }
    case 'activities':
      return page('Activities', (await client.site.activities({ ...query, sid: params.sid ?? tenant.instituteId, flow: params.flow ?? 'INSTITUTE' })).all_act, 'activity', undefined, true);
    case 'projects':
      return page('Student projects', (await client.site.projects({ ...query, sid: params.sid ?? tenant.instituteId, flow: params.flow ?? 'INSTITUTE' })).all_act, 'activity', undefined, true);
    case 'mous':
      return page('Collaborations and MOUs', (await client.site.mous(required(id, 'Department'), query)).all_mou, undefined, undefined, true);
    case 'alumni': {
      const alumniId = required(id ?? tenant.alumniId, 'Alumni module');
      if (params.view === 'prominent') return page('Prominent alumni', (await client.alumni.prominent(alumniId, query)).all_prominent, undefined, undefined, true);
      if (params.view === 'feedback') return page('Alumni feedback', (await client.alumni.feedback(alumniId, query)).all_feedback_poll, undefined, undefined, true);
      const items = sections((await client.alumni.dashboard(alumniId)).one_alumini, options);
      items.push({ id: 'prominent-alumni', title: 'Prominent alumni', description: '', href: explore('alumni', alumniId, { view: 'prominent' }) });
      items.push({ id: 'alumni-feedback', title: 'Alumni feedback', description: '', href: explore('alumni', alumniId, { view: 'feedback' }) });
      return { title: 'Alumni', items };
    }
    case 'courses':
      return page('Academic courses', tenant.profile.landing_control?.academic_courses_desk ?? []);
    case 'about': {
      const control = record(tenant.profile.landing_control);
      const about = record(control.about_us_institute_object);
      const items = [
        ...normalize({ title: textAt(about, ['ins_name']) || 'Our college', description: about.ins_about }),
        ...sections(about, options),
        ...normalize(control.administration_object),
      ];
      items.push({ id: 'college-governance', title: 'College governance', description: '', href: explore('governance') });
      items.push({ id: 'college-society', title: 'Our society', description: '', href: explore('society') });
      return { title: 'Our college', items: unique(items) };
    }
    case 'contact': {
      const header = record(tenant.profile.landing_control?.home_header_object);
      const title = textAt(header, ['ins_name']) || plainText(tenant.profile.insName) || 'College office';
      const address = textAt(header, ['ins_address']) || plainText(tenant.profile.insAddress);
      const email = textAt(header, ['ins_email']) || plainText(tenant.profile.insEmail);
      const phone = textAt(header, ['ins_phone_number']) || plainText(tenant.profile.insPhoneNumber);
      return { title: 'Contact us', items: [{ id: 'college-contact', title, description: address, meta: [phone, email].filter(Boolean) }] };
    }
    default:
      throw new CollegeApiError('input', `Unknown college website module: ${module}.`);
  }
}
