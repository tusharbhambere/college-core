import assert from 'node:assert/strict';
import test from 'node:test';
import { createCollegeClient } from '../dist/index.js';

const ID = '0123456789abcdef01234567';
const DOMAIN = 'https://api.college.example';
const PUBLIC = `${DOMAIN}/api/v3/public`;

function fixtureClient(payload = { access: true }) {
  const requests = [];
  const client = createCollegeClient({
    baseUrl: DOMAIN,
    fetch: async (url, options) => {
      requests.push({ url: String(url), options });
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });
  return { client, requests };
}

test('host lookup uses the public namespace and encodes the required host query', async () => {
  const { client, requests } = fixtureClient({ access: true, all_domain: null });
  await client.institutes.byHost('arts.example.edu');
  const url = new URL(requests[0].url);
  assert.equal(url.origin + url.pathname, `${PUBLIC}/ins/sub/domain/by/host`);
  assert.equal(url.searchParams.get('filter_by'), 'arts.example.edu');
  assert.equal(requests[0].options.method, 'GET');
});

test('configured API origins, API roots, and complete public roots resolve to the same routes', async () => {
  for (const baseUrl of [DOMAIN, `${DOMAIN}/api/`, `${PUBLIC}/`]) {
    let fetchedUrl;
    const client = createCollegeClient({ baseUrl, fetch: async (url) => {
      fetchedUrl = String(url);
      return new Response(JSON.stringify({ access: true, announcement: [] }));
    } });
    await client.institutes.announcements(ID);
    assert.equal(fetchedUrl, `${PUBLIC}/ins/${ID}/announcemnt/query`);
  }
});

test('real legacy spellings and paginated query names remain unchanged', async () => {
  const cases = [
    [(c) => c.institutes.announcements(ID), `/ins/${ID}/announcemnt/query`, 'announcement'],
    [(c) => c.alumni.prominent(ID, { page: 2, limit: 6 }), `/alumini/${ID}/all/prominent/array`, 'all_prominent'],
    [(c) => c.library.opac(ID, { page: 3, limit: 12, search: 'Science & Art', is_search_by: 'book_title' }), `/library/site/opac/book/${ID}/list/query`, 'books'],
    [(c) => c.finance.structures(ID, { page: 2, limit: 10, filter_by: 'tuition', batch_by: ID }), `/finance/depart/${ID}/all/fee/structure`, 'all_structures'],
    [(c) => c.events.posts(ID, { page: 1, limit: 4, p_type: 'notice' }), `/event/dashboard/${ID}/all/ins/posts`, 'post'],
  ];
  for (const [run, path, key] of cases) {
    const { client, requests } = fixtureClient({ access: true, [key]: [], postCount: 0, totalPage: 0 });
    await run(client);
    assert.equal(new URL(requests[0].url).pathname, `/api/v3/public${path}`);
  }
  const { client, requests } = fixtureClient({ access: true, books: [] });
  await client.library.opac(ID, { page: 3, limit: 12, search: 'Science & Art', is_search_by: 'book_title' });
  assert.deepEqual(Object.fromEntries(new URL(requests[0].url).searchParams), {
    page: '3', limit: '12', search: 'Science & Art', is_search_by: 'book_title',
  });
});

test('inquiry, alumni, event, newsletter, and CV methods preserve request contracts', async () => {
  const inquiry = {
    inquiry_application: ID,
    inquiry_student_name: 'A Student',
    inquiry_student_mobileNo: 9999999999,
    inquiry_student_email: 'student@example.edu',
    inquiry_student_message: 'Please send the application details.',
  };
  const alumni = {
    name: 'A Graduate', email: 'graduate@example.edu', phone_number: 9999999999,
    graduation_department: ID, pass_year: '2026', job_status: 'Employed',
    company_name: 'Example', company_location: 'Mumbai', higher_study: '',
  };
  const event = {
    name: 'A Visitor', mobile: 9999999999, email: 'visitor@example.edu',
    event_type: 'Seminar', query: 'Schedule?', designation: 'Researcher', event_inquiry_location: 'Mumbai',
  };
  const newsletter = { name: 'A Reader', email: 'reader@example.edu' };
  const cases = [
    [(c) => c.admissions.inquire(ID, inquiry), 'POST', `/landing/${ID}/new/inquiry/query`, inquiry],
    [(c) => c.alumni.register(ID, alumni), 'POST', `/alumini/${ID}/new/register`, alumni],
    [(c) => c.events.inquire(ID, event), 'POST', `/event/dashboard/${ID}/new/event/inquiry/queue`, event],
    [(c) => c.events.subscribe(ID, newsletter), 'PATCH', `/event/dashboard/${ID}/subscribe/newsletter`, newsletter],
    [(c) => c.staff.generateCv(ID), 'PATCH', `/edit/staff/generate/cv/${ID}/query`, undefined],
  ];
  for (const [run, method, path, body] of cases) {
    const { client, requests } = fixtureClient({ access: true, excel_key: 'generated/cv.pdf' });
    await run(client);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, `${PUBLIC}${path}`);
    assert.equal(requests[0].options.method, method);
    if (body !== undefined) {
      assert.deepEqual(JSON.parse(requests[0].options.body), body);
      assert.equal(new Headers(requests[0].options.headers).get('Content-Type'), 'application/json');
    }
  }
});

