import { CollegeApiError, getApiResponseMessage, invalidApiResponse, requireId } from './errors.js';
function publicBase(value) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new CollegeApiError('input', 'baseUrl must be an absolute HTTP(S) URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new CollegeApiError('input', 'baseUrl must be an HTTP(S) URL without credentials, query, or fragment.');
    }
    const base = url.href.replace(/\/+$/, '');
    return base.endsWith('/api/v3/public') ? base : base.endsWith('/api') ? `${base}/v3/public` : `${base}/api/v3/public`;
}
function validate(payload, schema, path) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
        throw invalidApiResponse('Expected a JSON response object.', payload, path);
    const record = payload;
    if (record.access === false)
        throw new CollegeApiError('api', getApiResponseMessage(payload) ?? 'The server rejected this request.', { path, response: payload });
    if (record.access !== undefined && typeof record.access !== 'boolean')
        throw invalidApiResponse('Invalid access flag in response.', payload, path);
    // The institute dashboard omits access on the deployed server. Required data is authoritative.
    for (const [key, shape] of Object.entries(schema)) {
        const value = record[key];
        const valid = Object.hasOwn(record, key) && value !== undefined && (shape === 'present' ||
            (shape === 'array' && Array.isArray(value)) ||
            (shape === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) ||
            (shape === 'object-or-array' && value !== null && typeof value === 'object') ||
            (shape === 'nullable-object' && (value === null || (typeof value === 'object' && !Array.isArray(value)))) ||
            (shape === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
            (shape === 'string' && typeof value === 'string'));
        if (!valid)
            throw invalidApiResponse(`Missing or invalid response data: ${key}.`, payload, path);
    }
}
/** Every method preserves the supplied v3 paths, query names, bodies, and response envelopes. */
export function createCollegeClient(options) {
    const baseUrl = publicBase(options.baseUrl);
    const fetcher = options.fetch ?? globalThis.fetch;
    if (typeof fetcher !== 'function')
        throw new CollegeApiError('input', 'A fetch implementation is required.');
    const timeoutMs = options.timeoutMs ?? 15_000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
        throw new CollegeApiError('input', 'timeoutMs must be a positive finite number.');
    async function request(method, template, schema, ids = {}, query, body) {
        const path = template.replace(/:([a-zA-Z][a-zA-Z0-9_]*)/g, (_, key) => requireId(ids[key], key));
        const url = new URL(`${baseUrl}${path}`);
        for (const [key, value] of Object.entries(query ?? {})) {
            if (value === undefined || value === null || value === '')
                continue;
            if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)))
                throw new CollegeApiError('input', `Invalid query value for ${key}.`);
            url.searchParams.set(key, String(value));
        }
        const controller = new AbortController();
        let timer;
        let onAbort;
        const operation = async () => {
            let response;
            try {
                response = await fetcher(url.href, {
                    method, signal: controller.signal, headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
                    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
                });
            }
            catch (cause) {
                if (cause instanceof CollegeApiError)
                    throw cause;
                throw new CollegeApiError('network', 'Could not reach the college API.', { path, cause });
            }
            let payload;
            try {
                payload = await response.json();
            }
            catch (cause) {
                if (!response.ok)
                    throw new CollegeApiError('http', `College API returned HTTP ${response.status}.`, { path, status: response.status, cause });
                throw new CollegeApiError('json', 'College API did not return valid JSON.', { path, status: response.status, cause });
            }
            if (!response.ok)
                throw new CollegeApiError('http', getApiResponseMessage(payload) ?? `College API returned HTTP ${response.status}.`, { path, status: response.status, response: payload });
            validate(payload, schema, path);
            // Mutation routes have no data key. Require explicit success to distinguish malformed bodies.
            if (method !== 'GET' && Object.keys(schema).length === 0 && payload.access !== true)
                throw invalidApiResponse('The mutation response is missing its success flag.', payload, path);
            return payload;
        };
        const deadline = new Promise((_, reject) => {
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
            if (options.signal?.aborted)
                onAbort();
        });
        try {
            if (options.signal?.aborted)
                return await deadline;
            // No automatic retries: a write may have succeeded even when its response was lost.
            return await Promise.race([operation(), deadline]);
        }
        finally {
            clearTimeout(timer);
            if (onAbort)
                options.signal?.removeEventListener('abort', onAbort);
        }
    }
    const get = (path, schema, ids, query) => request('GET', path, schema, ids, query);
    const post = (path, ids, body) => request('POST', path, {}, ids, undefined, body);
    const patch = (path, ids, body, schema = {}) => request('PATCH', path, schema, ids, undefined, body);
    return {
        baseUrl,
        assetBaseUrl: options.assetBaseUrl,
        institutes: {
            byHost: async (host) => {
                if (typeof host !== 'string' || !host.trim())
                    throw new CollegeApiError('input', 'A host or subdomain is required.');
                return get('/ins/sub/domain/by/host', { all_domain: 'nullable-object' }, {}, { filter_by: host.trim() });
            },
            dashboard: (id) => get('/ins/:id/dash', { institute: 'object' }, { id }),
            announcements: (id, query) => get('/ins/:id/announcemnt/query', { announcement: 'array' }, { id }, query),
            announcement: (aid) => get('/ins/one/announcement/:aid', { announcement: 'object' }, { aid }),
            departments: (id, query) => get('/ins/:id/department', { institute: 'object' }, { id }, query),
            staff: (id, query) => get('/staff/:id/approve-staff/detail/list', { staffIns: 'array' }, { id }, query),
            staffDetail: (sid) => get('/staff/detail/custom/site/:sid/query', { staff_detail: 'object' }, { sid }),
            batches: (id, query) => get('/ins/:id/all/universal/batch/query', { all_batch: 'array' }, { id }, query),
            mergedDepartments: (id, query) => get('/ins/:id/all/merged/department', { all_depart: 'array' }, { id }, query),
        },
        landing: {
            profile: (id) => get('/landing/:id/one/web/profile', { one_ins: 'object' }, { id }),
            faculty: (did, query) => get('/landing/:did/all/faculty/query', { all_staff: 'array' }, { did }, query),
            pinnedDepartments: (id, query) => get('/landing/:id/all/pinned/department/query', { ins: 'object-or-array' }, { id }, query),
            pinnedDepartment: (id, query) => get('/landing/:id/one/pinned/department/query', { ins: 'object-or-array' }, { id }, query),
            examinations: (lcid) => get('/landing/:lcid/all/examination/object/query', { landing: 'object' }, { lcid }),
        },
        admissions: {
            ongoing: (id) => get('/admission/:id/all/ongoing/application/grouped', { ads_obj: 'object' }, { id }),
            application: (aid) => get('/admission/:aid/application/query', { oneApply: 'object' }, { aid }),
            dashboard: (aid, query) => get('/admission/:aid/dashboard/query', { admission: 'object', roles: 'present' }, { aid }, query),
            scholarships: (aid, query) => get('/admission/:aid/all/scholarship', { all_scholar: 'array' }, { aid }, query),
            documents: (aid, query) => get('/admission/:aid/all/document/array', { all_docs: 'array', count: 'number' }, { aid }, query),
            inquire: (aid, body) => post('/landing/:aid/new/inquiry/query', { aid }, body),
        },
        finance: {
            structures: (did, query) => get('/finance/depart/:did/all/fee/structure', { all_structures: 'array' }, { did }, query),
            structure: (fsid) => get('/finance/one/:fsid/structure', { structure: 'object' }, { fsid }),
        },
        library: {
            books: (lid, query) => get('/library/site/books/:lid', { books: 'array' }, { lid }, query),
            /** The backend returns [] for an empty search; it does not list the complete catalogue. */
            opac: (lid, query) => get('/library/site/opac/book/:lid/list/query', { books: 'array' }, { lid }, query),
        },
        staff: { generateCv: (sid) => patch('/edit/staff/generate/cv/:sid/query', { sid }, undefined, { excel_key: 'string' }) },
        alumni: {
            dashboard: (aid) => get('/alumini/:aid/dashboard/query', { one_alumini: 'object' }, { aid }),
            prominent: (aid, query) => get('/alumini/:aid/all/prominent/array', { all_prominent: 'array' }, { aid }, query),
            feedback: (aid, query) => get('/alumini/:aid/all/feed/question/array', { all_feedback_poll: 'array' }, { aid }, query),
            register: (aid, body) => post('/alumini/:aid/new/register', { aid }, body),
        },
        events: {
            list: (eid, query) => get('/event/process/manager/:eid/all/events', { all_events: 'array', count: 'number' }, { eid }, query),
            one: (evid) => get('/event/process/one/event/:evid', { one_event: 'object' }, { evid }),
            posts: (id, query) => get('/event/dashboard/:id/all/ins/posts', { post: 'array', postCount: 'number', totalPage: 'number' }, { id }, query),
            side: (eid, query) => get('/event/dashboard/:eid/all/side/event', { all_side: 'array' }, { eid }, query),
            inquire: (id, body) => post('/event/dashboard/:id/new/event/inquiry/queue', { id }, body),
            subscribe: (id, body) => patch('/event/dashboard/:id/subscribe/newsletter', { id }, body),
        },
        site: {
            admission: (aid) => get('/site/info/admission/:aid', { admission_site: 'object' }, { aid }),
            department: (did) => get('/site/info/department/:did', { department_site: 'object' }, { did }),
            library: (lid) => get('/site/info/library/:lid', { library_site: 'object' }, { lid }),
            opener: (id) => get('/site/institute/:id/opener', { institute: 'nullable-object' }, { id }),
            batches: (did, query) => get('/site/:did/all/universal/batch/query', { all_batch: 'array' }, { did }, query),
            mous: (did, query) => get('/site/:did/all/mou/collab/query', { all_mou: 'array' }, { did }, query),
            activity: (acid) => get('/site/:acid/one/activity/query', { act: 'object' }, { acid }),
            activities: (query) => get('/site/all/activity/query', { all_act: 'array' }, {}, query),
            activitiesByType: (query) => get('/site/all/activity/query/type', { all_act: 'array' }, {}, query),
            projects: (query) => get('/site/all/projects/query', { all_act: 'array' }, {}, query),
            dynamicTabs: (lcid) => get('/site/dynamic/:lcid/list/query', { dynamic_tab: 'array' }, { lcid }),
            dynamicChildren: (sdid, query) => get('/site/dynamic/nested/:sdid/list/query', { data_list: 'array' }, { sdid }, query),
            moduleTabs: (lcid, query) => get('/site/module/dynamic/:lcid/list/query', { dynamic_tab: 'array' }, { lcid }, query),
            moduleChildren: (mdi, query) => get('/site/module/dynamic/nested/:mdi/list/query', { data_list: 'array' }, { mdi }, query),
            studentCorner: (lcid) => get('/site/student/corner/:lcid/list/query', { student_corner: 'array' }, { lcid }),
            governingCategories: (lcid, query) => get('/site/governing/:lcid/category/query', { category_list: 'array' }, { lcid }, query),
            governingBody: (lcid, cid, query) => get('/site/governing/:lcid/category/:cid/body/query', { category_body_list: 'array' }, { lcid, cid }, query),
            societyCategories: (lcid, query) => get('/site/society/governing/:lcid/category/query', { category_list: 'array' }, { lcid }, query),
            societyBody: (lcid, cid, query) => get('/site/society/governing/:lcid/category/:cid/body/query', { category_body_list: 'array' }, { lcid, cid }, query),
            homeAbout: (id, query) => get('/site/home/about/list/:id/query', { home_about_list: 'array' }, { id }, query),
            principalMessages: (id, query) => get('/site/home/principal/message/list/:id/query', { home_principal_message_list: 'array' }, { id }, query),
            otherModel: (id, query) => get('/site/other/model/:id/query', { other_data: 'present' }, { id }, query),
            otherCategories: (id, query) => get('/site/category/other/:id/detail/query', { activity_category: 'array' }, { id }, query),
            otherActivities: (cid) => get('/site/other/activity/:cid/detail/query', { data_list: 'array' }, { cid }),
            publishCounts: (id, query) => get('/site/author/publish/:id/detail/count', { detail: 'object' }, { id }, query),
            incrementPublishCounts: (id, body) => patch('/site/author/publish/:id/update/count', { id }, body),
        },
        committees: {
            dashboard: (qid) => get('/committee/:qid/dashboard', { iqac: 'object' }, { qid }),
            custom: (qcid) => get('/committee/:qcid/custom/dashboard', { custom: 'object' }, { qcid }),
            compositions: (qcid, query) => get('/committee/:qcid/all/composition/query', { all_com: 'array' }, { qcid }, query),
            sections: (hid, query) => get('/committee/:hid/all/sections/query', { all: 'array' }, { hid }, query),
            about: (qcid, query) => get('/committee/:qcid/all/about/query', { all_com: 'array' }, { qcid }, query),
            auditReports: (qcid, query) => get('/committee/:qcid/all/audit/reports/query', { all_com: 'array' }, { qcid }, query),
            naac: (qcid) => get('/committee/:qcid/all/naac/master/query', { custom: 'object' }, { qcid }),
            activities: (cid, query) => get('/committee/custom/authority/activity/:cid/list/query', { activity: 'array' }, { cid }, query),
            iqacDetails: (iqdid) => get('/committee/new/iqac/detail/:iqdid/all/things', { q_detail: 'object' }, { iqdid }),
            irins: (cid) => get('/committee/rnd/irins/list/:cid/query', { irins_list: 'array' }, { cid }),
        },
        gallery: {
            imageCategories: (id, query) => get('/committee/image/gallery/institute/:id/category/list', { gallery_category: 'array' }, { id }, query),
            images: (cid, query) => get('/committee/image/gallery/:cid/category/images/list', { image_list: 'array' }, { cid }, query),
            videoCategories: (id, query) => get('/committee/video/gallery/institute/:id/category/list', { gallery_category: 'array' }, { id }, query),
            videos: (cid, query) => get('/committee/video/gallery/:cid/category/videos/list', { video_list: 'array' }, { cid }, query),
        },
    };
}
//# sourceMappingURL=client.js.map