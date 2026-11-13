import assert from 'node:assert/strict';
import test from 'node:test';
import { createCollegeClient, loadWebsite, loadWebsitePage, normalizeContent, tenantFromResponses } from '../dist/index.js';

const ids = Array.from({ length: 14 }, (_, index) => (index + 1).toString(16).padStart(24, '0'));
const [institute, admissionOne, admissionTwo, eventOne, eventTwo, landing, applicationOne,
  applicationTwo, closedApplication, departmentOne, departmentTwo, notice, eventIdOne, eventIdTwo] = ids;

function websiteClient({ failNotices = false, failAdmissionOne = false } = {}) {
  const calls = [];
  const client = createCollegeClient({
    baseUrl: 'https://api.college.example', assetBaseUrl: 'https://cdn.college.example/assets',
    fetch: async (rawUrl, options) => {
      const url = new URL(rawUrl);
      calls.push({ url, method: options.method });
      const path = url.pathname.replace('/api/v3/public', '');
      let body;
      if (path === '/ins/sub/domain/by/host') body = { all_domain: { link_up: { _id: institute } } };
      else if (path === `/ins/${institute}/dash`) body = { institute: {
        admissionDepart: [{ _id: admissionOne }, admissionTwo],
        eventManagerDepart: [{ _id: eventOne }, eventTwo],
      } };
      else if (path === `/landing/${institute}/one/web/profile`) body = { one_ins: {
        _id: institute, name: 'Example College', landing_control: {
          _id: landing,
          home_header_object: { ins_name: 'Example College of Arts', ins_logo: 'logo.png', ins_email: 'office@example.edu' },
          home_background_object: { images: ['campus.jpg'] },
        },
      } };
      else if (path === `/ins/${institute}/announcemnt/query`) {
        if (failNotices) throw new TypeError('Notices unavailable');
        body = { announcement: [{ _id: notice, insAnnTitle: 'Term begins', insAnnDescription: '<p>Welcome</p>' }] };
      } else if (path === `/landing/${institute}/all/pinned/department/query`) body = {
        ins: url.searchParams.get('flow') === 'DEPENDENT' ? ['Arts'] : [{ _id: departmentOne, dName: 'Computer Science' }],
      };
      else if (path === `/landing/${institute}/one/pinned/department/query`) body = { ins: [{ _id: departmentTwo, dName: 'English' }] };
      else if (path === `/admission/${admissionOne}/all/ongoing/application/grouped`) {
        if (failAdmissionOne) throw new TypeError('First admission office unavailable');
        body = { ads_obj: { ongoing: [{ group_name: 'Arts', apps: [
        { _id: applicationOne, applicationName: 'BA', visible_to_site: 'Open' },
        { _id: closedApplication, applicationName: 'Closed programme', visible_to_site: 'Closed' },
      ] }] } };
      }
      else if (path === `/admission/${admissionTwo}/all/ongoing/application/grouped`) body = { ads_obj: { ongoing: [{ group_name: 'Commerce', apps: [
        { _id: applicationTwo, applicationName: 'BCom', visible_to_site: 'Open', application_link: 'https://admissions.example.edu/bcom' },
      ] }] } };
      else if (path === `/event/process/manager/${eventOne}/all/events`) body = { all_events: [{ _id: eventIdOne, event_name: 'Arts festival' }], count: 1 };
      else if (path === `/event/process/manager/${eventTwo}/all/events`) body = { all_events: [{ _id: eventIdTwo, event_name: 'Commerce seminar' }], count: 1 };
      else if (path === `/site/student/corner/${landing}/list/query`) body = { student_corner: [] };
      else if (path === `/site/dynamic/${landing}/list/query`) body = { dynamic_tab: [] };
      else if (path === `/site/governing/${landing}/category/query`) body = { category_list: [] };
      else if (path === `/ins/${institute}/all/universal/batch/query`) body = { all_batch: [] };
      else throw new Error(`Unexpected API route: ${path}`);
      return new Response(JSON.stringify({ access: true, ...body }), { status: 200 });
    },
  });
  return { client, calls };
}

