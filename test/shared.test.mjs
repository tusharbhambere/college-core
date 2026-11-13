import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CollegeApiError, cleanText, collegeBrand, contentText, createCollegeClient, createDedupedFetch, errorMessage,
  faviconScript, fileBadge, fileDisplayName, fileKind, isPreviewHost, isRecent, isUnpublishedPage,
  loadCollegePage, presentableItems, resolveCollegeHost, resolveLegacyRoute, safePrimaryColor,
  accentForegroundColor, resolveBrandPrimary, splitStatement, tenantFromResponses,
} from '../dist/index.js';

const id = (n) => n.toString(16).padStart(24, '0');
const institute = id(1), landing = id(2), category = id(3), eventManager = id(4);

function tenant(profile = {}) {
  return tenantFromResponses('college.example', { link_up: { _id: institute } },
    { eventManagerDepart: [eventManager] }, { _id: institute, landing_control: { _id: landing, ...profile } });
}

function mockClient(routes) {
  const calls = [];
  const client = createCollegeClient({
    baseUrl: 'https://api.example', assetBaseUrl: 'https://cdn.example',
    fetch: async (raw, init) => {
      const url = new URL(raw);
      const path = url.pathname.replace('/api/v3/public', '');
      calls.push({ path, query: Object.fromEntries(url.searchParams), method: init.method });
      const body = routes[path];
      if (!body) return new Response(JSON.stringify({ access: false, message: `No route ${path}` }), { status: 404 });
      return new Response(JSON.stringify({ access: true, ...(typeof body === 'function' ? body(url) : body) }));
    },
  });
  return { client, calls };
}

test('text helpers drop CMS placeholders and keep real content', () => {
  assert.equal(cleanText('<p>Require information</p>'), '');
  assert.equal(cleanText('<b>Welcome</b>'), 'Welcome');
  assert.equal(contentText('6ae982023d7621efc08a533a'), '');
  assert.deepEqual(splitStatement('• Quality\n• Access · Equity'), ['Quality', 'Access', 'Equity']);
  const items = presentableItems([
    { id: 'a', title: 'Information', description: 'N/A' },
    { id: 'b', title: 'Office', description: '', meta: ['office@example.edu'] },
  ]);
  assert.deepEqual(items.map((i) => i.id), ['b']);
});

test('file helpers and freshness', () => {
  assert.equal(fileKind('https://cdn.example/a/report.PDF'), 'pdf');
  assert.equal(fileBadge('https://cdn.example/photo.jpeg'), 'JPG');
  assert.equal(fileDisplayName(undefined, 'https://cdn.example/1792646577581_Annual_Report_2026.pdf'), 'Annual Report 2026');
  assert.equal(fileDisplayName('image001 (2)', 'https://cdn.example/x', 'Notice'), 'Notice');
  const now = Date.parse('2026-11-13T00:00:00Z');
  assert.equal(isRecent('2026-11-10', 7, now), true);
  assert.equal(isRecent('2026-12-01', 7, now), false);
});

test('error messages and unpublished detection', () => {
  assert.equal(errorMessage(new CollegeApiError('timeout', 'x')), 'The college server took too long to respond. Please try again.');
  assert.equal(errorMessage(new CollegeApiError('http', 'x', { status: 500 })), 'The college server is temporarily unavailable. Please try again later.');
  const empty = new CollegeApiError('api', 'No Document Available', { response: { access: false, message: 'No Document Available' } });
  assert.equal(isUnpublishedPage(empty, 'documents'), true);
  assert.equal(isUnpublishedPage(new CollegeApiError('network', 'down'), 'documents'), false);
});

test('collegeBrand derives identity and navigation from the profile switches', () => {
  const brand = collegeBrand(tenant({
    home_header_object: { ins_name: 'Example College, Arts & Science', ins_logo: 'logo.png', ins_email: 'Require information' },
    tab_toggle: { library: false },
    academic_courses_desk: [{ _id: id(9), head_name: 'Engineering', sub_head: [{ _id: id(10), sub_head_title_main: 'B.E.' }] }],
  }), { assetBaseUrl: 'https://cdn.example', explorePath: '/college' });
  assert.equal(brand.shortName, 'Example College');
  assert.equal(brand.nameRest, 'Arts & Science');
  assert.equal(brand.email, '');
  assert.equal(brand.logo, 'https://cdn.example/logo.png');
  const academics = brand.nav.find((item) => item.label === 'Academics');
  assert.ok(academics.children.some((c) => c.href === `/college?module=course&id=${id(9)}`));
  assert.ok(!academics.children.some((c) => c.label === 'Library'));
});

test('hosts: preview override only on preview domains; aliases apply to real domains', () => {
  assert.equal(resolveCollegeHost('localhost', { override: 'A.example' }), 'a.example');
  assert.equal(resolveCollegeHost('site.web.app', { override: 'a.example' }), 'a.example');
  assert.equal(resolveCollegeHost('real.example.', { override: 'a.example' }), 'real.example');
  assert.equal(resolveCollegeHost('old.example', { aliases: { 'old.example': 'new.example' } }), 'new.example');
  assert.equal(isPreviewHost('preview.netlify.app', ['.netlify.app']), true);
  const script = faviconScript({ hosts: ['a.example'], override: 'a.example' });
  assert.match(script, /"hosts":\["a\.example"\]/);
  assert.doesNotThrow(() => new Function(script));
});

