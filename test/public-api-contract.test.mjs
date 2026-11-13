import assert from 'node:assert/strict';
import test from 'node:test';
import { CollegeApiError, createCollegeClient } from '../dist/index.js';

const ID = '0123456789abcdef01234567';
const SECOND_ID = 'abcdef0123456789abcdef01';
const BASE = 'https://api.college.example';

// Independent contract fixtures transcribed from PUBLIC_API.md and verified legacy adapters.
// Additional path/query/body cases live in endpoints.test.mjs.
const contracts = [
  ['institutes', 'dashboard', [ID], `/ins/${ID}/dash`, { institute: {} }],
  ['institutes', 'announcement', [ID], `/ins/one/announcement/${ID}`, { announcement: {} }],
  ['institutes', 'departments', [ID], `/ins/${ID}/department`, { institute: {} }],
  ['institutes', 'staff', [ID], `/staff/${ID}/approve-staff/detail/list`, { staffIns: [] }],
  ['institutes', 'staffDetail', [ID], `/staff/detail/custom/site/${ID}/query`, { staff_detail: {} }],
  ['institutes', 'batches', [ID], `/ins/${ID}/all/universal/batch/query`, { all_batch: [] }],
  ['institutes', 'mergedDepartments', [ID], `/ins/${ID}/all/merged/department`, { all_depart: [] }],
  ['landing', 'profile', [ID], `/landing/${ID}/one/web/profile`, { one_ins: {} }],
  ['landing', 'faculty', [ID], `/landing/${ID}/all/faculty/query`, { all_staff: [] }],
  ['landing', 'examinations', [ID], `/landing/${ID}/all/examination/object/query`, { landing: {} }],
  ['admissions', 'ongoing', [ID], `/admission/${ID}/all/ongoing/application/grouped`, { ads_obj: { ongoing: [] } }],
  ['admissions', 'application', [ID], `/admission/${ID}/application/query`, { oneApply: {} }],
  ['admissions', 'dashboard', [ID], `/admission/${ID}/dashboard/query`, { admission: {}, roles: [] }],
  ['admissions', 'scholarships', [ID], `/admission/${ID}/all/scholarship`, { all_scholar: [] }],
  ['admissions', 'documents', [ID], `/admission/${ID}/all/document/array`, { all_docs: [], count: 0 }],
  ['finance', 'structure', [ID], `/finance/one/${ID}/structure`, { structure: {} }],
  ['library', 'books', [ID], `/library/site/books/${ID}`, { books: [] }],
  ['alumni', 'dashboard', [ID], `/alumini/${ID}/dashboard/query`, { one_alumini: {} }],
  ['alumni', 'feedback', [ID], `/alumini/${ID}/all/feed/question/array`, { all_feedback_poll: [] }],
  ['events', 'list', [ID], `/event/process/manager/${ID}/all/events`, { all_events: [], count: 0 }],
  ['events', 'one', [ID], `/event/process/one/event/${ID}`, { one_event: {} }],
  ['events', 'side', [ID], `/event/dashboard/${ID}/all/side/event`, { all_side: [] }],
  ['site', 'admission', [ID], `/site/info/admission/${ID}`, { admission_site: {} }],
  ['site', 'department', [ID], `/site/info/department/${ID}`, { department_site: {} }],
  ['site', 'library', [ID], `/site/info/library/${ID}`, { library_site: {} }],
  ['site', 'opener', [ID], `/site/institute/${ID}/opener`, { institute: null }],
  ['site', 'batches', [ID], `/site/${ID}/all/universal/batch/query`, { all_batch: [] }],
  ['site', 'activity', [ID], `/site/${ID}/one/activity/query`, { act: {} }],
  ['site', 'activities', [], '/site/all/activity/query', { all_act: [] }],
  ['site', 'activitiesByType', [], '/site/all/activity/query/type', { all_act: [] }],
  ['site', 'projects', [], '/site/all/projects/query', { all_act: [] }],
  ['site', 'dynamicTabs', [ID], `/site/dynamic/${ID}/list/query`, { dynamic_tab: [] }],
  ['site', 'dynamicChildren', [ID], `/site/dynamic/nested/${ID}/list/query`, { data_list: [] }],
  ['site', 'studentCorner', [ID], `/site/student/corner/${ID}/list/query`, { student_corner: [] }],
  ['site', 'governingCategories', [ID], `/site/governing/${ID}/category/query`, { category_list: [] }],
  ['site', 'governingBody', [ID, SECOND_ID], `/site/governing/${ID}/category/${SECOND_ID}/body/query`, { category_body_list: [] }],
  ['site', 'societyCategories', [ID], `/site/society/governing/${ID}/category/query`, { category_list: [] }],
  ['site', 'societyBody', [ID, SECOND_ID], `/site/society/governing/${ID}/category/${SECOND_ID}/body/query`, { category_body_list: [] }],
  ['site', 'homeAbout', [ID], `/site/home/about/list/${ID}/query`, { home_about_list: [] }],
  ['site', 'principalMessages', [ID], `/site/home/principal/message/list/${ID}/query`, { home_principal_message_list: [] }],
  ['site', 'otherModel', [ID], `/site/other/model/${ID}/query`, { other_data: {} }],
  ['site', 'otherCategories', [ID], `/site/category/other/${ID}/detail/query`, { activity_category: [] }],
  ['site', 'otherActivities', [ID], `/site/other/activity/${ID}/detail/query`, { data_list: [] }],
  ['site', 'publishCounts', [ID], `/site/author/publish/${ID}/detail/count`, { detail: { download_count: 0, view_count: 0 } }],
  ['committees', 'dashboard', [ID], `/committee/${ID}/dashboard`, { iqac: {} }],
  ['committees', 'custom', [ID], `/committee/${ID}/custom/dashboard`, { custom: {} }],
  ['committees', 'compositions', [ID], `/committee/${ID}/all/composition/query`, { all_com: [] }],
  ['committees', 'sections', [ID], `/committee/${ID}/all/sections/query`, { all: [] }],
  ['committees', 'about', [ID], `/committee/${ID}/all/about/query`, { all_com: [] }],
  ['committees', 'auditReports', [ID], `/committee/${ID}/all/audit/reports/query`, { all_com: [] }],
  ['committees', 'naac', [ID], `/committee/${ID}/all/naac/master/query`, { custom: {} }],
  ['committees', 'iqacDetails', [ID], `/committee/new/iqac/detail/${ID}/all/things`, { q_detail: {} }],
  ['committees', 'irins', [ID], `/committee/rnd/irins/list/${ID}/query`, { irins_list: [] }],
  ['gallery', 'imageCategories', [ID], `/committee/image/gallery/institute/${ID}/category/list`, { gallery_category: [] }],
  ['gallery', 'videoCategories', [ID], `/committee/video/gallery/institute/${ID}/category/list`, { gallery_category: [] }],
  ['gallery', 'videos', [ID], `/committee/video/gallery/${ID}/category/videos/list`, { video_list: [] }],
];

for (const [namespace, method, args, path, fields] of contracts) {
  test(`public API errors preserve backend messages: ${namespace}.${method}`, async () => {
    for (const [status, access, kind] of [[200, false, 'api'], [200, true, 'response'], [503, false, 'http']]) {
      const payload = { access, message: 'This information has not been updated yet.' };
      const client = createCollegeClient({ baseUrl: BASE, fetch: async () => new Response(JSON.stringify(payload), { status }) });
      await assert.rejects(client[namespace][method](...args), (error) => {
        assert.ok(error instanceof CollegeApiError);
        assert.equal(error.kind, kind);
        assert.equal(error.message, payload.message);
        assert.deepEqual(error.details.response, payload);
        return true;
      });
    }
  });
  test(`public API contract: ${namespace}.${method}`, async () => {
    let request;
    const payload = { access: true, ...fields };
    const client = createCollegeClient({ baseUrl: BASE, fetch: async (url, options) => {
      request = { url: String(url), options };
      return new Response(JSON.stringify(payload), { status: 200 });
    } });
    const result = await client[namespace][method](...args);
    assert.equal(request.url, `${BASE}/api/v3/public${path}`);
    assert.equal(request.options.method, 'GET');
    assert.deepEqual(result, payload);
  });
}