test('content normalization preserves real notice attachments and renders backend HTML as text', () => {
  const source = {
    _id: notice, insAnnTitle: 'Admissions notice', insAnnDescription: '<p>Apply &amp; enrol</p>',
    announcementDocument: [{ documentKey: 'notices/admission.pdf', documentName: 'Admission requirements', documentType: 'pdf' }],
  };
  const before = structuredClone(source);
  const [item] = normalizeContent(source, { assetBaseUrl: 'https://cdn.example.edu/assets' });
  assert.equal(item.title, 'Admissions notice');
  assert.equal(item.description, 'Apply & enrol');
  assert.deepEqual(item.files, [{ label: 'Admission requirements', url: 'https://cdn.example.edu/assets/notices/admission.pdf' }]);
  assert.deepEqual(source, before);
});

test('website snapshots preserve multi-manager dependencies and Open-only admission logic', async () => {
  const { client, calls } = websiteClient();
  const snapshot = await loadWebsite(client, 'COLLEGE.Example.edu');
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.host, 'college.example.edu');
  assert.equal(snapshot.brand.fullName, 'Example College of Arts');
  assert.equal(snapshot.brand.logo, 'https://cdn.college.example/assets/logo.png');
  assert.deepEqual(snapshot.brand.heroImages, ['https://cdn.college.example/assets/campus.jpg']);
  assert.deepEqual(snapshot.applications.map((app) => [app.id, app.admissionAdminId]), [
    [applicationOne, admissionOne], [applicationTwo, admissionTwo],
  ]);
  assert.equal(snapshot.applications[0].href, `https://qvipleweb.web.app/application-form/${applicationOne}`);
  assert.equal(snapshot.applications[1].href, 'https://admissions.example.edu/bcom');
  assert.deepEqual(snapshot.events.map((event) => event.id), [eventIdOne, eventIdTwo]);
  assert.deepEqual(snapshot.departments.map((department) => department.id), [departmentOne, departmentTwo]);
  assert.deepEqual(snapshot.departments[1].meta, ['Arts']);
  assert.deepEqual(snapshot.warnings, []);
  assert.equal(calls.every((call) => call.method === 'GET'), true);
});

test('one optional collection failure retains the college and other successful content', async () => {
  const { client } = websiteClient({ failNotices: true });
  const snapshot = await loadWebsite(client, 'college.example.edu');
  assert.equal(snapshot.brand.name, 'Example College');
  assert.deepEqual(snapshot.notices, []);
  assert.equal(snapshot.applications.length, 2);
  assert.equal(snapshot.events.length, 2);
  assert.equal(snapshot.warnings.length, 1);
  assert.match(snapshot.warnings[0], /^Notices:/);
});

test('one unavailable admission office preserves published applications from other offices', async () => {
  const { client } = websiteClient({ failAdmissionOne: true });
  const snapshot = await loadWebsite(client, 'college.example.edu');
  assert.deepEqual(snapshot.applications.map((app) => [app.id, app.admissionAdminId]), [[applicationTwo, admissionTwo]]);
  assert.equal(snapshot.events.length, 2);
  assert.ok(snapshot.warnings.some((warning) => /^Admissions\b/.test(warning)));
});

function pageFixture(read) {
  const requests = [];
  const tenant = tenantFromResponses('bhavanschowpatty.ac.in', { link_up: institute }, {
    iqac_module: [eventOne], library: [eventTwo],
  }, { landing_control: { _id: landing } });
  const client = createCollegeClient({
    baseUrl: 'https://api.college.example', assetBaseUrl: 'https://cdn.college.example/assets',
    fetch: async (rawUrl, options) => {
      const url = new URL(rawUrl);
      const path = url.pathname.replace('/api/v3/public', '');
      requests.push({ url, path, method: options.method });
      const body = await read(path, url.searchParams);
      return new Response(JSON.stringify({ access: true, ...body }), { status: 200 });
    },
  });
  return { client, tenant, requests };
}

