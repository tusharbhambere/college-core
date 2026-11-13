import { CollegeApiError, getApiResponseMessage, invalidApiResponse, requireId } from './errors.js';
import type {
  Activity, AdmissionApplication, AdmissionGroups, AlumniRegistrationBody, Announcement, ApiResponse,
  Batch, Book, CollegeEvent, DomainMapping, DynamicTab, EventInquiryBody, GalleryCategory, GalleryImage,
  GalleryVideo, InquiryBody, Institute, JsonRecord, NewsletterBody, PaginationQuery, PublishCounterBody,
  PublishCounts, Query, SearchQuery, Staff, WebsiteProfile, Mou,
} from './models.js';

export interface CollegeClientOptions {
  /** Server origin, /api root, or complete /api/v3/public URL. */
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  /** Includes connection, headers, and reading/decoding the entire response body. Default: 15 seconds. */
  timeoutMs?: number;
  signal?: AbortSignal;
  assetBaseUrl?: string;
}
type Shape = 'array' | 'object' | 'object-or-array' | 'nullable-object' | 'number' | 'string' | 'present';
type Schema = Record<string, Shape>;
type Ids = Record<string, unknown>;
type Envelope<T extends object> = Promise<ApiResponse<T>>;
type List<K extends string, T = JsonRecord> = { [P in K]: T[] };
type One<K extends string, T = JsonRecord> = { [P in K]: T };

function publicBase(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new CollegeApiError('input', 'baseUrl must be an absolute HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new CollegeApiError('input', 'baseUrl must be an HTTP(S) URL without credentials, query, or fragment.');
  }
  const base = url.href.replace(/\/+$/, '');
  return base.endsWith('/api/v3/public') ? base : base.endsWith('/api') ? `${base}/v3/public` : `${base}/api/v3/public`;
}