test('nested tabs and gallery filters retain server field names', async () => {
  const cases = [
    [(c) => c.site.moduleChildren(ID, { parent_key: 'Research & Development' }), `/site/module/dynamic/nested/${ID}/list/query`, 'data_list', { parent_key: 'Research & Development' }],
    [(c) => c.site.moduleTabs(ID, { is_flow: 'department', module_type: 'custom' }), `/site/module/dynamic/${ID}/list/query`, 'dynamic_tab', { is_flow: 'department', module_type: 'custom' }],
    [(c) => c.gallery.images(ID, { flow: 'batch', batchId: ID }), `/committee/image/gallery/${ID}/category/images/list`, 'image_list', { flow: 'batch', batchId: ID }],
    [(c) => c.site.mous(ID, { u_batch: ID, search: 'Industry', page: 2, limit: 6 }), `/site/${ID}/all/mou/collab/query`, 'all_mou', { u_batch: ID, search: 'Industry', page: '2', limit: '6' }],
    [(c) => c.committees.activities(ID, { page: 2, limit: 5 }), `/committee/custom/authority/activity/${ID}/list/query`, 'activity', { page: '2', limit: '5' }],
  ];
  for (const [run, path, key, query] of cases) {
    const { client, requests } = fixtureClient({ access: true, [key]: [] });
    await run(client);
    const url = new URL(requests[0].url);
    assert.equal(url.origin + url.pathname, `${PUBLIC}${path}`);
    assert.deepEqual(Object.fromEntries(url.searchParams), query);
  }
});

test('pinned department APIs preserve dependent type arrays and independent department arrays', async () => {
  const fixtures = [
    ['DEPENDENT', ['Arts', 'Commerce']],
    ['INDEPENDENT', [{ _id: ID, dName: 'Computer Science' }]],
  ];
  for (const [flow, ins] of fixtures) {
    const { client, requests } = fixtureClient({ access: true, ins });
    assert.deepEqual(await client.landing.pinnedDepartments(ID, { flow }), { access: true, ins });
    assert.equal(new URL(requests[0].url).searchParams.get('flow'), flow);
  }
  const ins = [{ _id: ID, dName: 'English' }];
  const { client, requests } = fixtureClient({ access: true, ins });
  assert.deepEqual(await client.landing.pinnedDepartment(ID, { type: 'Arts' }), { access: true, ins });
  assert.equal(new URL(requests[0].url).searchParams.get('type'), 'Arts');
});

test('author counters forward supplied fields once, including false values', async () => {
  const { client, requests } = fixtureClient();
  const body = { is_type: 'publication', download_count: false, view_count: true };
  await client.site.incrementPublishCounts(ID, body);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `${PUBLIC}/site/author/publish/${ID}/update/count`);
  assert.equal(requests[0].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(requests[0].options.body), body);
});