test('dynamic and module drilldown preserve the root record ID while parent_key selects children', async () => {
  for (const module of ['dynamic', 'module']) {
    const rootId = departmentOne;
    const childId = departmentTwo;
    const listPath = module === 'dynamic'
      ? `/site/dynamic/${landing}/list/query`
      : `/site/module/dynamic/${landing}/list/query`;
    const nestedPath = module === 'dynamic'
      ? `/site/dynamic/nested/${rootId}/list/query`
      : `/site/module/dynamic/nested/${rootId}/list/query`;
    const { client, tenant, requests } = pageFixture((path, query) => {
      if (path === listPath) return { dynamic_tab: [{ _id: rootId, name: 'Student resources' }] };
      if (path === nestedPath) return query.get('parent_key') === childId
        ? { data_list: [{ _id: applicationOne, name: 'Academic calendar', attach: 'calendar.pdf' }] }
        : { data_list: [{ _id: childId, name: 'Academic year' }] };
      throw new Error(`Unexpected nested-resource route: ${path}`);
    });
    const roots = await loadWebsitePage(client, tenant, module);
    const rootLink = new URL(roots.items[0].href, 'https://college.example.edu');
    assert.equal(rootLink.searchParams.get('module'), module);
    assert.equal(rootLink.searchParams.get('id'), rootId);
    const children = await loadWebsitePage(client, tenant, module, { id: rootId });
    const childLink = new URL(children.items[0].href, 'https://college.example.edu');
    assert.equal(childLink.searchParams.get('module'), module);
    assert.equal(childLink.searchParams.get('id'), rootId);
    assert.equal(childLink.searchParams.get('parent_key'), childId);
    const detail = await loadWebsitePage(client, tenant, module, Object.fromEntries(childLink.searchParams));
    assert.equal(detail.items[0].title, 'Academic calendar');
    assert.equal(requests.at(-1).path, nestedPath);
    assert.equal(requests.at(-1).url.searchParams.get('parent_key'), childId);
  }
});

test('gallery media string payloads yield usable assets and preserve CATEGORY flow', async () => {
  const { client, tenant, requests } = pageFixture((path) => {
    if (path === `/committee/image/gallery/${departmentOne}/category/images/list`) return { image_list: ['gallery/campus.jpg'] };
    if (path === `/committee/video/gallery/${departmentOne}/category/videos/list`) return { video_list: ['https://www.youtube.com/watch?v=example'] };
    throw new Error(`Unexpected gallery route: ${path}`);
  });
  const photos = await loadWebsitePage(client, tenant, 'gallery', { id: departmentOne, bid: admissionOne });
  assert.equal(photos.items[0].image, 'https://cdn.college.example/assets/gallery/campus.jpg');
  assert.equal(requests.at(-1).url.searchParams.get('flow'), 'CATEGORY');
  assert.equal(requests.at(-1).url.searchParams.get('batchId'), admissionOne);
  const videos = await loadWebsitePage(client, tenant, 'videos', { id: departmentOne, bid: admissionOne });
  assert.equal(videos.items[0].href, 'https://www.youtube.com/watch?v=example');
  assert.equal(requests.at(-1).url.searchParams.get('flow'), 'CATEGORY');
});

test('faculty fetches the legacy bulk directory before local filtering and pagination', async () => {
  const directory = [
    ...Array.from({ length: 12 }, (_, index) => ({
      _id: String(index + 20).padStart(24, '0'), staffFirstName: 'Office',
      staffLastName: `Member ${index}`, teaching_type: 'Non-Teaching',
    })),
    { _id: departmentOne, staffFirstName: 'First', staffLastName: 'Lecturer', teaching_type: 'Teaching' },
    { _id: departmentTwo, staffFirstName: 'Second', staffLastName: 'Lecturer', teaching_type: 'Teaching' },
    { _id: applicationOne, staffFirstName: 'Third', staffLastName: 'Lecturer', teaching_type: 'Teaching' },
  ];
  const { client, tenant, requests } = pageFixture((path, query) => {
    assert.equal(path, `/staff/${institute}/approve-staff/detail/list`);
    const requestedPage = Number(query.get('page'));
    const requestedLimit = Number(query.get('limit'));
    const start = (requestedPage - 1) * requestedLimit;
    return { staffIns: directory.slice(start, start + requestedLimit) };
  });
  const faculty = await loadWebsitePage(client, tenant, 'faculty', { page: 1, limit: 2 });
  assert.deepEqual(faculty.items.map((item) => item.id), [departmentOne, departmentTwo]);
  assert.equal(faculty.total, 3);
  assert.equal(faculty.hasMore, true);
  const next = await loadWebsitePage(client, tenant, 'faculty', { page: 2, limit: 2 });
  assert.deepEqual(next.items.map((item) => item.id), [applicationOne]);
  assert.equal(next.total, 3);
  assert.equal(next.hasMore, false);
  for (const request of requests) {
    assert.equal(request.url.searchParams.get('page'), '1');
    assert.equal(request.url.searchParams.get('limit'), '1000');
  }
});