function validate(payload: unknown, schema: Schema, path: string): asserts payload is ApiResponse {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw invalidApiResponse('Expected a JSON response object.', payload, path);
  const record = payload as JsonRecord;
  if (record.access === false) throw new CollegeApiError('api', getApiResponseMessage(payload) ?? 'The server rejected this request.', { path, response: payload });
  if (record.access !== undefined && typeof record.access !== 'boolean') throw invalidApiResponse('Invalid access flag in response.', payload, path);
  // The institute dashboard omits access on the deployed server. Required data is authoritative.
  for (const [key, shape] of Object.entries(schema)) {
    const value = record[key];
    const valid = Object.hasOwn(record, key) && value !== undefined && (
      shape === 'present' ||
      (shape === 'array' && Array.isArray(value)) ||
      (shape === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) ||
      (shape === 'object-or-array' && value !== null && typeof value === 'object') ||
      (shape === 'nullable-object' && (value === null || (typeof value === 'object' && !Array.isArray(value)))) ||
      (shape === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
      (shape === 'string' && typeof value === 'string')
    );
    if (!valid) throw invalidApiResponse(`Missing or invalid response data: ${key}.`, payload, path);
  }
}

/** Every method preserves the supplied v3 paths, query names, bodies, and response envelopes. */
export function createCollegeClient(options: CollegeClientOptions) {
  const baseUrl = publicBase(options.baseUrl);
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof fetcher !== 'function') throw new CollegeApiError('input', 'A fetch implementation is required.');
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new CollegeApiError('input', 'timeoutMs must be a positive finite number.');

  async function request<T extends object>(method: 'GET' | 'POST' | 'PATCH', template: string, schema: Schema, ids: Ids = {}, query?: Query, body?: object): Envelope<T> {
    const path = template.replace(/:([a-zA-Z][a-zA-Z0-9_]*)/g, (_, key: string) => requireId(ids[key], key));
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === '') continue;
      if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) throw new CollegeApiError('input', `Invalid query value for ${key}.`);
      url.searchParams.set(key, String(value));
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    const operation = async () => {
      let response: Response;
      try {
        response = await fetcher(url.href, {
          method, signal: controller.signal, headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
      } catch (cause) {
        if (cause instanceof CollegeApiError) throw cause;
        throw new CollegeApiError('network', 'Could not reach the college API.', { path, cause });
      }
      let payload: unknown;
      try { payload = await response.json(); }
      catch (cause) {
        if (!response.ok) throw new CollegeApiError('http', `College API returned HTTP ${response.status}.`, { path, status: response.status, cause });
        throw new CollegeApiError('json', 'College API did not return valid JSON.', { path, status: response.status, cause });
      }
      if (!response.ok) throw new CollegeApiError('http', getApiResponseMessage(payload) ?? `College API returned HTTP ${response.status}.`, { path, status: response.status, response: payload });
      validate(payload, schema, path);
      // Mutation routes have no data key. Require explicit success to distinguish malformed bodies.
      if (method !== 'GET' && Object.keys(schema).length === 0 && payload.access !== true) throw invalidApiResponse('The mutation response is missing its success flag.', payload, path);
      return payload as ApiResponse<T>;
    };
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new CollegeApiError('timeout', `College API request timed out after ${timeoutMs} ms.`, { path });
        reject(error);
        controller.abort(error);
      }, timeoutMs);
      onAbort = () => {
        const error = new CollegeApiError('aborted', 'College API request was cancelled.', { path });
        reject(error);
        controller.abort(options.signal?.reason);
      };
      options.signal?.addEventListener('abort', onAbort, { once: true });
      if (options.signal?.aborted) onAbort();
    });
    try {
      if (options.signal?.aborted) return await deadline;
      // No automatic retries: a write may have succeeded even when its response was lost.
      return await Promise.race([operation(), deadline]);
    } finally {
      clearTimeout(timer);
      if (onAbort) options.signal?.removeEventListener('abort', onAbort);
    }
  }
  const get = <T extends object>(path: string, schema: Schema, ids?: Ids, query?: Query) => request<T>('GET', path, schema, ids, query);
  const post = <T extends object = JsonRecord>(path: string, ids: Ids, body: object) => request<T>('POST', path, {}, ids, undefined, body);
  const patch = <T extends object = JsonRecord>(path: string, ids: Ids, body?: object, schema: Schema = {}) => request<T>('PATCH', path, schema, ids, undefined, body);

  return {
    baseUrl,
    assetBaseUrl: options.assetBaseUrl,
    institutes: {
      byHost: async (host: string): Envelope<One<'all_domain', DomainMapping | null>> => {
        if (typeof host !== 'string' || !host.trim()) throw new CollegeApiError('input', 'A host or subdomain is required.');
        return get('/ins/sub/domain/by/host', { all_domain: 'nullable-object' }, {}, { filter_by: host.trim() });
      },
      dashboard: (id: string) => get<One<'institute', Institute>>('/ins/:id/dash', { institute: 'object' }, { id }),
      announcements: (id: string, query?: PaginationQuery) => get<List<'announcement', Announcement>>('/ins/:id/announcemnt/query', { announcement: 'array' }, { id }, query),
      announcement: (aid: string) => get<One<'announcement', Announcement>>('/ins/one/announcement/:aid', { announcement: 'object' }, { aid }),
      departments: (id: string, query?: Query & { which_type?: string }) => get<One<'institute', Institute>>('/ins/:id/department', { institute: 'object' }, { id }, query),
      staff: (id: string, query?: PaginationQuery) => get<List<'staffIns', Staff>>('/staff/:id/approve-staff/detail/list', { staffIns: 'array' }, { id }, query),
      staffDetail: (sid: string) => get<One<'staff_detail', Staff>>('/staff/detail/custom/site/:sid/query', { staff_detail: 'object' }, { sid }),
      batches: (id: string, query?: PaginationQuery) => get<List<'all_batch', Batch>>('/ins/:id/all/universal/batch/query', { all_batch: 'array' }, { id }, query),
      mergedDepartments: (id: string, query?: PaginationQuery) => get<List<'all_depart', Institute>>('/ins/:id/all/merged/department', { all_depart: 'array' }, { id }, query),
    },
    landing: {
      profile: (id: string) => get<One<'one_ins', WebsiteProfile>>('/landing/:id/one/web/profile', { one_ins: 'object' }, { id }),
      faculty: (did: string, query?: PaginationQuery) => get<List<'all_staff', Staff>>('/landing/:did/all/faculty/query', { all_staff: 'array' }, { did }, query),
      pinnedDepartments: (id: string, query?: Query) => get<One<'ins', Institute | Array<JsonRecord | string>>>('/landing/:id/all/pinned/department/query', { ins: 'object-or-array' }, { id }, query),
      pinnedDepartment: (id: string, query?: Query) => get<One<'ins', Institute | Array<JsonRecord | string>>>('/landing/:id/one/pinned/department/query', { ins: 'object-or-array' }, { id }, query),
      examinations: (lcid: string) => get<One<'landing'>>('/landing/:lcid/all/examination/object/query', { landing: 'object' }, { lcid }),
    },
    admissions: {
      ongoing: (id: string) => get<One<'ads_obj', AdmissionGroups>>('/admission/:id/all/ongoing/application/grouped', { ads_obj: 'object' }, { id }),
      application: (aid: string) => get<One<'oneApply', AdmissionApplication>>('/admission/:aid/application/query', { oneApply: 'object' }, { aid }),
      dashboard: (aid: string, query?: Query) => get<One<'admission'> & One<'roles', unknown>>('/admission/:aid/dashboard/query', { admission: 'object', roles: 'present' }, { aid }, query),
      scholarships: (aid: string, query?: PaginationQuery & { status?: string }) => get<List<'all_scholar'>>('/admission/:aid/all/scholarship', { all_scholar: 'array' }, { aid }, query),
      documents: (aid: string, query?: PaginationQuery) => get<List<'all_docs'> & One<'count', number>>('/admission/:aid/all/document/array', { all_docs: 'array', count: 'number' }, { aid }, query),
      inquire: (aid: string, body: InquiryBody) => post('/landing/:aid/new/inquiry/query', { aid }, body),
    },
    finance: {
      structures: (did: string, query?: PaginationQuery & { filter_by?: string; batch_by?: string }) => get<List<'all_structures'>>('/finance/depart/:did/all/fee/structure', { all_structures: 'array' }, { did }, query),
      structure: (fsid: string) => get<One<'structure'>>('/finance/one/:fsid/structure', { structure: 'object' }, { fsid }),
    },
    library: {
      books: (lid: string, query?: SearchQuery) => get<List<'books', Book>>('/library/site/books/:lid', { books: 'array' }, { lid }, query),
      /** The backend returns [] for an empty search; it does not list the complete catalogue. */
      opac: (lid: string, query?: SearchQuery & { is_search_by?: 'subject' | 'author' | 'book_title' | string }) => get<List<'books', Book>>('/library/site/opac/book/:lid/list/query', { books: 'array' }, { lid }, query),
    },
    staff: { generateCv: (sid: string) => patch<One<'excel_key', string>>('/edit/staff/generate/cv/:sid/query', { sid }, undefined, { excel_key: 'string' }) },
    alumni: {
      dashboard: (aid: string) => get<One<'one_alumini'>>('/alumini/:aid/dashboard/query', { one_alumini: 'object' }, { aid }),
      prominent: (aid: string, query?: PaginationQuery) => get<List<'all_prominent'>>('/alumini/:aid/all/prominent/array', { all_prominent: 'array' }, { aid }, query),
      feedback: (aid: string, query?: PaginationQuery) => get<List<'all_feedback_poll'>>('/alumini/:aid/all/feed/question/array', { all_feedback_poll: 'array' }, { aid }, query),
      register: (aid: string, body: AlumniRegistrationBody) => post('/alumini/:aid/new/register', { aid }, body),
    },
    events: {
      list: (eid: string, query?: SearchQuery) => get<List<'all_events', CollegeEvent> & One<'count', number>>('/event/process/manager/:eid/all/events', { all_events: 'array', count: 'number' }, { eid }, query),
      one: (evid: string) => get<One<'one_event', CollegeEvent>>('/event/process/one/event/:evid', { one_event: 'object' }, { evid }),
      posts: (id: string, query?: PaginationQuery & { p_type?: string }) => get<List<'post'> & One<'postCount', number> & One<'totalPage', number>>('/event/dashboard/:id/all/ins/posts', { post: 'array', postCount: 'number', totalPage: 'number' }, { id }, query),
      side: (eid: string, query?: SearchQuery) => get<List<'all_side', CollegeEvent>>('/event/dashboard/:eid/all/side/event', { all_side: 'array' }, { eid }, query),
      inquire: (id: string, body: EventInquiryBody) => post('/event/dashboard/:id/new/event/inquiry/queue', { id }, body),
      subscribe: (id: string, body: NewsletterBody) => patch('/event/dashboard/:id/subscribe/newsletter', { id }, body),
    },
    site: {
      admission: (aid: string) => get<One<'admission_site'>>('/site/info/admission/:aid', { admission_site: 'object' }, { aid }),
      department: (did: string) => get<One<'department_site'>>('/site/info/department/:did', { department_site: 'object' }, { did }),
      library: (lid: string) => get<One<'library_site'>>('/site/info/library/:lid', { library_site: 'object' }, { lid }),
      opener: (id: string) => get<One<'institute', Institute | null>>('/site/institute/:id/opener', { institute: 'nullable-object' }, { id }),
      batches: (did: string, query?: PaginationQuery) => get<List<'all_batch', Batch>>('/site/:did/all/universal/batch/query', { all_batch: 'array' }, { did }, query),
      mous: (did: string, query?: SearchQuery & { batch?: string; u_batch?: string }) => get<List<'all_mou', Mou>>('/site/:did/all/mou/collab/query', { all_mou: 'array' }, { did }, query),
      activity: (acid: string) => get<One<'act', Activity>>('/site/:acid/one/activity/query', { act: 'object' }, { acid }),
      activities: (query?: SearchQuery) => get<List<'all_act', Activity>>('/site/all/activity/query', { all_act: 'array' }, {}, query),
      activitiesByType: (query?: SearchQuery) => get<List<'all_act', Activity>>('/site/all/activity/query/type', { all_act: 'array' }, {}, query),
      projects: (query?: PaginationQuery) => get<List<'all_act', Activity>>('/site/all/projects/query', { all_act: 'array' }, {}, query),
      dynamicTabs: (lcid: string) => get<List<'dynamic_tab', DynamicTab>>('/site/dynamic/:lcid/list/query', { dynamic_tab: 'array' }, { lcid }),
      dynamicChildren: (sdid: string, query?: Query & { parent_key?: string }) => get<List<'data_list', DynamicTab>>('/site/dynamic/nested/:sdid/list/query', { data_list: 'array' }, { sdid }, query),
      moduleTabs: (lcid: string, query?: Query & { is_flow?: string; module_type?: string }) => get<List<'dynamic_tab', DynamicTab>>('/site/module/dynamic/:lcid/list/query', { dynamic_tab: 'array' }, { lcid }, query),
      moduleChildren: (mdi: string, query?: Query & { parent_key?: string }) => get<List<'data_list', DynamicTab>>('/site/module/dynamic/nested/:mdi/list/query', { data_list: 'array' }, { mdi }, query),
      studentCorner: (lcid: string) => get<List<'student_corner'>>('/site/student/corner/:lcid/list/query', { student_corner: 'array' }, { lcid }),
      governingCategories: (lcid: string, query?: PaginationQuery) => get<List<'category_list'>>('/site/governing/:lcid/category/query', { category_list: 'array' }, { lcid }, query),
      governingBody: (lcid: string, cid: string, query?: PaginationQuery) => get<List<'category_body_list'>>('/site/governing/:lcid/category/:cid/body/query', { category_body_list: 'array' }, { lcid, cid }, query),
      societyCategories: (lcid: string, query?: PaginationQuery) => get<List<'category_list'>>('/site/society/governing/:lcid/category/query', { category_list: 'array' }, { lcid }, query),
      societyBody: (lcid: string, cid: string, query?: PaginationQuery) => get<List<'category_body_list'>>('/site/society/governing/:lcid/category/:cid/body/query', { category_body_list: 'array' }, { lcid, cid }, query),
      homeAbout: (id: string, query?: Query & { is_flow?: string }) => get<List<'home_about_list'>>('/site/home/about/list/:id/query', { home_about_list: 'array' }, { id }, query),
      principalMessages: (id: string, query?: Query & { is_flow?: string }) => get<List<'home_principal_message_list'>>('/site/home/principal/message/list/:id/query', { home_principal_message_list: 'array' }, { id }, query),
      otherModel: (id: string, query?: Query & { is_flow?: string }) => get<One<'other_data', unknown>>('/site/other/model/:id/query', { other_data: 'present' }, { id }, query),
      otherCategories: (id: string, query?: Query & { activity_type?: string }) => get<List<'activity_category'>>('/site/category/other/:id/detail/query', { activity_category: 'array' }, { id }, query),
      otherActivities: (cid: string) => get<List<'data_list'>>('/site/other/activity/:cid/detail/query', { data_list: 'array' }, { cid }),
      publishCounts: (id: string, query?: Query & { is_type?: string }) => get<One<'detail', PublishCounts>>('/site/author/publish/:id/detail/count', { detail: 'object' }, { id }, query),
      incrementPublishCounts: (id: string, body: PublishCounterBody) => patch('/site/author/publish/:id/update/count', { id }, body),
    },
    committees: {
      dashboard: (qid: string) => get<One<'iqac'>>('/committee/:qid/dashboard', { iqac: 'object' }, { qid }),
      custom: (qcid: string) => get<One<'custom'>>('/committee/:qcid/custom/dashboard', { custom: 'object' }, { qcid }),
      compositions: (qcid: string, query?: PaginationQuery) => get<List<'all_com'>>('/committee/:qcid/all/composition/query', { all_com: 'array' }, { qcid }, query),
      sections: (hid: string, query?: PaginationQuery) => get<List<'all'>>('/committee/:hid/all/sections/query', { all: 'array' }, { hid }, query),
      about: (qcid: string, query?: PaginationQuery) => get<List<'all_com'>>('/committee/:qcid/all/about/query', { all_com: 'array' }, { qcid }, query),
      auditReports: (qcid: string, query?: PaginationQuery) => get<List<'all_com'>>('/committee/:qcid/all/audit/reports/query', { all_com: 'array' }, { qcid }, query),
      naac: (qcid: string) => get<One<'custom'>>('/committee/:qcid/all/naac/master/query', { custom: 'object' }, { qcid }),
      activities: (cid: string, query?: PaginationQuery) => get<List<'activity', Activity>>('/committee/custom/authority/activity/:cid/list/query', { activity: 'array' }, { cid }, query),
      iqacDetails: (iqdid: string) => get<One<'q_detail'>>('/committee/new/iqac/detail/:iqdid/all/things', { q_detail: 'object' }, { iqdid }),
      irins: (cid: string) => get<List<'irins_list'>>('/committee/rnd/irins/list/:cid/query', { irins_list: 'array' }, { cid }),
    },
    gallery: {
      imageCategories: (id: string, query?: Query & { bid?: string }) => get<List<'gallery_category', GalleryCategory>>('/committee/image/gallery/institute/:id/category/list', { gallery_category: 'array' }, { id }, query),
      images: (cid: string, query?: Query & { flow?: string; batchId?: string }) => get<List<'image_list', GalleryImage | string>>('/committee/image/gallery/:cid/category/images/list', { image_list: 'array' }, { cid }, query),
      videoCategories: (id: string, query?: Query & { bid?: string }) => get<List<'gallery_category', GalleryCategory>>('/committee/video/gallery/institute/:id/category/list', { gallery_category: 'array' }, { id }, query),
      videos: (cid: string, query?: Query & { flow?: string; batchId?: string }) => get<List<'video_list', GalleryVideo | string>>('/committee/video/gallery/:cid/category/videos/list', { video_list: 'array' }, { cid }, query),
    },
  };
}
export type CollegeClient = ReturnType<typeof createCollegeClient>;