test('legacy routes map old URLs to explore modules', () => {
  assert.equal(resolveLegacyRoute('/notices', `?nid=${id(5)}`), `/explore?nid=${id(5)}&id=${id(5)}&module=announcement`);
  assert.equal(resolveLegacyRoute('/admission', '?tab=admission-enquiry'), '/contact#enquiry');
  assert.equal(resolveLegacyRoute('/contact-us', '', { contactPath: '/reach-us' }), '/reach-us');
  assert.equal(resolveLegacyRoute('/unknown'), null);
  assert.match(resolveLegacyRoute('/naac/view-pdf', '?pdfKey=a.pdf', { explorePath: '/x' }), /^\/x\?module=viewer&file=a\.pdf$/);
});

test('theme colours keep contrast', () => {
  assert.equal(safePrimaryColor('#fff') !== '#ffffff', true);
  assert.equal(safePrimaryColor('nope'), null);
  assert.equal(accentForegroundColor('#d8b77b'), '#000000');
  assert.equal(resolveBrandPrimary('', '#245b83', true), '#245b83');
  assert.equal(resolveBrandPrimary('', '#245b83', false), null);
});

test('createDedupedFetch shares concurrent GETs but never mutations', async () => {
  let count = 0;
  const fetcher = createDedupedFetch(async () => { count++; return new Response('{}'); });
  await Promise.all([fetcher('https://a/x'), fetcher('https://a/x')]);
  assert.equal(count, 1);
  await fetcher('https://a/x');
  assert.equal(count, 2);
  await Promise.all([fetcher('https://a/x', { method: 'POST' }), fetcher('https://a/x', { method: 'POST' })]);
  assert.equal(count, 4);
});

test('loadCollegePage: Somani infrastructure, student zone and institute activities', async () => {
  const { client, calls } = mockClient({
    [`/site/other/model/${institute}/query`]: { other_data: {
      infrastructure: { gymkhana: { data_list: [{ _id: id(20), title: 'Gym', description: 'Open 7–9' }] } },
      student_zone: { alumni_association: { data_list: [{ _id: id(21), title: 'Alumni body' }] } },
      policies_and_procedures: [{ _id: id(22), title: 'Code of conduct', attach: 'conduct.pdf' }],
    } },
    [`/site/category/other/${institute}/detail/query`]: { activity_category: [
      { _id: category, name: 'Annual sports', activity_type: 'Sports' }, { _id: id(23), name: 'Diwali', activity_type: 'Celebrations' },
    ] },
    [`/site/other/activity/${category}/detail/query`]: { data_list: [{ _id: id(24), title: 'Results', attach: 'r.pdf' }] },
  });
  const t = tenant();
  const infra = await loadCollegePage(client, t, 'infrastructure');
  assert.deepEqual(infra.items.map((i) => i.title), ['Gymkhana']);
  assert.equal(infra.items[0].href, '/explore?module=infrastructure&view=gymkhana');
  assert.deepEqual((await loadCollegePage(client, t, 'infrastructure', { view: 'gymkhana' })).items.map((i) => i.title), ['Gym']);
  assert.equal(calls.find((c) => c.path.includes('/other/model/')).query.is_flow, 'Institute');
  assert.deepEqual((await loadCollegePage(client, t, 'student-zone', { view: 'alumni' })).items.map((i) => i.title), ['Alumni body']);
  const docs = await loadCollegePage(client, t, 'institute-documents');
  assert.equal(docs.items[0].children[0].files[0].url, 'https://cdn.example/conduct.pdf');
  const sports = await loadCollegePage(client, t, 'institute-activities', { view: 'sport' });
  assert.deepEqual(sports.items.map((i) => i.title), ['Annual sports']);
  assert.equal(sports.items[0].href, `/explore?module=institute-activities&id=${category}`);
  assert.equal((await loadCollegePage(client, t, 'institute-activities', { id: category })).items[0].title, 'Results');
});

test('loadCollegePage: flash notice, news, side events, home blocks', async () => {
  const { client, calls } = mockClient({
    [`/site/institute/${institute}/opener`]: { institute: { site_flash_notice: [{ _id: id(30), notice_title: 'Admissions open', notice_image: 'flash.jpg' }, { _id: id(31) }] } },
    [`/event/dashboard/${institute}/all/ins/posts`]: { post: [{ _id: id(32), title: 'Convocation' }], postCount: 11, totalPage: 2 },
    [`/event/dashboard/${eventManager}/all/side/event`]: { all_side: [{ _id: id(33), event_name: 'Fest' }] },
    [`/site/principal/message/list/${institute}/query`]: { home_principal_message_list: [] },
    [`/site/home/principal/message/list/${institute}/query`]: { home_principal_message_list: [{ _id: id(34), title: 'Principal', description: 'Welcome' }] },
  });
  const t = tenant();
  const flash = await loadCollegePage(client, t, 'flash-notice');
  assert.deepEqual(flash.items.map((i) => [i.title, i.image]), [['Admissions open', 'https://cdn.example/flash.jpg']]);
  const news = await loadCollegePage(client, t, 'news', { page: 1, limit: 10 });
  assert.equal(news.total, 11); assert.equal(news.hasMore, true);
  const side = await loadCollegePage(client, t, 'side-events');
  assert.equal(side.items[0].href, `/explore?module=event&id=${id(33)}`);
  const principal = await loadCollegePage(client, t, 'principal-messages');
  assert.equal(principal.items[0].description, 'Welcome');
  assert.equal(calls.at(-1).query.is_flow, 'Institute');
  assert.equal(calls.every((c) => c.method === 'GET'), true);
});

test('loadCollegePage honours a custom explore path', async () => {
  const { client } = mockClient({ [`/site/category/other/${institute}/detail/query`]: { activity_category: [{ _id: category, name: 'Sports day', activity_type: 'Sports' }] } });
  const page = await loadCollegePage(client, tenant(), 'institute-activities', {}, { explorePath: '/college/explore' });
  assert.equal(page.items[0].href, `/college/explore?module=institute-activities&id=${category}`);
});