test('modern RND uses its custom authority ID while IQAC and NAAC use IQAC detail IDs', async () => {
  const rndAuthority = admissionOne;
  const rndDetail = admissionTwo;
  const iqacAuthority = departmentOne;
  const iqacDetail = departmentTwo;
  const { client, tenant, requests } = pageFixture((path) => {
    if (path === `/committee/${eventOne}/dashboard`) return { iqac: { authority: [
      { _id: rndAuthority, custom_head_name: 'RND', iqac_detail: rndDetail },
      { _id: iqacAuthority, custom_head_name: 'IQAC', iqac_detail: iqacDetail },
    ] } };
    if (path === `/committee/${rndAuthority}/custom/dashboard`) return { custom: {
      custom_head_name: 'RND', about: [{ sub_head_title: 'Research charter', sub_head_body: 'Support faculty research.' }],
    } };
    if (path === `/committee/${rndAuthority}/all/composition/query`) return { all_com: [] };
    if (path === `/committee/${rndAuthority}/all/about/query`) return { all_com: [{ sub_head_title: 'Research charter', sub_head_body: 'Support faculty research.' }] };
    if (path === `/committee/new/iqac/detail/${iqacDetail}/all/things`) return { q_detail: {
      outer_tab_nested: [{ _id: applicationOne, title: 'IQAC policy' }],
      naac_outer_tab_nested: [{ _id: applicationTwo, title: 'NAAC reports' }],
    } };
    throw new Error(`Wrong quality-assurance dependency: ${path}`);
  });
  const modernTenant = { ...tenant, host: 'somanichowpatty.ac.in' };
  const research = await loadWebsitePage(client, modernTenant, 'rnd');
  assert.ok(JSON.stringify(research.items).includes('Research charter'));
  assert.ok(requests.some((request) => request.path === `/committee/${rndAuthority}/custom/dashboard`));
  const iqac = await loadWebsitePage(client, modernTenant, 'iqac');
  assert.equal(iqac.items[0].title, 'IQAC policy');
  const naac = await loadWebsitePage(client, modernTenant, 'naac');
  assert.equal(naac.items[0].title, 'NAAC reports');
  assert.equal(requests.filter((request) => request.path === `/committee/new/iqac/detail/${iqacDetail}/all/things`).length, 2);
  assert.equal(requests.some((request) => request.path.includes(`/detail/${rndDetail}/`)), false);
});

test('notice detail routes expose published document names and storage keys', async () => {
  const { client, tenant, requests } = pageFixture((path) => {
    assert.equal(path, `/ins/one/announcement/${notice}`);
    return { announcement: {
      _id: notice, insAnnTitle: 'Examination schedule',
      announcementDocument: [{ documentKey: 'exam/schedule.pdf', documentName: 'Semester examination timetable' }],
    } };
  });
  const detail = await loadWebsitePage(client, tenant, 'announcement', { id: notice });
  assert.equal(requests.length, 1);
  assert.deepEqual(detail.items[0].files, [{ label: 'Semester examination timetable', url: 'https://cdn.college.example/assets/exam/schedule.pdf' }]);
});

test('empty OPAC searches retain empty results and never switch to the all-books API', async () => {
  const { client, tenant, requests } = pageFixture((path) => {
    assert.equal(path, `/library/site/opac/book/${eventTwo}/list/query`);
    return { books: [] };
  });
  const catalogue = await loadWebsitePage(client, tenant, 'library', { search: '' });
  assert.deepEqual(catalogue.items, []);
  assert.equal(catalogue.hasMore, false);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'GET');
});

test('department pages keep actual vision and head-message aliases without changing API objects', async () => {
  const department = {
    dName: 'English', department_vission: '<p>Encourage thoughtful readers.</p>',
    department_hod_message: 'Welcome to the department.',
  };
  const original = structuredClone(department);
  const { tenant } = pageFixture(() => ({}));
  const client = {
    assetBaseUrl: 'https://cdn.college.example/assets',
    site: { department: async (id) => {
      assert.equal(id, departmentOne);
      return { department_site: department };
    } },
  };
  const detail = await loadWebsitePage(client, tenant, 'department', { id: departmentOne });
  assert.ok(detail.items.some((item) => item.title === 'Vision' && item.description === 'Encourage thoughtful readers.'));
  assert.ok(detail.items.some((item) => item.title === 'Head of department' && item.description === 'Welcome to the department.'));
  assert.deepEqual(department, original);
});
