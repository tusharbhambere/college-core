import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CollegeApiError, assetUrl, enabledModules, normalizePagination, paginate, plainText,
  resolveTenant, safeUrl, tenantFromResponses,
} from '../dist/index.js';

const ids = Array.from({ length: 9 }, (_, index) => String(index + 1).repeat(24));

test('tenant dependency IDs support backend-populated references and plain ObjectIds', () => {
  const domain = { link_up: { _id: ids[0], insName: 'College' } };
  const dashboard = {
    admissionDepart: [{ _id: ids[1] }, { _id: ids[8] }],
    financeDepart: [ids[2]], hostelDepart: [{ _id: ids[3] }],
    aluminiDepart: [ids[4]], library: [{ _id: ids[5] }],
    eventManagerDepart: [ids[6]], iqac_module: [{ _id: ids[7] }],
  };
  const profile = { landing_control: { _id: ids[8] } };
  const tenant = tenantFromResponses('  ARTS.Example.edu  ', domain, dashboard, profile);
  assert.equal(tenant.host, 'arts.example.edu');
  assert.deepEqual([
    tenant.instituteId, tenant.admissionAdminId, tenant.financeId, tenant.hostelId,
    tenant.alumniId, tenant.libraryId, tenant.eventManagerId, tenant.iqacId, tenant.landingControlId,
  ], ids);
  assert.deepEqual(tenant.admissionAdminIds, [ids[1], ids[8]]);
  assert.deepEqual(tenant.eventManagerIds, [ids[6]]);
  assert.equal(tenant.dashboard, dashboard);
  assert.equal(tenant.profile, profile);
  assert.equal(tenant.domain, domain);
});

test('tenant context leaves unavailable modules unset and rejects an unmapped institute', () => {
  const tenant = tenantFromResponses('college.example', { link_up: ids[0] }, {
    admissionDepart: [], library: [{ _id: 'invalid' }], eventManagerDepart: ['undefined'],
  }, {});
  assert.equal(tenant.instituteId, ids[0]);
  assert.equal(tenant.admissionAdminId, undefined);
  assert.equal(tenant.libraryId, undefined);
  assert.equal(tenant.eventManagerId, undefined);
  assert.equal(tenant.landingControlId, undefined);
  for (const mapping of [null, {}, { link_up: 'invalid' }, { link_up: { name: 'No ID' } }]) {
    assert.throws(() => tenantFromResponses('college.example', mapping, {}, {}), (error) => {
      assert.ok(error instanceof CollegeApiError);
      assert.equal(error.kind, 'tenant');
      return true;
    });
  }
});

test('tenant resolution unwraps response envelopes and maps host before fetching institute records', async () => {
  const calls = [];
  const domain = { link_up: { _id: ids[0] } };
  const dashboard = { admissionDepart: [{ _id: ids[1] }] };
  const profile = { landing_control: { _id: ids[8] } };
  const client = {
    institutes: {
      byHost: async (host) => {
        calls.push(['host', host]);
        return { access: true, all_domain: domain };
      },
      dashboard: async (id) => {
        calls.push(['dashboard', id]);
        return { institute: dashboard };
      },
    },
    landing: { profile: async (id) => {
      calls.push(['profile', id]);
      return { access: true, one_ins: profile };
    } },
  };
  const tenant = await resolveTenant(client, '  ARTS.Example.edu  ');
  assert.deepEqual(calls, [['host', 'arts.example.edu'], ['dashboard', ids[0]], ['profile', ids[0]]]);
  assert.equal(tenant.admissionAdminId, ids[1]);
  assert.equal(tenant.landingControlId, ids[8]);
  assert.equal(tenant.domain, domain);
  assert.equal(tenant.dashboard, dashboard);
  assert.equal(tenant.profile, profile);

  calls.length = 0;
  client.institutes.byHost = async (host) => {
    calls.push(['host', host]);
    return { access: true, all_domain: null };
  };
  await assert.rejects(resolveTenant(client, 'missing.example.edu'), (error) => {
    assert.ok(error instanceof CollegeApiError);
    assert.equal(error.kind, 'tenant');
    return true;
  });
  assert.deepEqual(calls, [['host', 'missing.example.edu']]);
});

test('safe links reject executable URLs, protocol-relative URLs, credentials, and hidden controls', () => {
  for (const value of [
    'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '//evil.example',
    'https://user:secret@example.edu', 'https://example.edu/\nscript',
    'https://example.edu/%0aheader', '\\evil.example',
  ]) assert.equal(safeUrl(value), undefined, value);
  assert.equal(safeUrl('/admissions'), '/admissions');
  assert.equal(safeUrl('https://example.edu/admissions'), 'https://example.edu/admissions');
  assert.equal(safeUrl('mailto:office@example.edu', { allowMailto: true }), 'mailto:office@example.edu');
  assert.equal(safeUrl('tel:+912212345678', { allowTel: true }), 'tel:+912212345678');
  assert.equal(safeUrl('mailto:office@example.edu'), undefined);
});

test('asset resolution keeps valid storage keys beneath a configured CDN prefix', () => {
  const base = 'https://cdn.example.edu/college-assets';
  assert.equal(assetUrl('notices/June report.pdf', base), 'https://cdn.example.edu/college-assets/notices/June%20report.pdf');
  assert.equal(assetUrl('/logo.png', base), 'https://cdn.example.edu/college-assets/logo.png');
  assert.equal(assetUrl('https://other.example.edu/logo.png', base), 'https://other.example.edu/logo.png');
  for (const key of ['../secret', '%2e%2e/secret', 'a/%2fsecret', 'javascript:alert(1)', '//evil.example/logo.png']) {
    assert.equal(assetUrl(key, base), undefined, key);
  }
});

test('HTML previews remove scripts and styles and decode common entities without a browser', () => {
  assert.equal(plainText('<style>.hidden{}</style><p>Arts &amp; Science &#x1F393;</p><script>alert(1)</script>'), 'Arts & Science 🎓');
  assert.equal(plainText(null), '');
  assert.equal(plainText(2026), '2026');
});

test('module switches support legacy profiles, current overrides, and shared IQAC submenus', () => {
  const modules = enabledModules({
    website_active_tab: { library: false, admission: false, alumini: false },
    landing_control: { tab_toggle: { admission: true, iqac: false, event: false } },
  });
  assert.equal(modules.library, false);
  assert.equal(modules.admission, true);
  assert.equal(modules.alumni, false);
  assert.equal(modules.events, false);
  assert.equal(modules.home, true);
  for (const key of ['naac', 'aqar', 'nirf', 'institutional', 'student_corner', 'special']) assert.equal(modules[key], false);
});

test('pagination applies API defaults and slices without mutating source content', () => {
  assert.deepEqual(normalizePagination('invalid', -1), { page: 1, limit: 10 });
  assert.deepEqual(normalizePagination('2', '3'), { page: 2, limit: 3 });
  const items = Object.freeze(['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(paginate(items, 2, 2), { page: 2, limit: 2, items: ['c', 'd'], total: 5, totalPages: 3 });
  assert.deepEqual(paginate(items, 4, 2).items, []);
});
